namespace Project.Domain.Equipe;

public enum SituacaoAssistente
{
    Convidada,
    Ativa,
    Removida,
}

/// <summary>Assistente da conta (SPEC-032). O login fica no Identity (<see cref="UsuarioId"/>).</summary>
public sealed class Assistente
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public string UsuarioId { get; set; } = "";

    public string Nome { get; set; } = "";

    public string Email { get; set; } = "";

    public string? Celular { get; set; }

    public DateOnly? Nascimento { get; set; }

    public bool PodeVerFinanceiro { get; set; }

    /// <summary>Verdadeiro: só vê os eventos em que a dona a marcou (§6.4).</summary>
    public bool SomenteDela { get; set; }

    public SituacaoAssistente Situacao { get; set; } = SituacaoAssistente.Convidada;

    public DateTimeOffset ConvidadaEm { get; set; }

    public DateTimeOffset? PrimeiroAcessoEm { get; set; }

    public DateTimeOffset? RemovidaEm { get; set; }
}

/// <summary>Assistente marcada num evento (SPEC-032 §6.4).</summary>
public sealed class EventoAssistente
{
    public Guid EventoId { get; set; }

    public Guid AssistenteId { get; set; }
}
