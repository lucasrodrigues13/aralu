using Project.Domain.Comum;
namespace Project.Domain.Convidados;

/// <summary>
/// Entrada da lista de presença (SPEC-054): uma por convidado confirmado, com id único.
/// Nasce quando o convidado passa a Confirmado e some quando deixa de ser.
/// </summary>
public sealed class PresencaEvento : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid EventoId { get; set; }

    public Guid ConviteId { get; set; }

    public Guid ConvidadoId { get; set; }

    public DateTimeOffset ConfirmadoEm { get; set; }

    /// <summary>Quando a portaria marcou que o convidado compareceu (SPEC-058). Nulo = ainda não entrou.</summary>
    public DateTimeOffset? CompareceuEm { get; set; }
}
