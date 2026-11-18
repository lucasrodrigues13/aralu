using Project.Domain.Dinheiro;

namespace Project.Tests.Negocio;

public class DinheiroTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 18);

    [Fact]
    public void Parcela_sem_recebimento_e_a_receber_ate_vencer_e_depois_atrasada()
    {
        var futura = new ParcelaCasal { Valor = 100m, Vencimento = Hoje.AddDays(3) };
        var vencida = new ParcelaCasal { Valor = 100m, Vencimento = Hoje.AddDays(-1) };

        Assert.Equal(SituacaoParcelaCasal.AReceber, futura.Situacao(Hoje));
        Assert.Equal(SituacaoParcelaCasal.Atrasada, vencida.Situacao(Hoje));
    }

    [Fact]
    public void Recebimento_parcial_e_total_mudam_a_situacao_e_o_saldo()
    {
        var parcela = new ParcelaCasal { Valor = 100m, Vencimento = Hoje.AddDays(5) };
        parcela.Recebimentos.Add(new RecebimentoParcela { Valor = 40m });

        Assert.Equal(SituacaoParcelaCasal.Parcial, parcela.Situacao(Hoje));
        Assert.Equal(60m, parcela.Saldo);

        parcela.Recebimentos.Add(new RecebimentoParcela { Valor = 60m });
        Assert.Equal(SituacaoParcelaCasal.Recebida, parcela.Situacao(Hoje));
        Assert.Equal(0m, parcela.Saldo);
    }

    [Fact]
    public void Texto_da_cobranca_depende_do_vencimento()
    {
        Assert.Equal(TipoCobranca.Lembrete, new ParcelaCasal { Vencimento = Hoje.AddDays(1) }.Cobranca(Hoje));
        Assert.Equal(TipoCobranca.VenceHoje, new ParcelaCasal { Vencimento = Hoje }.Cobranca(Hoje));
        Assert.Equal(TipoCobranca.Atrasada, new ParcelaCasal { Vencimento = Hoje.AddDays(-2) }.Cobranca(Hoje));
    }
}
