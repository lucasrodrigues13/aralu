using Project.Domain.Comum;
namespace Project.Domain.Funil;

public enum SituacaoLeadRsvp
{
    Ativo = 0,
    Convertido = 1,
    Descartado = 2,
}

public sealed class LeadRsvp : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid? ConviteId { get; set; }

    public Guid? EventoId { get; set; }

    public string NomeConvite { get; set; } = "";

    public string NomeEvento { get; set; } = "";

    public string? Telefone { get; set; }

    public DateTimeOffset CriadoEm { get; set; }

    public SituacaoLeadRsvp Situacao { get; set; }

    public Guid? OportunidadeId { get; set; }

    public DateTimeOffset? ContatadoEm { get; set; }
}

public sealed class MetricasRsvpFunil : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public int Visualizacoes { get; set; }

    public int CliquesBotao { get; set; }
}
