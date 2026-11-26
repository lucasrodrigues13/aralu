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

    /// <summary>Upgrade esperando pagamento (SPEC-065 §6.1): plano de destino e a cobrança avulsa no Asaas.</summary>
    public Guid? UpgradePlanoId { get; set; }

    public string? UpgradeCobrancaId { get; set; }

    public decimal? UpgradeValor { get; set; }

    public DateTimeOffset? UpgradePedidoEm { get; set; }

    /// <summary>Downgrade agendado (SPEC-065 §6.2): o plano menor vale a partir desta data (o próximo vencimento).</summary>
    public Guid? DowngradePlanoId { get; set; }

    public DateOnly? DowngradeEm { get; set; }

    public bool TemTrocaPendente => UpgradePlanoId is not null || DowngradePlanoId is not null;

    public void DescartarTroca()
    {
        UpgradePlanoId = null;
        UpgradeCobrancaId = null;
        UpgradeValor = null;
        UpgradePedidoEm = null;
        DowngradePlanoId = null;
        DowngradeEm = null;
    }

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

    /// <summary>
    /// Valor da conta (R10): o personalizado, se houver; senão o do plano, com o desconto enquanto valer.
    /// Arredondado em centavos (ex.: 30% de 179 = 125,30).
    /// </summary>
    public static decimal ValorCobrado(decimal valorPlano, decimal? personalizado, decimal? descontoPercentual, DateOnly? descontoAte, DateOnly vencimento)
    {
        if (personalizado is decimal fixo)
        {
            return fixo;
        }

        var descontoVale = descontoPercentual is > 0 && (descontoAte is null || vencimento <= descontoAte);
        return descontoVale
            ? Math.Round(valorPlano * (1 - descontoPercentual!.Value / 100m), 2, MidpointRounding.AwayFromZero)
            : valorPlano;
    }

    /// <summary>
    /// Vencimento da primeira cobrança: assinando no trial, o último dia do trial (não perde os dias restantes, T3);
    /// depois do trial, ou com documento que já assinou (R2, T4), no dia.
    /// </summary>
    public DateOnly PrimeiroVencimento(DateTimeOffset agora, bool documentoJaUsado)
    {
        var hoje = DateOnly.FromDateTime(agora.UtcDateTime);

        // Cancelou e volta dentro do período pago: a próxima cobrança é só no dia seguinte ao fim dele.
        if (Situacao == SituacaoAssinatura.Cancelada && PagoAte is DateOnly pago && pago >= hoje)
        {
            return pago.AddDays(1);
        }

        if (documentoJaUsado || Situacao != SituacaoAssinatura.Trial || agora >= TrialTerminaEm)
        {
            return hoje;
        }

        var ultimoDia = DateOnly.FromDateTime(TrialTerminaEm.UtcDateTime).AddDays(-1);
        return ultimoDia > hoje ? ultimoDia : hoje;
    }

    /// <summary>
    /// Pró-rata do upgrade (SPEC-065 regras 1 a 5): o período atual vai de (PagoAte + 1 dia) − 1 mês até PagoAte,
    /// com os dias reais do ciclo; hoje conta como dia restante. Valor = (novo − atual) × restantes / ciclo, em centavos.
    /// </summary>
    public static ProRata CalcularProRata(decimal valorAtual, decimal valorNovo, DateOnly pagoAte, DateOnly hoje)
    {
        var inicio = pagoAte.AddDays(1).AddMonths(-1);
        var diasDoCiclo = pagoAte.DayNumber - inicio.DayNumber + 1;
        var restantes = Math.Clamp(pagoAte.DayNumber - hoje.DayNumber + 1, 0, diasDoCiclo);
        var credito = Math.Round(valorAtual * restantes / diasDoCiclo, 2, MidpointRounding.AwayFromZero);
        var valor = Math.Round(valorNovo * restantes / diasDoCiclo - valorAtual * restantes / diasDoCiclo, 2, MidpointRounding.AwayFromZero);
        return new ProRata(restantes, diasDoCiclo, credito, Math.Max(valor, 0m));
    }

    /// <summary>Dias de trial que faltam (0 fora do trial). O dia do cadastro conta como o 1º.</summary>
    public int DiasRestantesDeTrial(DateTimeOffset agora) =>
        Situacao == SituacaoAssinatura.Trial && agora < TrialTerminaEm
            ? (int)Math.Ceiling((TrialTerminaEm - agora).TotalDays)
            : 0;
}

/// <summary>Resultado do pró-rata: dias restantes, dias do ciclo, crédito do plano atual e valor a pagar agora.</summary>
public sealed record ProRata(int DiasRestantes, int DiasDoCiclo, decimal Credito, decimal Valor);
