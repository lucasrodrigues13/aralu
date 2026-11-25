using Project.Application.Comum;
using Project.Domain.Modelos;

namespace Project.Application.Negocio;

public interface IPlanilhaRoteiro
{
    byte[] Modelo();

    /// <summary>Lê a aba Roteiro (ou a primeira aba) de um .xlsx ou .xls.</summary>
    Resultado<LeituraPlanilhaRoteiro> Ler(Stream arquivo, string? nomeArquivo);
}

/// <summary>Sem erros, traz o modelo criado. Com erros, nada é gravado.</summary>
public sealed record ResultadoImportacaoRoteiro(Guid? Id, int Momentos, int Itens, IReadOnlyList<string> Erros);

/// <summary>Importação de um modelo de roteiro por planilha: tudo ou nada, com a lista de erros por linha.</summary>
public sealed class RoteiroImportacaoServico(RoteiroServico roteiros, IPlanilhaRoteiro planilha)
{
    public byte[] Modelo() => planilha.Modelo();

    public async Task<Resultado<ResultadoImportacaoRoteiro>> ImportarAsync(
        string contaId, string? nome, Stream arquivo, string? nomeArquivo, CancellationToken ct)
    {
        var nomeModelo = Domain.Comum.Texto.Limpo(nome) ?? Domain.Comum.Texto.Limpo(Path.GetFileNameWithoutExtension(nomeArquivo ?? ""));
        if (nomeModelo is null)
        {
            return Resultado<ResultadoImportacaoRoteiro>.Erro(Codigos.Validacao, "Informe o nome do modelo.");
        }

        var lido = planilha.Ler(arquivo, nomeArquivo);
        if (!lido.Ok)
        {
            return Resultado<ResultadoImportacaoRoteiro>.Erro(lido.Falha!.Codigo, lido.Falha.Mensagem);
        }

        var leitura = lido.Valor!;
        if (leitura.Erros.Count > 0)
        {
            return Resultado<ResultadoImportacaoRoteiro>.Sucesso(new(null, 0, 0, leitura.Erros));
        }

        var pedido = new SalvarRoteiro(
            nomeModelo,
            leitura.Momentos
                .Select(m => new SecaoRoteiroPedido(m.Titulo, m.Horario, m.Musica, m.Itens.Select(i => new ItemRoteiroPedido(i)).ToList()))
                .ToList());
        var criado = await roteiros.CriarAsync(contaId, pedido, ct);
        if (!criado.Ok)
        {
            return Resultado<ResultadoImportacaoRoteiro>.Erro(criado.Falha!.Codigo, criado.Falha.Mensagem);
        }

        return Resultado<ResultadoImportacaoRoteiro>.Sucesso(
            new(criado.Valor!.Id, leitura.Momentos.Count, leitura.Momentos.Sum(m => m.Itens.Count), []));
    }
}
