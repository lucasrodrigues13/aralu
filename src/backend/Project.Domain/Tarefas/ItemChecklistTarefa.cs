namespace Project.Domain.Tarefas;

public sealed class ItemChecklistTarefa
{
    public Guid Id { get; set; }

    public Guid TarefaId { get; set; }

    public string Texto { get; set; } = "";

    public bool Feito { get; set; }

    /// <summary>Item descartado: continua na lista, riscado. Não conta como feito.</summary>
    public bool Cancelado { get; set; }

    public int Ordem { get; set; }
}
