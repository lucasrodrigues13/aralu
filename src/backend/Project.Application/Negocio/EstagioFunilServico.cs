using Project.Application.Comum;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

public sealed record EstagioFunilLeitura(Guid Id, string Nome, string Cor, int Ordem, string Tipo, int Quantidade);

/// <summary>Estágio aberto no modal: sem <c>Id</c> é um estágio novo.</summary>
public sealed record EstagioFunilPedido(Guid? Id, string? Nome, string? Cor);

/// <summary>Estágio aberto que sai: os leads dele vão para <c>DestinoId</c>.</summary>
public sealed record ExclusaoEstagioFunilPedido(Guid Id, Guid? DestinoId);

public sealed record SalvarEstagiosFunil(
    IReadOnlyList<EstagioFunilPedido>? Abertos,
    string? CorContratado,
    string? CorDescartado,
    IReadOnlyList<ExclusaoEstagioFunilPedido>? Exclusoes);

/// <summary>Gerenciar estágios do funil (SPEC-031 §6.1).</summary>
public sealed class EstagioFunilServico(IDados dados)
{
    public async Task<IReadOnlyList<EstagioFunilLeitura>> ListarAsync(Guid contaId, CancellationToken ct)
    {
        var estagios = EstagiosFunil.Ordenar(await dados.ListarEstagiosFunilAsync(contaId, ct));
        var contagens = await dados.ContarOportunidadesPorEstagioAsync(contaId, ct);
        return estagios.Select(e => Ler(e, contagens.FirstOrDefault(c => c.EstagioFunilId == e.Id)?.Quantidade ?? 0)).ToArray();
    }

    public async Task<Resultado<IReadOnlyList<EstagioFunilLeitura>>> SalvarAsync(
        Guid contaId,
        SalvarEstagiosFunil pedido,
        CancellationToken ct)
    {
        var atuais = await dados.ListarEstagiosFunilAsync(contaId, ct);
        var contratado = atuais.Single(e => e.Tipo == TipoEstagioFunil.Contratado);
        var descartado = atuais.Single(e => e.Tipo == TipoEstagioFunil.Descartado);
        var abertosAtuais = atuais.Where(e => e.Tipo == TipoEstagioFunil.Aberto).ToDictionary(e => e.Id);

        var abertos = pedido.Abertos ?? [];
        if (abertos.Count == 0)
        {
            return Falha("Mantenha ao menos um estágio aberto.");
        }

        if (abertos.Count > EstagiosFunil.MaximoAbertos)
        {
            return Falha($"No máximo {EstagiosFunil.MaximoAbertos} estágios além de Contratado e Descartado.");
        }

        var corContratado = pedido.CorContratado ?? contratado.Cor;
        var corDescartado = pedido.CorDescartado ?? descartado.Cor;
        if (!CoresEstagio.Valida(corContratado) || !CoresEstagio.Valida(corDescartado))
        {
            return Falha("Cor inválida.");
        }

        var nomes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { contratado.Nome, descartado.Nome };
        var mantidos = new HashSet<Guid>();
        var normalizados = new List<(Guid? Id, string Nome, string Cor)>();
        foreach (var item in abertos)
        {
            var nome = Domain.Comum.Texto.Limpo(item.Nome);
            if (nome is null)
            {
                return Falha("Informe o nome de cada estágio.");
            }

            if (nome.Length > EstagiosFunil.TamanhoMaximoNome)
            {
                return Falha($"O nome do estágio tem no máximo {EstagiosFunil.TamanhoMaximoNome} caracteres.");
            }

            if (!nomes.Add(nome))
            {
                return Falha($"Já existe um estágio chamado \"{nome}\".");
            }

            var cor = item.Cor ?? CoresEstagio.Padrao;
            if (!CoresEstagio.Valida(cor))
            {
                return Falha("Cor inválida.");
            }

            if (item.Id is Guid id)
            {
                if (!abertosAtuais.ContainsKey(id) || !mantidos.Add(id))
                {
                    return Falha("Estágio inválido.");
                }
            }

            normalizados.Add((item.Id, nome, cor));
        }

        var removidos = abertosAtuais.Values.Where(e => !mantidos.Contains(e.Id)).ToArray();
        var exclusoes = (pedido.Exclusoes ?? []).ToDictionary(e => e.Id, e => e.DestinoId);
        var destinosValidos = new HashSet<Guid>(mantidos) { contratado.Id };
        var mudancas = new List<(Oportunidade Item, EstagioFunil Destino)>();
        foreach (var removido in removidos)
        {
            var leads = await dados.ListarOportunidadesDoEstagioAsync(contaId, removido.Id, ct);
            if (leads.Count == 0)
            {
                continue;
            }

            if (!exclusoes.TryGetValue(removido.Id, out var destinoId) || destinoId is not Guid destino ||
                !destinosValidos.Contains(destino))
            {
                return Falha($"Escolha para onde vão os leads de \"{removido.Nome}\".");
            }

            var alvo = destino == contratado.Id ? contratado : abertosAtuais[destino];
            mudancas.AddRange(leads.Select(lead => (lead, alvo)));
        }

        var agora = DateTimeOffset.UtcNow;
        foreach (var (item, destino) in mudancas)
        {
            item.EstagioFunilId = destino.Id;
            item.EstagioFunil = destino;
            item.MotivoDescarte = null;
            item.EntradaNoEstagioEm = agora;
        }

        foreach (var removido in removidos)
        {
            dados.RemoverEstagioFunil(removido);
        }

        for (var ordem = 0; ordem < normalizados.Count; ordem++)
        {
            var (id, nome, cor) = normalizados[ordem];
            var estagio = id is Guid existente
                ? abertosAtuais[existente]
                : new EstagioFunil { Id = Guid.NewGuid(), ContaId = contaId, Tipo = TipoEstagioFunil.Aberto };
            estagio.Nome = nome;
            estagio.Cor = cor;
            estagio.Ordem = ordem;
            if (id is null)
            {
                dados.AdicionarEstagioFunil(estagio);
            }
        }

        contratado.Cor = corContratado;
        contratado.Ordem = normalizados.Count;
        descartado.Cor = corDescartado;
        descartado.Ordem = normalizados.Count + 1;

        await dados.SalvarNegocioAsync(ct);
        return Resultado<IReadOnlyList<EstagioFunilLeitura>>.Sucesso(await ListarAsync(contaId, ct));
    }

    internal static EstagioFunilLeitura Ler(EstagioFunil estagio, int quantidade) =>
        new(estagio.Id, estagio.Nome, estagio.Cor, estagio.Ordem, estagio.Tipo.ToString(), quantidade);

    private static Resultado<IReadOnlyList<EstagioFunilLeitura>> Falha(string mensagem) =>
        Resultado<IReadOnlyList<EstagioFunilLeitura>>.Erro(Codigos.Validacao, mensagem);
}
