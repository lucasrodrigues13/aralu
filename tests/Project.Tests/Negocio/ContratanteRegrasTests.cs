using Project.Application.Negocio;
using Project.Domain.Funil;

namespace Project.Tests.Negocio;

public class ContratanteRegrasTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 21);

    private static ContratanteDados Completo() => new(
        "Maria da Silva", "529.982.247-25", new DateOnly(1990, 5, 1), "Médica", "casado(a)", "Brasileira",
        "maria@exemplo.com", "11977776666", "01001-000", "Praça da Sé", "1", "Sé", "São Paulo", "SP", null, "Brasil");

    [Fact]
    public void Normalizar_limpa_documento_cep_e_estado_civil()
    {
        var resultado = ContratanteRegras.Normalizar(Completo(), Hoje);

        Assert.True(resultado.Ok);
        Assert.Equal("52998224725", resultado.Valor!.Documento);
        Assert.Equal("01001-000", resultado.Valor.Cep);
        Assert.Equal("Casado(a)", resultado.Valor.EstadoCivil);
    }

    [Fact]
    public void Normalizar_aceita_tudo_vazio()
    {
        var vazio = new ContratanteDados(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        Assert.True(ContratanteRegras.Normalizar(vazio, Hoje).Ok);
    }

    [Theory]
    [InlineData("111.111.111-11")]
    [InlineData("123")]
    public void Normalizar_recusa_documento_invalido(string documento)
    {
        Assert.False(ContratanteRegras.Normalizar(Completo() with { Documento = documento }, Hoje).Ok);
    }

    [Fact]
    public void Normalizar_recusa_email_estado_civil_nascimento_e_cep_invalidos()
    {
        Assert.False(ContratanteRegras.Normalizar(Completo() with { Email = "sem-arroba" }, Hoje).Ok);
        Assert.False(ContratanteRegras.Normalizar(Completo() with { EstadoCivil = "Complicado" }, Hoje).Ok);
        Assert.False(ContratanteRegras.Normalizar(Completo() with { Nascimento = Hoje.AddDays(2) }, Hoje).Ok);
        Assert.False(ContratanteRegras.Normalizar(Completo() with { Cep = "123" }, Hoje).Ok);
    }

    [Fact]
    public void Faltando_lista_o_que_o_contrato_exige()
    {
        Assert.Empty(ContratanteRegras.Faltando(ContratanteRegras.Normalizar(Completo(), Hoje).Valor!));

        var faltam = ContratanteRegras.Faltando(Completo() with { Documento = null, Nacionalidade = " ", Numero = null });

        Assert.Equal(["CPF/CNPJ", "nacionalidade", "número"], faltam);
    }

    [Fact]
    public void Faltando_nao_exige_nascimento_profissao_complemento_nem_pais()
    {
        var minimo = Completo() with { Nascimento = null, Profissao = null, Complemento = null, Pais = null };

        Assert.Empty(ContratanteRegras.Faltando(minimo));
    }

    [Fact]
    public void Lead_descartado_perde_documento_nascimento_e_endereco_mas_guarda_o_resto()
    {
        var item = new Oportunidade();
        ContratanteRegras.Aplicar(item, ContratanteRegras.Normalizar(Completo(), Hoje).Valor!);

        item.LimparDadosSensiveis();

        Assert.Null(item.ContratanteDocumento);
        Assert.Null(item.ContratanteNascimento);
        Assert.Null(item.ContratanteCep);
        Assert.Null(item.ContratanteEndereco);
        Assert.Null(item.ContratanteCidade);
        Assert.Equal("Maria da Silva", item.ContratanteNome);
        Assert.Equal("maria@exemplo.com", item.ContratanteEmail);
        Assert.Equal("Casado(a)", item.ContratanteEstadoCivil);
    }

    [Fact]
    public void Aplicar_em_lead_descartado_nao_guarda_dados_sensiveis()
    {
        var item = new Oportunidade
        {
            EstagioFunil = new EstagioFunil { Tipo = TipoEstagioFunil.Descartado },
        };

        ContratanteRegras.Aplicar(item, ContratanteRegras.Normalizar(Completo(), Hoje).Valor!);

        Assert.Null(item.ContratanteDocumento);
        Assert.Equal("Maria da Silva", item.ContratanteNome);
    }
}
