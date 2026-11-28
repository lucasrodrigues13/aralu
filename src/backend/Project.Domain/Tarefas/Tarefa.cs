using Project.Domain.Comum;
namespace Project.Domain.Tarefas;

public sealed class Tarefa : ITemConta
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public Guid ContaId { get; set; }

    public string Titulo { get; set; } = "";

    public string? Descricao { get; set; }

    /// <summary>
    /// Data exata, ou o prazo efetivo de uma tarefa relativa (data do evento + <see cref="PrazoRelativo"/>), mantido
    /// junto com a data do evento para que listas, Hoje e Agenda leiam uma data só (SPEC-012 v3 §8.1).
    /// </summary>
    public DateOnly? Prazo { get; set; }

    /// <summary>Prazo relativo: dias em relação à data do evento (negativo = antes). Nulo = data exata ou sem prazo.</summary>
    public int? PrazoRelativo { get; set; }

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
