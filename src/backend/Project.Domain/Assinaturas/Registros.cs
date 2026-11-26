using Project.Domain.Comum;

namespace Project.Domain.Assinaturas;

/// <summary>Fatura gerada pelo Asaas para a assinatura.</summary>
public sealed class CobrancaAssinatura : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid AssinaturaId { get; set; }

    public string AsaasPaymentId { get; set; } = "";

    public decimal Valor { get; set; }

    public DateOnly Vencimento { get; set; }

    /// <summary>Status do Asaas (PENDING, CONFIRMED, RECEIVED, OVERDUE, REFUNDED...).</summary>
    public string Status { get; set; } = "";

    public FormaPagamento? FormaPagamento { get; set; }

    public DateTimeOffset? PagaEm { get; set; }

    public string? LinkFatura { get; set; }

    public DateTimeOffset CriadaEm { get; set; }
}

/// <summary>Aviso bruto do Asaas. O id do evento é único: o mesmo aviso não é processado duas vezes (T16).</summary>
public sealed class EventoWebhookAsaas
{
    public Guid Id { get; set; }

    public string AsaasEventId { get; set; } = "";

    public string Tipo { get; set; } = "";

    public string Payload { get; set; } = "{}";

    public DateTimeOffset RecebidoEm { get; set; }

    public DateTimeOffset? ProcessadoEm { get; set; }

    public int Tentativas { get; set; }

    public string? Erro { get; set; }
}

/// <summary>CPF/CNPJ que já assinou: impede um segundo trial (R2). Guarda só o hash do documento.</summary>
public sealed class DocumentoTrial : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string DocumentoHash { get; set; } = "";

    public DateTimeOffset UsadoEm { get; set; }
}

/// <summary>Histórico das mudanças feitas pelo Admin: plano, valor, desconto, trial (R13, T22).</summary>
public sealed class AlteracaoAssinatura : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid AssinaturaId { get; set; }

    /// <summary>O que mudou: Plano, Valor, Desconto ou Trial.</summary>
    public string Tipo { get; set; } = "";

    public Guid? PlanoAnteriorId { get; set; }

    public Guid? PlanoNovoId { get; set; }

    public decimal? ValorAnterior { get; set; }

    public decimal? ValorNovo { get; set; }

    /// <summary>Resumo legível do antes e depois (desconto, datas do trial).</summary>
    public string? Detalhe { get; set; }

    public string Motivo { get; set; } = "";

    public string FeitoPorUsuarioId { get; set; } = "";

    public DateTimeOffset FeitoEm { get; set; }
}
