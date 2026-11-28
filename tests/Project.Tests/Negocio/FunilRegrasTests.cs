using Project.Domain.Funil;

namespace Project.Tests.Negocio;

public class FunilRegrasTests
{
    private static readonly Guid ContaDoTeste = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public void Conta_nasce_com_os_quatro_estagios_da_spec_007()
    {
        var estagios = EstagiosFunil.Padrao(ContaDoTeste);

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

public class OrigemEContatoTests
{
    [Theory]
    [InlineData("instagram", "Instagram")]
    [InlineData(" Indicação ", "Indicação")]
    [InlineData("Formulário do site", "Formulário do site")]
    [InlineData("TikTok", null)]
    [InlineData(null, null)]
    public void Origem_so_aceita_item_da_lista(string? texto, string? item) =>
        Assert.Equal(item, OrigensFunil.Item(texto));

    [Fact]
    public void Origem_outro_mostra_o_texto_livre()
    {
        Assert.Equal("TikTok", OrigensFunil.Texto("Outro", "TikTok"));
        Assert.Equal("Outro", OrigensFunil.Texto("Outro", null));
        Assert.Equal("Google", OrigensFunil.Texto("Google", "ignorado"));
        Assert.Equal(10, OrigensFunil.Lista.Length);
        Assert.Equal("Outro", OrigensFunil.Lista[^1]);
    }

    [Theory]
    [InlineData("(11) 99999-8888", "11999998888")]
    [InlineData("+55 11 99999-8888", "11999998888")]
    [InlineData("5511999998888", "11999998888")]
    [InlineData("1199999", null)]
    [InlineData("", null)]
    public void Telefone_compara_so_os_digitos(string? telefone, string? normalizado) =>
        Assert.Equal(normalizado, ContatoNormalizado.Telefone(telefone));

    [Fact]
    public void Email_compara_sem_maiusculas() =>
        Assert.Equal("ana@ex.com", ContatoNormalizado.Email("  Ana@Ex.com "));
}
