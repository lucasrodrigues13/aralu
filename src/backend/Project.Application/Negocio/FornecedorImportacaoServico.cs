using Project.Application.Comum;
using Project.Domain.Fornecedores;

namespace Project.Application.Negocio;

public interface IPlanilhaFornecedores
{
    byte[] Modelo();

    /// <summary>Lê as abas Fornecedores e Dados bancários de um .xlsx, .xls ou .csv (só a primeira aba).</summary>
    Resultado<LeituraPlanilhaFornecedores> Ler(Stream arquivo, string? nomeArquivo);
}

/// <summary>Sem erros, Criados traz quantos entraram. Com erros, nada é gravado.</summary>
public sealed record ResultadoImportacaoFornecedores(int Criados, int ServicosCriados, IReadOnlyList<string> Erros);

/// <summary>Importação de fornecedores por planilha: tudo ou nada, com a lista de erros por linha.</summary>
public sealed class FornecedorImportacaoServico(FornecedorServico fornecedores, IPlanilhaFornecedores planilha)
{
    public byte[] Modelo() => planilha.Modelo();

    public async Task<Resultado<ResultadoImportacaoFornecedores>> ImportarAsync(
        Guid contaId, Stream arquivo, string? nomeArquivo, CancellationToken ct)
    {
        var lido = planilha.Ler(arquivo, nomeArquivo);
        if (!lido.Ok)
        {
            return Resultado<ResultadoImportacaoFornecedores>.Erro(lido.Falha!.Codigo, lido.Falha.Mensagem);
        }

        var leitura = lido.Valor!;
        var erros = leitura.Erros.ToList();
        if (leitura.Fornecedores.Count == 0 && erros.Count == 0)
        {
            erros.Add("A planilha não tem nenhum fornecedor preenchido.");
        }

        var existentes = (await fornecedores.ListarAsync(contaId, null, ct))
            .Select(f => PlanilhaFornecedores.Normalizar(f.Nome))
            .ToHashSet();
        foreach (var item in leitura.Fornecedores)
        {
            if (existentes.Contains(PlanilhaFornecedores.Normalizar(item.Nome)))
            {
                erros.Add($"Linha {item.Linha}: \"{item.Nome}\" já está cadastrado.");
                continue;
            }

            if (item.Servicos.Any(s => s.Length > 200))
            {
                erros.Add($"Linha {item.Linha}: o nome do serviço pode ter no máximo 200 caracteres.");
                continue;
            }

            var validado = await fornecedores.ValidarSemServicosAsync(contaId, Pedido(item, []), ct);
            if (!validado.Ok)
            {
                erros.Add($"Linha {item.Linha}: {validado.Falha!.Mensagem}");
            }
        }

        if (erros.Count > 0)
        {
            return Resultado<ResultadoImportacaoFornecedores>.Sucesso(new(0, 0, erros));
        }

        // Serviços que ainda não existem na conta são criados agora; a busca ignora maiúsculas e acentos.
        var catalogo = (await fornecedores.ListarServicosAsync(contaId, null, ct))
            .GroupBy(s => PlanilhaFornecedores.Normalizar(s.Nome))
            .ToDictionary(g => g.Key, g => g.First().Id);
        var faltando = leitura.Fornecedores
            .SelectMany(f => f.Servicos)
            .Where(nome => !catalogo.ContainsKey(PlanilhaFornecedores.Normalizar(nome)))
            .DistinctBy(PlanilhaFornecedores.Normalizar)
            .ToList();
        if (faltando.Count > 0)
        {
            var criados = await fornecedores.CriarServicosAsync(contaId, new NovosServicosConta(string.Join(", ", faltando)), ct);
            if (!criados.Ok)
            {
                return Resultado<ResultadoImportacaoFornecedores>.Erro(criados.Falha!.Codigo, criados.Falha.Mensagem);
            }

            foreach (var servico in criados.Valor!)
            {
                catalogo.TryAdd(PlanilhaFornecedores.Normalizar(servico.Nome), servico.Id);
            }
        }

        foreach (var item in leitura.Fornecedores)
        {
            var ids = item.Servicos.Select(nome => catalogo[PlanilhaFornecedores.Normalizar(nome)]).Distinct().ToList();
            var criado = await fornecedores.CriarAsync(contaId, Pedido(item, ids), ct);
            if (!criado.Ok)
            {
                return Resultado<ResultadoImportacaoFornecedores>.Erro(criado.Falha!.Codigo, $"Linha {item.Linha}: {criado.Falha.Mensagem}");
            }
        }

        return Resultado<ResultadoImportacaoFornecedores>.Sucesso(new(leitura.Fornecedores.Count, faltando.Count, []));
    }

    private static SalvarFornecedor Pedido(FornecedorPlanilha item, IReadOnlyList<Guid> servicos) => new(
        Nome: item.Nome,
        FotoId: null,
        RazaoSocial: item.RazaoSocial,
        Cnpj: item.Cnpj,
        Cpf: item.Cpf,
        NomeResponsavel: item.NomeResponsavel,
        PrecoDe: item.PrecoDe,
        PrecoAte: item.PrecoAte,
        Site: item.Site,
        Facebook: null,
        Instagram: item.Instagram,
        Youtube: null,
        Pinterest: null,
        Pais: item.Cep is null && item.Cidade is null ? null : "Brasil",
        Cep: item.Cep,
        Endereco: item.Endereco,
        Numero: item.Numero,
        Estado: item.Estado,
        Cidade: item.Cidade,
        Bairro: item.Bairro,
        Complemento: null,
        Banco: item.Banco,
        Agencia: item.Agencia,
        ContaBancaria: item.ContaBancaria,
        TitularConta: item.TitularConta,
        TipoConta: item.TipoConta,
        DocumentosBancarios: item.DocumentoTitular,
        PixTipo: item.PixTipo,
        PixChave: item.PixChave,
        Diferencial: null,
        DiferencialVisivelCliente: false,
        InformacoesGerais: null,
        Portfolio: null,
        ServicoContaIds: servicos,
        Telefones: item.Telefone is null ? [] : [new TelefoneFornecedorPedido(item.NomeResponsavel, item.Ddi ?? "55", item.Telefone, true)],
        Emails: item.Email is null ? [] : [new EmailFornecedorPedido(item.Email)],
        Orcamentos: []);
}
