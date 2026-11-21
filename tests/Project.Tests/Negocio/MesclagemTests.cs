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
    public void Campos_nao_dependem_do_evento()
    {
        var marcas = Mesclagem.Campos.Select(campo => campo.Marca).ToArray();

        Assert.DoesNotContain(marcas, marca => marca.StartsWith("evento_", StringComparison.Ordinal));
        Assert.DoesNotContain("contrato_valor", marcas);
        Assert.DoesNotContain("contrato_parcelas", marcas);
        Assert.Contains("contratante_nome", marcas);
    }

    [Fact]
    public void Marca_removida_fica_no_texto()
    {
        Assert.Equal("{{evento_nome}}", Mesclagem.Preencher("{{evento_nome}}", new Dictionary<string, string?> { ["evento_nome"] = "X" }));
    }
}
