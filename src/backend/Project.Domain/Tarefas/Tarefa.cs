namespace Project.Domain.Tarefas;

public sealed class Tarefa
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public string ContaId { get; set; } = "";

    public string Titulo { get; set; } = "";

    public string? Descricao { get; set; }

    /// <summary>Copiado do modelo na criação/aplicação (SPEC-012 §8.2). Exibição na lista fica na SPEC-003.</summary>
    public string? Grupo { get; set; }

    public DateOnly? Prazo { get; set; }

    public SituacaoTarefa Situacao { get; set; } = SituacaoTarefa.Pendente;

    public string ResponsavelContaId { get; set; } = "";

    public VisibilidadeTarefa Visibilidade { get; set; } = VisibilidadeTarefa.SoEu;

    public PrioridadeTarefa Prioridade { get; set; } = PrioridadeTarefa.Media;

    public Guid? ServicoEventoId { get; set; }

    public List<ResponsavelTarefa> Responsaveis { get; set; } = [];

    public List<ItemChecklistTarefa> Checklist { get; set; } = [];

    public List<ComentarioTarefa> Comentarios { get; set; } = [];

    public List<AnexoTarefa> Anexos { get; set; } = [];
}
