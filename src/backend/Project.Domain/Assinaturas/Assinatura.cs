using Project.Domain.Comum;

namespace Project.Domain.Assinaturas;

/// <summary>Estados da assinatura da conta (SPEC-062 §11).</summary>
public enum SituacaoAssinatura
{
    Trial,
    Ativa,
    EmAtraso,
    Cancelada,
    Expirada,
    Bloqueada,
}

public enum FormaPagamento
{
    Cartao,
    Pix,
}

/// <summary>Uma assinatura por conta (SPEC-062 parte B). Nasce em trial no cadastro.</summary>
public sealed class Assinatura : ITemConta
{
    public const int DiasDeTrial = 14;
    public const int DiasDeTolerancia = 5;

    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public SituacaoAssinatura Situacao { get; set; } = SituacaoAssinatura.Trial;

    public DateTimeOffset TrialIniciaEm { get; set; }

    /// <summary>Fim do trial: 14 dias corridos depois do cadastro. O Admin pode estender.</summary>
    public DateTimeOffset TrialTerminaEm { get; set; }

    public Guid PlanoId { get; set; }

    public decimal? ValorPersonalizado { get; set; }

    public decimal? DescontoPercentual { get; set; }

    public DateOnly? DescontoAte { get; set; }

    /// <summary>Valor que o Asaas cobra hoje (plano, personalizado ou com desconto), gravado ao assinar ou ao o Admin mudar.</summary>
    public decimal Valor { get; set; }

    public string? AsaasCustomerId { get; set; }

    public string? AsaasSubscriptionId { get; set; }

    public FormaPagamento? FormaPagamento { get; set; }

    /// <summary>Vencimento da próxima cobrança; em atraso, o da cobrança vencida.</summary>
    public DateOnly? ProximoVencimento { get; set; }

    /// <summary>Último dia do período já pago.</summary>
    public DateOnly? PagoAte { get; set; }

    public DateTimeOffset? CanceladaEm { get; set; }

    public DateTimeOffset CriadaEm { get; set; }

    public DateTimeOffset AtualizadaEm { get; set; }

    public static Assinatura NovoTrial(Guid contaId, Plano plano, DateTimeOffset agora) => new()
    {
        Id = Guid.NewGuid(),
        ContaId = contaId,
        Situacao = SituacaoAssinatura.Trial,
        TrialIniciaEm = agora,
        TrialTerminaEm = agora.AddDays(DiasDeTrial),
        PlanoId = plano.Id,
        Valor = plano.ValorMensal,
        CriadaEm = agora,
        AtualizadaEm = agora,
    };

    /// <summary>
    /// R7: liberada em trial dentro do prazo, ativa, em atraso até 5 dias depois do vencimento,
    /// ou cancelada até o fim do período pago. Fora disso, bloqueada para todos.
    /// A regra é calculada na hora: o bloqueio não espera o controle diário.
    /// </summary>
    public bool Liberada(DateTimeOffset agora) => Situacao switch
    {
        SituacaoAssinatura.Trial => agora < TrialTerminaEm,
        SituacaoAssinatura.Ativa => true,
        SituacaoAssinatura.EmAtraso => ProximoVencimento is DateOnly vencimento
            && DateOnly.FromDateTime(agora.UtcDateTime) <= vencimento.AddDays(DiasDeTolerancia),
        SituacaoAssinatura.Cancelada => PagoAte is DateOnly pago && DateOnly.FromDateTime(agora.UtcDateTime) <= pago,
        _ => false,
    };

    /// <summary>Dias de trial que faltam (0 fora do trial). O dia do cadastro conta como o 1º.</summary>
    public int DiasRestantesDeTrial(DateTimeOffset agora) =>
        Situacao == SituacaoAssinatura.Trial && agora < TrialTerminaEm
            ? (int)Math.Ceiling((TrialTerminaEm - agora).TotalDays)
            : 0;
}
