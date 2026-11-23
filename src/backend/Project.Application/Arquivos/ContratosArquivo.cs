namespace Project.Application.Arquivos;

public sealed record ArquivoGuardado(Guid Id, string NomeOriginal, string TipoConteudo);

public sealed record ArquivoAberto(string NomeOriginal, string TipoConteudo, Stream Conteudo) : IDisposable
{
    public void Dispose() => Conteudo.Dispose();
}

public interface IArmazenamentoArquivo
{
    Task<Comum.Resultado<ArquivoGuardado>> GuardarImagemAsync(
        Stream conteudo,
        string? nomeOriginal,
        string contaId,
        CancellationToken ct);

    /// <summary>Comprovante ou documento: JPG, JPEG, PNG ou PDF até 5 MB; imagens são reduzidas (SPEC-029 §6.6).</summary>
    Task<Comum.Resultado<ArquivoGuardado>> GuardarDocumentoAsync(
        Stream conteudo,
        string? nomeOriginal,
        string contaId,
        CancellationToken ct);

    /// <summary>Modelo de contrato em Word: somente .docx, até 10 MB.</summary>
    Task<Comum.Resultado<ArquivoGuardado>> GuardarWordAsync(
        Stream conteudo,
        string? nomeOriginal,
        string contaId,
        CancellationToken ct);

    Task<ArquivoAberto?> AbrirAsync(Guid id, string contaId, CancellationToken ct);

    Task DescartarAsync(Guid id, CancellationToken ct);
}
