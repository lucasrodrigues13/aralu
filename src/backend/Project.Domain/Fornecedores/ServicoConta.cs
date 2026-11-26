namespace Project.Domain.Fornecedores;

public sealed class ServicoConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public bool Padrao { get; set; }
}
