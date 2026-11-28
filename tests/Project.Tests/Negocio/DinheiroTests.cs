using Project.Domain.Dinheiro;
using Project.Domain.Fornecedores;

namespace Project.Tests.Negocio;

public class DinheiroTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 18);

    [Fact]
    public void Parcela_sem_recebimento_e_a_receber_ate_vencer_e_depois_atrasada()
    {
        var futura = new ParcelaContrato { Valor = 100m, Vencimento = Hoje.AddDays(3) };
        var vencida = new ParcelaContrato { Valor = 100m, Vencimento = Hoje.AddDays(-1) };

        Assert.Equal(SituacaoParcelaContrato.AReceber, futura.Situacao(Hoje));
        Assert.Equal(SituacaoParcelaContrato.Atrasada, vencida.Situacao(Hoje));
    }

    [Fact]
    public void Recebimento_parcial_e_total_mudam_a_situacao_e_o_saldo()
    {
        var parcela = new ParcelaContrato { Valor = 100m, Vencimento = Hoje.AddDays(5) };
        parcela.Recebimentos.Add(new RecebimentoParcela { Valor = 40m });

        Assert.Equal(SituacaoParcelaContrato.Parcial, parcela.Situacao(Hoje));
        Assert.Equal(60m, parcela.Saldo);

        parcela.Recebimentos.Add(new RecebimentoParcela { Valor = 60m });
        Assert.Equal(SituacaoParcelaContrato.Recebida, parcela.Situacao(Hoje));
        Assert.Equal(0m, parcela.Saldo);
    }

    [Fact]
    public void Texto_da_cobranca_depende_do_vencimento()
    {
        Assert.Equal(TipoCobranca.Lembrete, new ParcelaContrato { Vencimento = Hoje.AddDays(1) }.Cobranca(Hoje));
        Assert.Equal(TipoCobranca.VenceHoje, new ParcelaContrato { Vencimento = Hoje }.Cobranca(Hoje));
        Assert.Equal(TipoCobranca.Atrasada, new ParcelaContrato { Vencimento = Hoje.AddDays(-2) }.Cobranca(Hoje));
    }

    [Fact]
    public void Pagamento_parcelado_esta_pago_so_com_todas_as_parcelas_pagas()
    {
        var contrato = new ContratoFornecedor
        {
            Parcelas = [new ParcelaContratoFornecedor { Numero = 1, Valor = 50m }, new ParcelaContratoFornecedor { Numero = 2, Valor = 50m }],
        };

        Assert.False(contrato.EstaPago);
        contrato.Parcelas[0].Marcar(Hoje);
        Assert.False(contrato.EstaPago);
        contrato.Parcelas[1].Marcar(Hoje);
        Assert.True(contrato.EstaPago);
        contrato.Parcelas[0].Desmarcar();
        Assert.False(contrato.EstaPago);
        Assert.Null(contrato.Parcelas[0].PagoEm);
    }

    [Fact]
    public void Marcar_o_pagamento_marca_todas_as_parcelas_e_desfazer_volta_tudo()
    {
        var contrato = new ContratoFornecedor
        {
            Parcelas = [new ParcelaContratoFornecedor { Numero = 1 }, new ParcelaContratoFornecedor { Numero = 2 }],
        };

        contrato.DefinirPago(true, Hoje);
        Assert.True(contrato.EstaPago);
        Assert.All(contrato.Parcelas, parcela => Assert.Equal(SituacaoParcela.Pago, parcela.Situacao));
        Assert.Equal(Hoje, contrato.Parcelas[1].PagoEm);

        contrato.DefinirPago(false, Hoje);
        Assert.False(contrato.EstaPago);
        Assert.All(contrato.Parcelas, parcela => Assert.Equal(SituacaoParcela.Pendente, parcela.Situacao));
    }

    [Fact]
    public void Pagamento_sem_parcelas_usa_a_propria_marcacao()
    {
        var contrato = new ContratoFornecedor();

        Assert.False(contrato.EstaPago);
        contrato.DefinirPago(true, Hoje);
        Assert.True(contrato.EstaPago);
        Assert.Equal(Hoje, contrato.PagoEm);
        contrato.DefinirPago(false, Hoje);
        Assert.False(contrato.EstaPago);
        Assert.Null(contrato.PagoEm);
    }
}
