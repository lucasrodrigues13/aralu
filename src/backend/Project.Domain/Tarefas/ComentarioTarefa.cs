using Project.Domain.Comum;
namespace Project.Domain.Tarefas;

public sealed class ComentarioTarefa : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid TarefaId { get; set; }

    public string AutorContaId { get; set; } = "";

    public string Texto { get; set; } = "";

    public DateTimeOffset CriadoEm { get; set; }
}
