using Project.Domain.Comum;
namespace Project.Domain.Tarefas;

public sealed class ResponsavelTarefa : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid TarefaId { get; set; }

    public PapelResponsavel Papel { get; set; }

    public string? ReferenciaId { get; set; }

    public static ResponsavelTarefa Organizer(Guid tarefaId, Guid contaId) => new()
    {
        Id = Guid.NewGuid(),
        TarefaId = tarefaId,
        Papel = PapelResponsavel.Organizer,
        ReferenciaId = contaId.ToString(),
    };
}
