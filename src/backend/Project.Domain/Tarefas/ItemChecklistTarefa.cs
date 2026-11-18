namespace Project.Domain.Tarefas;

public sealed class ItemChecklistTarefa
{
    public Guid Id { get; set; }

    public Guid TarefaId { get; set; }

    public string Texto { get; set; } = "";

    public bool Feito { get; set; }

    public int Ordem { get; set; }
}
