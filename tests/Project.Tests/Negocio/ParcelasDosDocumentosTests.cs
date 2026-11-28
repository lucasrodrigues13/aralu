using Project.Application.Negocio;
using Project.Domain.Eventos;

namespace Project.Tests.Negocio;

public class ParcelasDosDocumentosTests
{
    [Fact]
    public void Gera_entrada_e_parcelas_iguais_com_a_sobra_na_ultima()
    {
        var resultado = ParcelasDosDocumentos.Gerar(
            9000m,
            new PedidoParcelas(3, new DateOnly(2027, 1, 10), true, BaseEntrada.Valor, 3000m, new DateOnly(2026, 12, 1)));

        Assert.True(resultado.Ok);
        var parcelas = resultado.Valor!;
        Assert.Equal(4, parcelas.Count);
        Assert.True(parcelas[0].Entrada);
        Assert.Equal(3000m, parcelas[0].Valor);
        Assert.Equal(9000m, parcelas.Sum(parcela => parcela.Valor));
        Assert.Equal(new DateOnly(2027, 3, 10), parcelas[3].Vencimento);
    }

    [Theory]
    [InlineData(null, 3)]
    [InlineData(0, 3)]
    [InlineData(1000, 0)]
    [InlineData(1000, 121)]
    public void Recusa_valor_ou_quantidade_invalidos(int? total, int quantidade)
    {
        var resultado = ParcelasDosDocumentos.Gerar(total, new PedidoParcelas(quantidade, new DateOnly(2027, 1, 10), false, null, null, null));

        Assert.False(resultado.Ok);
    }

    [Fact]
    public void Recusa_entrada_maior_que_o_valor()
    {
        var resultado = ParcelasDosDocumentos.Gerar(
            1000m,
            new PedidoParcelas(2, new DateOnly(2027, 1, 10), true, BaseEntrada.Valor, 1500m, new DateOnly(2026, 12, 1)));

        Assert.False(resultado.Ok);
    }
}
