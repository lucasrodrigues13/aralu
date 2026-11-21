using Project.Domain.Contratos;

namespace Project.Tests.Negocio;

public class MesclagemTests
{
    [Fact]
    public void Troca_marcas_conhecidas_e_deixa_linha_quando_falta_dado()
    {
        var texto = "Contratante: {{contratante_nome}}, CPF {{ contratante_documento }}. Pix {{contratada_pix}}.";
        var valores = new Dictionary<string, string?> { ["contratante_nome"] = "Ana Souza", ["contratada_pix"] = "a@b.com" };

        var preenchido = Mesclagem.Preencher(texto, valores);

        Assert.Equal("Contratante: Ana Souza, CPF ________. Pix a@b.com.", preenchido);
    }

    [Fact]
    public void Marca_desconhecida_fica_no_texto()
    {
        Assert.Equal("Olá {{apelido}}", Mesclagem.Preencher("Olá {{apelido}}", new Dictionary<string, string?>()));
    }

    [Fact]
    public void Lista_unica_traz_as_tags_do_card_39()
    {
        var marcas = Mesclagem.Campos.Select(campo => campo.Marca).ToArray();

        string[] esperadas =
        [
            "contratante_nome", "contratante_documento", "contratante_endereco", "contratante_email", "contratante_telefone",
            "contratante_estado_civil", "contratante_nacionalidade", "contratada_nome", "contratada_endereco",
            "evento_tipo", "evento_data", "evento_local_cerimonia", "evento_local_recepcao", "evento_convidados",
            "contrato_valor", "contrato_parcelas", "data_hoje",
        ];
        Assert.All(esperadas, marca => Assert.Contains(marca, marcas));
        Assert.Equal(marcas.Length, marcas.Distinct().Count());
    }

    [Fact]
    public void Endereco_da_contratada_vem_dos_campos_estruturados()
    {
        var perfil = new Project.Domain.Perfil.PerfilAssessoria
        {
            Endereco = "Av. Central",
            Numero = "50",
            Complemento = "sala 2",
            Bairro = "Centro",
            Cidade = "São Paulo",
            Estado = "SP",
            Cep = "01001-000",
            Pais = "Brasil",
        };

        var preenchido = Mesclagem.Preencher("{{contratada_endereco}}", Mesclagem.ValoresDaContratada(perfil));

        Assert.Equal("Av. Central, 50, sala 2 - Centro - São Paulo/SP - CEP 01001-000 - Brasil", preenchido);
    }

    [Fact]
    public void Endereco_da_contratada_sem_perfil_fica_em_branco()
    {
        Assert.Equal(Mesclagem.Vazio, Mesclagem.Preencher("{{contratada_endereco}}", Mesclagem.ValoresDaContratada(null)));
    }

    [Fact]
    public void Marca_removida_fica_no_texto()
    {
        Assert.Equal("{{evento_nome}}", Mesclagem.Preencher("{{evento_nome}}", new Dictionary<string, string?> { ["evento_nome"] = "X" }));
    }
}
