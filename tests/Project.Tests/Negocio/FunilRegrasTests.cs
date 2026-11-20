using Project.Domain.Funil;

namespace Project.Tests.Negocio;

public class FunilRegrasTests
{
    [Fact]
    public void Conta_nasce_com_os_quatro_estagios_da_spec_007()
    {
        var estagios = EstagiosFunil.Padrao("conta");

        Assert.Equal(
            ["Contato inicial", "Orçamento enviado", "Contratado", "Descartado"],
            estagios.Select(e => e.Nome));
        Assert.Equal(1, estagios.Count(e => e.Tipo == TipoEstagioFunil.Contratado));
        Assert.Equal(1, estagios.Count(e => e.Tipo == TipoEstagioFunil.Descartado));
        Assert.All(estagios, e => Assert.True(CoresEstagio.Valida(e.Cor)));
    }

    [Fact]
    public void Contratado_e_descartado_ficam_sempre_no_fim()
    {
        var estagios = new[]
        {
            new EstagioFunil { Nome = "Descartado", Tipo = TipoEstagioFunil.Descartado, Ordem = 0 },
            new EstagioFunil { Nome = "Reunião", Tipo = TipoEstagioFunil.Aberto, Ordem = 5 },
            new EstagioFunil { Nome = "Contratado", Tipo = TipoEstagioFunil.Contratado, Ordem = 1 },
            new EstagioFunil { Nome = "Contato", Tipo = TipoEstagioFunil.Aberto, Ordem = 2 },
        };

        Assert.Equal(
            ["Contato", "Reunião", "Contratado", "Descartado"],
            EstagiosFunil.Ordenar(estagios).Select(e => e.Nome));
    }

    [Theory]
    [InlineData("info", true)]
    [InlineData("secondary", true)]
    [InlineData("#ff0000", false)]
    [InlineData(null, false)]
    public void Cor_do_estagio_e_da_paleta(string? cor, bool valida) =>
        Assert.Equal(valida, CoresEstagio.Valida(cor));
}
