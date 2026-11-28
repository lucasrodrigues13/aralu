using Project.Domain.Comum;
namespace Project.Domain.Equipe;

/// <summary>Tipo da pessoa na conta (SPEC-062 §4, RF-111): Dono pode tudo; Membro faz o que o grupo permite.</summary>
public enum TipoMembro
{
    Dono,
    Membro,
}

public enum SituacaoMembro
{
    Convidada,
    Ativa,
    /// <summary>Login legado apagado (antes da desativação existir).</summary>
    Removida,

    /// <summary>Acesso desativado pelo Dono: cadastro e login ficam guardados para reativar.</summary>
    Inativa,
}

/// <summary>
/// Pessoa da conta (SPEC-062 parte C). O login fica no Identity (<see cref="UsuarioId"/>).
/// Membro exige <see cref="GrupoId"/>; Dono não tem grupo.
/// </summary>
public sealed class MembroConta : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string UsuarioId { get; set; } = "";

    public TipoMembro Tipo { get; set; } = TipoMembro.Membro;

    public Guid? GrupoId { get; set; }

    public string Nome { get; set; } = "";

    public string Email { get; set; } = "";

    public string? Celular { get; set; }

    public DateOnly? Nascimento { get; set; }

    public SituacaoMembro Situacao { get; set; } = SituacaoMembro.Convidada;

    public DateTimeOffset ConvidadaEm { get; set; }

    public DateTimeOffset? PrimeiroAcessoEm { get; set; }

    public DateTimeOffset? RemovidaEm { get; set; }
}

/// <summary>Membro atribuído a um evento: base do alcance "só os eventos em que estou atribuído" (SPEC-062 §9).</summary>
public sealed class EventoMembro : ITemConta
{
    public Guid EventoId { get; set; }

    public Guid MembroId { get; set; }

    public Guid ContaId { get; set; }
}
