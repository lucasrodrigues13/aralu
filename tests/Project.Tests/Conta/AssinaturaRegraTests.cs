using Project.Domain.Assinaturas;

namespace Project.Tests.Conta;

/// <summary>R7 da SPEC-062: quando a conta está liberada.</summary>
public class AssinaturaRegraTests
{
    private static readonly DateTimeOffset Cadastro = new(2026, 3, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly Plano Pro = new() { Id = Plano.ProId, ValorMensal = 179m };

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

        Assert.True(assinatura.Liberada(new DateTimeOffset(2026, 4, 15, 23, 0, 0, TimeSpan.Zero)));
        Assert.False(assinatura.Liberada(new DateTimeOffset(2026, 4, 16, 0, 0, 0, TimeSpan.Zero)));
    }

    [Fact]
    public void Cancelada_libera_ate_o_fim_do_periodo_pago()
    {
        var assinatura = new Assinatura { Situacao = SituacaoAssinatura.Cancelada, PagoAte = new DateOnly(2026, 4, 30) };

        Assert.True(assinatura.Liberada(new DateTimeOffset(2026, 4, 30, 20, 0, 0, TimeSpan.Zero)));
        Assert.False(assinatura.Liberada(new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero)));
    }

    [Theory]
    [InlineData(SituacaoAssinatura.Ativa, true)]
    [InlineData(SituacaoAssinatura.Expirada, false)]
    [InlineData(SituacaoAssinatura.Bloqueada, false)]
    public void Ativa_libera_expirada_e_bloqueada_nao(SituacaoAssinatura situacao, bool liberada)
    {
        Assert.Equal(liberada, new Assinatura { Situacao = situacao }.Liberada(Cadastro));
    }
}
