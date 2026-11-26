using Project.Domain.Comum;
namespace Project.Domain.Modelos;

public sealed class ModeloRoteiro : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public List<SecaoRoteiro> Secoes { get; set; } = [];
}

public sealed class SecaoRoteiro : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid ModeloId { get; set; }

    public string? Titulo { get; set; }

    public TimeOnly? Horario { get; set; }

    public string? Musica { get; set; }

    public int Ordem { get; set; }

    public List<ItemRoteiro> Itens { get; set; } = [];
}

public sealed class ItemRoteiro : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid SecaoId { get; set; }

    public string Texto { get; set; } = "";

    public int Ordem { get; set; }
}
