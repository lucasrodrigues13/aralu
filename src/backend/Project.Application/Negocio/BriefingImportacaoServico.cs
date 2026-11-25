using Project.Application.Comum;
using Project.Domain.Modelos;

namespace Project.Application.Negocio;

public interface IPlanilhaBriefing
{
    byte[] Modelo();

    /// <summary>Lê a aba Briefing (ou a primeira aba) de um .xlsx ou .xls.</summary>
    Resultado<LeituraPlanilhaBriefing> Ler(Stream arquivo, string? nomeArquivo);
}

/// <summary>Sem erros, traz o modelo criado. Com erros, nada é gravado.</summary>
public sealed record ResultadoImportacaoBriefing(Guid? Id, int Secoes, int Perguntas, IReadOnlyList<string> Erros);

/// <summary>Importação de um modelo de briefing por planilha: tudo ou nada, com a lista de erros por linha.</summary>
public sealed class BriefingImportacaoServico(BriefingServico briefings, IPlanilhaBriefing planilha)
{
    public byte[] Modelo() => planilha.Modelo();

    public async Task<Resultado<ResultadoImportacaoBriefing>> ImportarAsync(
        string contaId, string? nome, Stream arquivo, string? nomeArquivo, CancellationToken ct)
    {
        var nomeModelo = Domain.Comum.Texto.Limpo(nome) ?? Domain.Comum.Texto.Limpo(Path.GetFileNameWithoutExtension(nomeArquivo ?? ""));
        if (nomeModelo is null)
        {
            return Resultado<ResultadoImportacaoBriefing>.Erro(Codigos.Validacao, "Informe o nome do modelo.");
        }

        var lido = planilha.Ler(arquivo, nomeArquivo);
        if (!lido.Ok)
        {
            return Resultado<ResultadoImportacaoBriefing>.Erro(lido.Falha!.Codigo, lido.Falha.Mensagem);
        }

        var leitura = lido.Valor!;
        if (leitura.Erros.Count > 0)
        {
            return Resultado<ResultadoImportacaoBriefing>.Sucesso(new(null, 0, 0, leitura.Erros));
        }

        var pedido = new SalvarBriefing(
            nomeModelo,
            "GestaoDeEventos",
            leitura.Secoes
                .Select(s => new SecaoBriefingPedido(s.Titulo, s.Descricao, s.Perguntas.Select(p => new PerguntaBriefingPedido(p, TipoPerguntaBriefing.TextoCurto)).ToList()))
                .ToList());
        var criado = await briefings.CriarAsync(contaId, pedido, ct);
        if (!criado.Ok)
        {
            return Resultado<ResultadoImportacaoBriefing>.Erro(criado.Falha!.Codigo, criado.Falha.Mensagem);
        }

        return Resultado<ResultadoImportacaoBriefing>.Sucesso(
            new(criado.Valor!.Id, leitura.Secoes.Count, leitura.Secoes.Sum(s => s.Perguntas.Count), []));
    }
}
