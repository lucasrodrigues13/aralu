using Project.Application.Comum;
using Project.Domain.Modelos;

namespace Project.Application.Negocio;

public interface IPlanilhaCronograma
{
    byte[] Modelo();

    /// <summary>Lê a aba Cronograma (ou a primeira aba) de um .xlsx ou .xls.</summary>
    Resultado<LeituraPlanilhaCronograma> Ler(Stream arquivo, string? nomeArquivo);
}

/// <summary>Sem erros, traz o modelo criado. Com erros, nada é gravado.</summary>
public sealed record ResultadoImportacaoCronograma(Guid? Id, int Itens, IReadOnlyList<string> Erros);

/// <summary>Importação de um modelo de cronograma por planilha: tudo ou nada, com a lista de erros por linha.</summary>
public sealed class CronogramaImportacaoServico(CronogramaServico cronogramas, IPlanilhaCronograma planilha)
{
    public byte[] Modelo() => planilha.Modelo();

    public async Task<Resultado<ResultadoImportacaoCronograma>> ImportarAsync(
        Guid contaId, string? nome, Stream arquivo, string? nomeArquivo, CancellationToken ct)
    {
        var nomeModelo = Domain.Comum.Texto.Limpo(nome) ?? Domain.Comum.Texto.Limpo(Path.GetFileNameWithoutExtension(nomeArquivo ?? ""));
        if (nomeModelo is null)
        {
            return Resultado<ResultadoImportacaoCronograma>.Erro(Codigos.Validacao, "Informe o título do modelo.");
        }

        var lido = planilha.Ler(arquivo, nomeArquivo);
        if (!lido.Ok)
        {
            return Resultado<ResultadoImportacaoCronograma>.Erro(lido.Falha!.Codigo, lido.Falha.Mensagem);
        }

        var leitura = lido.Valor!;
        if (leitura.Erros.Count > 0)
        {
            return Resultado<ResultadoImportacaoCronograma>.Sucesso(new(null, 0, leitura.Erros));
        }

        var pedido = new SalvarCronograma(
            nomeModelo,
            null,
            leitura.Itens.Select(i => new ItemCronogramaPedido(i.Rotulo, i.Descricao, i.Data, i.Hora, i.Responsavel, i.RecadoFornecedores)).ToList());
        var criado = await cronogramas.CriarAsync(contaId, pedido, ct);
        if (!criado.Ok)
        {
            return Resultado<ResultadoImportacaoCronograma>.Erro(criado.Falha!.Codigo, criado.Falha.Mensagem);
        }

        return Resultado<ResultadoImportacaoCronograma>.Sucesso(
            new(criado.Valor!.Id, leitura.Itens.Count, []));
    }
}
