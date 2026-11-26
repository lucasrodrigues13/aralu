using Project.Domain.Comum;
namespace Project.Domain.Tarefas;

public sealed class ComentarioTarefa : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid TarefaId { get; set; }

    public string AutorContaId { get; set; } = "";

    /// <summary>Quem escreveu (SPEC-062): o membro do pedido. Nulo em comentários antigos ou do Admin.</summary>
    public Guid? AutorMembroId { get; set; }

    public string Texto { get; set; } = "";

    public DateTimeOffset CriadoEm { get; set; }
}
