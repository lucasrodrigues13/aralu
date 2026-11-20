using Project.Application.Comum;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

public sealed record TarefaFunilLeitura(
    Guid Id,
    Guid OportunidadeId,
    string OportunidadeNome,
    string Titulo,
    string? Observacao,
    string Tipo,
    string Responsavel,
    DateOnly Prazo,
    bool Completa,
    Guid? AnexoArquivoId,
    IReadOnlyList<ResponsavelLeitura>? Responsaveis = null,
    string? CriadoPor = null);

public sealed record SalvarTarefaFunil(
    string? Titulo,
    Guid? OportunidadeId,
    string? Tipo,
    string? Responsavel,
    DateOnly? Prazo,
    string? Observacao,
    Guid? AnexoArquivoId,
    IReadOnlyList<ResponsavelPedido>? Responsaveis = null);

public sealed record FiltroTarefaFunil(DateOnly? PrazoDe, DateOnly? PrazoAte, string? Tipo, string? Responsavel, bool? Completa);

public sealed class TarefaFunilServico(IDados dados)
{
    public async Task<IReadOnlyList<TarefaFunilLeitura>> ListarAsync(string contaId, FiltroTarefaFunil filtro, CancellationToken ct)
    {
        TipoTarefaFunil? tipo = null;
        if (!string.IsNullOrWhiteSpace(filtro.Tipo) &&
            Enum.TryParse<TipoTarefaFunil>(filtro.Tipo, true, out var lido) &&
            Enum.IsDefined(lido))
        {
            tipo = lido;
        }

        var itens = await dados.ListarTarefasFunilAsync(
            contaId,
            filtro.PrazoDe,
            filtro.PrazoAte,
            tipo,
            filtro.Responsavel,
            filtro.Completa,
            ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, itens.Select(i => i.OportunidadeId), ct);
        return itens.Select(item => Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, ""))).ToArray();
    }

    public async Task<Resultado<TarefaFunilLeitura>> CriarAsync(string contaId, SalvarTarefaFunil pedido, CancellationToken ct, string? criadoPor = null)
    {
        var montado = await MontarAsync(contaId, Guid.NewGuid(), pedido, ct);
        if (!montado.Ok)
        {
            return Resultado<TarefaFunilLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        montado.Valor!.Completa = false;
        montado.Valor.CriadoPor = criadoPor;
        await dados.InserirTarefaFunilAsync(montado.Valor, ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, [montado.Valor.OportunidadeId], ct);
        return Resultado<TarefaFunilLeitura>.Sucesso(Ler(montado.Valor, nomes.GetValueOrDefault(montado.Valor.OportunidadeId, "")));
    }

    public async Task<Resultado<TarefaFunilLeitura>> AtualizarAsync(
        string contaId,
        Guid id,
        SalvarTarefaFunil pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterTarefaFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<TarefaFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var montado = await MontarAsync(contaId, item.Id, pedido, ct);
        if (!montado.Ok)
        {
            return Resultado<TarefaFunilLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        item.Titulo = montado.Valor!.Titulo;
        item.OportunidadeId = montado.Valor.OportunidadeId;
        item.Tipo = montado.Valor.Tipo;
        item.Responsavel = montado.Valor.Responsavel;
        item.Prazo = montado.Valor.Prazo;
        item.Observacao = montado.Valor.Observacao;
        item.AnexoArquivoId = montado.Valor.AnexoArquivoId;
        await dados.SalvarNegocioAsync(ct);
        await dados.SubstituirResponsaveisTarefaFunilAsync(item.Id, montado.Valor.Responsaveis, ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        var leitura = Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, ""));
        return Resultado<TarefaFunilLeitura>.Sucesso(montado.Valor.Responsaveis.Count == 0
            ? leitura
            : leitura with { Responsaveis = montado.Valor.Responsaveis.Select(r => new ResponsavelLeitura(r.Papel, r.ReferenciaId)).ToArray() });
    }

    public async Task<Resultado<TarefaFunilLeitura>> ConcluirAsync(string contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterTarefaFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<TarefaFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        item.Completa = true;
        await dados.SalvarNegocioAsync(ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        return Resultado<TarefaFunilLeitura>.Sucesso(Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, "")));
    }

    public async Task<Resultado<TarefaFunilLeitura>> ReabrirAsync(string contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterTarefaFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<TarefaFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        item.Completa = false;
        await dados.SalvarNegocioAsync(ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        return Resultado<TarefaFunilLeitura>.Sucesso(Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, "")));
    }

    /// <param name="soCriadoPor">Quando informado (assistente), só exclui o que ele mesmo criou (SPEC-032 §18, passo 1).</param>
    public async Task<Resultado<bool>> ExcluirAsync(string contaId, Guid id, CancellationToken ct, string? soCriadoPor = null)
    {
        var item = await dados.ObterTarefaFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (soCriadoPor is not null && item.CriadoPor != soCriadoPor)
        {
            return Resultado<bool>.Erro(Codigos.Proibido, "Você só pode excluir o que criou.");
        }

        await dados.RemoverTarefaFunilAsync(item, ct);
        return Resultado<bool>.Sucesso(true);
    }

    private async Task<Resultado<TarefaFunil>> MontarAsync(string contaId, Guid id, SalvarTarefaFunil pedido, CancellationToken ct)
    {
        var titulo = Domain.Comum.Texto.Limpo(pedido.Titulo);
        if (titulo is null)
        {
            return Resultado<TarefaFunil>.Erro(Codigos.Validacao, "Informe o título.");
        }

        if (pedido.OportunidadeId is not Guid oportunidadeId ||
            await dados.ObterOportunidadeAsync(contaId, oportunidadeId, ct) is null)
        {
            return Resultado<TarefaFunil>.Erro(Codigos.Validacao, "Informe a oportunidade.");
        }

        if (!Enum.TryParse<TipoTarefaFunil>(pedido.Tipo, true, out var tipo) || !Enum.IsDefined(tipo))
        {
            return Resultado<TarefaFunil>.Erro(Codigos.Validacao, "Informe o tipo da tarefa.");
        }

        var responsaveis = new List<ResponsavelTarefaFunil>();
        string? responsavel;
        if (pedido.Responsaveis is { Count: > 0 })
        {
            // SPEC-031 §6.7: a dona e as assistentes ativas da conta (SPEC-032 §6.6).
            var ativas = (await dados.IdsAssistentesAtivasAsync(contaId, ct)).Select(a => a.ToString()).ToHashSet();
            foreach (var item in pedido.Responsaveis)
            {
                var chave = item.Papel == Domain.Tarefas.PapelResponsavel.Organizer ? contaId : item.ReferenciaId;
                if (item.Papel is not (Domain.Tarefas.PapelResponsavel.Organizer or Domain.Tarefas.PapelResponsavel.Assistente)
                    || chave is null
                    || (item.Papel == Domain.Tarefas.PapelResponsavel.Assistente && !ativas.Contains(chave)))
                {
                    return Resultado<TarefaFunil>.Erro(Codigos.Validacao, "Escolha a dona ou uma assistente ativa da conta.");
                }

                if (responsaveis.Any(r => r.ReferenciaId == chave))
                {
                    return Resultado<TarefaFunil>.Erro(Codigos.Validacao, "Responsável repetido.");
                }

                responsaveis.Add(new ResponsavelTarefaFunil { Id = Guid.NewGuid(), TarefaFunilId = id, Papel = item.Papel, ReferenciaId = chave });
            }

            responsavel = responsaveis[0].ReferenciaId;
        }
        else
        {
            responsavel = Domain.Comum.Texto.Limpo(pedido.Responsavel);
        }

        if (responsavel is null)
        {
            return Resultado<TarefaFunil>.Erro(Codigos.Validacao, "Informe o responsável.");
        }

        if (pedido.Prazo is not DateOnly prazo)
        {
            return Resultado<TarefaFunil>.Erro(Codigos.Validacao, "Informe o prazo.");
        }

        return Resultado<TarefaFunil>.Sucesso(new TarefaFunil
        {
            Id = id,
            ContaId = contaId,
            OportunidadeId = oportunidadeId,
            Titulo = titulo,
            Observacao = Domain.Comum.Texto.Limpo(pedido.Observacao),
            Tipo = tipo,
            Responsavel = responsavel,
            Responsaveis = responsaveis,
            Prazo = prazo,
            AnexoArquivoId = pedido.AnexoArquivoId,
        });
    }

    private static TarefaFunilLeitura Ler(TarefaFunil item, string oportunidadeNome) =>
        new(
            item.Id,
            item.OportunidadeId,
            oportunidadeNome,
            item.Titulo,
            item.Observacao,
            item.Tipo.ToString(),
            item.Responsavel,
            item.Prazo,
            item.Completa,
            item.AnexoArquivoId,
            item.Responsaveis.Count > 0
                ? item.Responsaveis.Select(r => new ResponsavelLeitura(r.Papel, r.ReferenciaId)).ToArray()
                : [new ResponsavelLeitura(Domain.Tarefas.PapelResponsavel.Organizer, item.Responsavel)],
            item.CriadoPor);
}
