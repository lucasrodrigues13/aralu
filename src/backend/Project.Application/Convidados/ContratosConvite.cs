namespace Project.Application.Convidados;

/// <summary>Linha lida da planilha (SPEC-059). Mesa e custo não vêm mais da planilha.</summary>
public sealed record LinhaPlanilha(
    string? Convite,
    string? Ddi,
    string? Telefone,
    string? Observacao,
    string? Convidado,
    string? Principal,
    string? Genero,
    string? Faixa,
    string? Situacao,
    int Linha = 0);

public interface IPlanilhaConvites
{
    byte[] Modelo();

    Comum.Resultado<IReadOnlyList<LinhaPlanilha>> Ler(Stream arquivo, string? nomeArquivo);
}

public interface IGeradorQr
{
    byte[] Png(string texto);
}
