namespace Project.Application.Convidados;

public sealed record LinhaPlanilha(
    string? Convite,
    string? Ddi,
    string? Telefone,
    string? Observacao,
    string? Convidado,
    string? Genero,
    string? Faixa,
    string? Custo,
    string? Situacao,
    string? Mesa,
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
