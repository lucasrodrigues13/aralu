using Project.Domain.Assinaturas;

namespace Project.Tests.Conta;

/// <summary>R7 da SPEC-062: quando a conta está liberada.</summary>
public class AssinaturaRegraTests
{
    private static readonly DateTimeOffset Cadastro = new(2026, 3, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly Plano Pro = new() { Id = Plano.ProId, ValorMensal = 179m };
    private static readonly TimeSpan Brasilia = TimeSpan.FromHours(-3);

    [Fact]
    public void Trial_vale_14_dias_e_bloqueia_no_15o()
    {
        var assinatura = Assinatura.NovoTrial(Guid.NewGuid(), Pro, Cadastro);

        Assert.Equal(179m, assinatura.Valor);
        Assert.Equal(14, assinatura.DiasRestantesDeTrial(Cadastro));
        Assert.True(assinatura.Liberada(Cadastro.AddDays(13).AddHours(23)));
        Assert.Equal(1, assinatura.DiasRestantesDeTrial(Cadastro.AddDays(13).AddHours(23)));
        Assert.False(assinatura.Liberada(Cadastro.AddDays(14)));
        Assert.Equal(0, assinatura.DiasRestantesDeTrial(Cadastro.AddDays(14)));
    }

    [Fact]
    public void Em_atraso_libera_ate_5_dias_depois_do_vencimento()
    {
        var assinatura = new Assinatura { Situacao = SituacaoAssinatura.EmAtraso, ProximoVencimento = new DateOnly(2026, 4, 10) };

        // O dia vira à meia-noite de Brasília (03:00 UTC), não à meia-noite UTC.
        Assert.True(assinatura.Liberada(new DateTimeOffset(2026, 4, 15, 23, 59, 0, Brasilia)));
        Assert.False(assinatura.Liberada(new DateTimeOffset(2026, 4, 16, 0, 0, 0, Brasilia)));
    }

    [Fact]
    public void Cancelada_libera_ate_o_fim_do_periodo_pago_no_horario_de_brasilia()
    {
        var assinatura = new Assinatura { Situacao = SituacaoAssinatura.Cancelada, PagoAte = new DateOnly(2026, 4, 30) };

        // 22h do último dia pago em Brasília já é 01/05 em UTC: a conta continua liberada.
        Assert.True(assinatura.Liberada(new DateTimeOffset(2026, 5, 1, 1, 0, 0, TimeSpan.Zero)));
        Assert.True(assinatura.Liberada(new DateTimeOffset(2026, 4, 30, 23, 59, 0, Brasilia)));
        Assert.False(assinatura.Liberada(new DateTimeOffset(2026, 5, 1, 0, 0, 0, Brasilia)));
    }

    [Fact]
    public void Desconto_vale_ate_a_data_e_o_personalizado_vence_o_plano()
    {
        var ate = new DateOnly(2027, 3, 31);

        // T18: 30% de 179 = 125,30 até 31/03; a primeira cobrança depois volta a 179.
        Assert.Equal(125.30m, Assinatura.ValorCobrado(179m, null, 30m, ate, new DateOnly(2027, 3, 31)));
        Assert.Equal(179m, Assinatura.ValorCobrado(179m, null, 30m, ate, new DateOnly(2027, 4, 1)));
        Assert.Equal(125.30m, Assinatura.ValorCobrado(179m, null, 30m, null, new DateOnly(2030, 1, 1)));
        Assert.Equal(99m, Assinatura.ValorCobrado(179m, 99m, 30m, ate, new DateOnly(2027, 1, 1)));
    }

    [Fact]
    public void Primeiro_vencimento_no_trial_e_o_ultimo_dia_e_com_documento_usado_e_hoje()
    {
        var assinatura = Assinatura.NovoTrial(Guid.NewGuid(), Pro, Cadastro);
        var quintoDia = Cadastro.AddDays(4);

        Assert.Equal(new DateOnly(2026, 3, 14), assinatura.PrimeiroVencimento(quintoDia, documentoJaUsado: false));
        Assert.Equal(new DateOnly(2026, 3, 5), assinatura.PrimeiroVencimento(quintoDia, documentoJaUsado: true));
        Assert.Equal(new DateOnly(2026, 3, 20), assinatura.PrimeiroVencimento(Cadastro.AddDays(19), documentoJaUsado: false));
    }

    [Theory]
    [InlineData(SituacaoAssinatura.Ativa, true)]
    [InlineData(SituacaoAssinatura.Expirada, false)]
    [InlineData(SituacaoAssinatura.Bloqueada, false)]
    public void Ativa_libera_expirada_e_bloqueada_nao(SituacaoAssinatura situacao, bool liberada)
    {
        Assert.Equal(liberada, new Assinatura { Situacao = situacao }.Liberada(Cadastro));
    }

    [Fact]
    public void ProRata_do_upgrade_usa_os_dias_reais_do_ciclo_e_conta_hoje()
    {
        // SPEC-065 regra 6: 10 de 30 dias restantes, de 179 para 299 = 40,00.
        var pagoAte = new DateOnly(2026, 4, 30);
        var conta = Assinatura.CalcularProRata(179m, 299m, pagoAte, new DateOnly(2026, 4, 21));
        Assert.Equal(new ProRata(10, 30, 59.67m, 40m), conta);

        // Ciclo de 31 dias (01/03 a 31/03), último dia: só a diferença de um dia.
        var ultimoDia = Assinatura.CalcularProRata(179m, 299m, new DateOnly(2026, 3, 31), new DateOnly(2026, 3, 31));
        Assert.Equal(1, ultimoDia.DiasRestantes);
        Assert.Equal(31, ultimoDia.DiasDoCiclo);
        Assert.Equal(3.87m, ultimoDia.Valor);

        // Fevereiro: ciclo de 28 dias (01/02 a 28/02), hoje no primeiro dia paga o ciclo inteiro de diferença.
        var inteiro = Assinatura.CalcularProRata(179m, 299m, new DateOnly(2026, 2, 28), new DateOnly(2026, 2, 1));
        Assert.Equal(new ProRata(28, 28, 179m, 120m), inteiro);
    }
}
