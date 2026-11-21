using Project.Application.Comum;

namespace Project.Tests.Negocio;

public class DocumentosTests
{
    [Fact]
    public void Limpar_tira_mascara_e_poe_em_maiusculas()
    {
        Assert.Equal("12ABC34501DE35", Documentos.Limpar("12.abc.345/01de-35"));
        Assert.Equal("52998224725", Documentos.Limpar(" 529.982.247-25 "));
        Assert.Null(Documentos.Limpar("  "));
        Assert.Null(Documentos.Limpar("./-"));
        Assert.Null(Documentos.Limpar(null));
    }

    [Fact]
    public void Digitos_do_exemplo_oficial_do_cnpj_alfanumerico()
    {
        // SERPRO: 12ABC34501DE gera os dígitos 3 (soma 459, resto 8) e 5 (soma 424, resto 6).
        Assert.Equal(3, Documentos.DigitoCnpj("12ABC34501DE", 12));
        Assert.Equal(5, Documentos.DigitoCnpj("12ABC34501DE3", 13));
        Assert.Equal("12ABC34501DE35", Documentos.Cnpj("12.ABC.345/01DE-35"));
        Assert.Equal("12ABC34501DE35", Documentos.Cnpj("12abc34501de35"));
    }

    [Fact]
    public void Cnpj_so_com_numeros_continua_valido()
    {
        Assert.Equal("11222333000181", Documentos.Cnpj("11.222.333/0001-81"));
    }

    [Theory]
    [InlineData("12ABC34501DE36")]
    [InlineData("12ABC34501DE3A")]
    [InlineData("12ABC34501DE")]
    [InlineData("00000000000000")]
    [InlineData("11.222.333/0001-82")]
    public void Cnpj_invalido_devolve_vazio(string valor)
    {
        Assert.Equal("", Documentos.Cnpj(valor));
    }

    [Fact]
    public void Cpf_valida_digitos_e_nao_aceita_letra()
    {
        Assert.Equal("52998224725", Documentos.Cpf("529.982.247-25"));
        Assert.Equal("", Documentos.Cpf("529.982.247-26"));
        Assert.Equal("", Documentos.Cpf("11111111111"));
        Assert.Equal("", Documentos.Cpf("5299822472A"));
        Assert.Equal("", Documentos.Cpf("123"));
        Assert.Null(Documentos.Cpf(""));
        Assert.Null(Documentos.Cpf(null));
    }

    [Fact]
    public void Campo_unico_escolhe_cpf_ou_cnpj_pelo_tamanho()
    {
        Assert.Equal("52998224725", Documentos.CpfOuCnpj("529.982.247-25"));
        Assert.Equal("11222333000181", Documentos.CpfOuCnpj("11.222.333/0001-81"));
        Assert.Equal("12ABC34501DE35", Documentos.CpfOuCnpj("12.ABC.345/01DE-35"));
        Assert.Equal("", Documentos.CpfOuCnpj("123456789012"));
        Assert.Null(Documentos.CpfOuCnpj(null));
    }
}
