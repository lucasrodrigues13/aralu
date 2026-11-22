namespace Project.Domain.Convidados;

/// <summary>
/// Entrada da lista de presença (SPEC-054): uma por convidado confirmado, com id único.
/// Nasce quando o convidado passa a Confirmado e some quando deixa de ser.
/// </summary>
public sealed class PresencaEvento
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public Guid ConviteId { get; set; }

    public Guid ConvidadoId { get; set; }

    public DateTimeOffset ConfirmadoEm { get; set; }
}
