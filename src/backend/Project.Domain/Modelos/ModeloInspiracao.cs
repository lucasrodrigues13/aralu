using Project.Domain.Comum;
namespace Project.Domain.Modelos;

public sealed class ModeloInspiracao : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public List<ItemInspiracao> Itens { get; set; } = [];
}

public sealed class ItemInspiracao : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid GaleriaId { get; set; }

    public Guid? ArquivoId { get; set; }

    public string? Url { get; set; }

    public int Ordem { get; set; }
}
