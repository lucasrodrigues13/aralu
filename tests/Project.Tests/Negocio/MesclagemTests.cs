using Project.Domain.Contratos;

namespace Project.Tests.Negocio;

public class MesclagemTests
{
    [Fact]
    public void Troca_marcas_conhecidas_e_deixa_linha_quando_falta_dado()
    {
        var texto = "Contratante: {{contratante_nome}}, CPF {{ contratante_documento }}. Valor {{contrato_valor}}.";
        var valores = new Dictionary<string, string?> { ["contratante_nome"] = "Ana Souza", ["contrato_valor"] = "R$ 10,00" };

        var preenchido = Mesclagem.Preencher(texto, valores);

        Assert.Equal("Contratante: Ana Souza, CPF ________. Valor R$ 10,00.", preenchido);
    }

    [Fact]
    public void Marca_desconhecida_fica_no_texto()
    {
        Assert.Equal("Olá {{apelido}}", Mesclagem.Preencher("Olá {{apelido}}", new Dictionary<string, string?>()));
    }

    [Fact]
    public void Link_vale_ate_expirar()
    {
        var agora = DateTimeOffset.UtcNow;
        var link = new LinkLeituraContrato { ExpiraEm = agora.Add(Mesclagem.ValidadeLink) };

        Assert.True(link.Valido(agora));
        Assert.False(link.Valido(agora.AddDays(8)));
    }
}
