using Project.Domain.Eventos;

namespace Project.Tests.Negocio;

public class PrazoModeloTests
{
    [Theory]
    [InlineData(null, "Sem prazo")]
    [InlineData(0, "No dia do evento")]
    [InlineData(1, "1 dia antes")]
    [InlineData(7, "1 semana antes")]
    [InlineData(10, "10 dias antes")]
    [InlineData(30, "1 mês antes")]
    [InlineData(42, "6 semanas antes")]
    [InlineData(180, "6 meses antes")]
    public void Exibir_segue_a_regra_da_spec(int? dias, string esperado)
    {
        Assert.Equal(esperado, PrazoModelo.Exibir(dias));
    }

    [Fact]
    public void Informar_2_meses_grava_60_dias()
    {
        Assert.Equal(60, PrazoModelo.ParaDias(2, PrazoModelo.Unidade.Meses));
    }

    [Theory]
    [InlineData(6, PrazoModelo.Unidade.Semanas, 42)]
    [InlineData(1, PrazoModelo.Unidade.Semanas, 7)]
    [InlineData(10, PrazoModelo.Unidade.Dias, 10)]
    [InlineData(null, PrazoModelo.Unidade.NoDia, 0)]
    [InlineData(null, PrazoModelo.Unidade.SemPrazo, null)]
    public void ParaDias_converte_a_unidade(int? quantidade, PrazoModelo.Unidade unidade, int? esperado)
    {
        Assert.Equal(esperado, PrazoModelo.ParaDias(quantidade, unidade));
    }

    [Fact]
    public void DeDias_prefere_meses_depois_semanas()
    {
        Assert.Equal((6, PrazoModelo.Unidade.Meses), PrazoModelo.DeDias(180));
        Assert.Equal((6, PrazoModelo.Unidade.Semanas), PrazoModelo.DeDias(42));
        Assert.Equal((10, PrazoModelo.Unidade.Dias), PrazoModelo.DeDias(10));
        Assert.Equal((null, PrazoModelo.Unidade.NoDia), PrazoModelo.DeDias(0));
        Assert.Equal((null, PrazoModelo.Unidade.SemPrazo), PrazoModelo.DeDias(null));
    }

    [Fact]
    public void Validar_rejeita_fora_de_0_a_999()
    {
        Assert.NotNull(PrazoModelo.Validar(-1, PrazoModelo.Unidade.Dias));
        Assert.NotNull(PrazoModelo.Validar(1000, PrazoModelo.Unidade.Semanas));
        Assert.Null(PrazoModelo.Validar(999, PrazoModelo.Unidade.Meses));
        Assert.Null(PrazoModelo.Validar(null, PrazoModelo.Unidade.SemPrazo));
    }
}
