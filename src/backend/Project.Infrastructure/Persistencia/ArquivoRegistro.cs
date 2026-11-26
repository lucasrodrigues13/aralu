using Project.Domain.Comum;
namespace Project.Infrastructure.Persistencia;

public sealed class ArquivoRegistro : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string NomeOriginal { get; set; } = "";

    public string TipoConteudo { get; set; } = "";

    public long Tamanho { get; set; }

    public string CaminhoRelativo { get; set; } = "";
}
