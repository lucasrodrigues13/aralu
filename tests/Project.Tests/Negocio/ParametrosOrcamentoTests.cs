using Project.Application.Negocio;
using Project.Domain.Eventos;
using Project.Domain.Funil;

namespace Project.Tests.Negocio;

public class ParametrosOrcamentoTests
{
    [Fact]
    public void Troca_todos_os_parametros_da_lista_fechada()
    {
        var lead = new Oportunidade
        {
            Nome = "Casamento Ana e Beto",
            TipoEvento = TipoEvento.QuinzeAnos,
            DataPrevista = new DateOnly(2027, 5, 8),
            QuantidadeConvidados = 150,
            LocalCerimonia = "Igreja Matriz",
            LocalRecepcao = "Salão Jardim",
        };

        var texto = ParametrosOrcamento.Aplicar(
            "{{nome_oportunidade}}|{{tipo_evento}}|{{data_evento}}|{{convidados}}|{{local_cerimonia}}|{{local_recepcao}}|{{VALOR}}|{{validade}}|{{nome_assessoria}}",
            lead,
            12500m,
            new DateOnly(2026, 11, 20),
            "Aralu Eventos");

        var partes = texto.Split('|');
        Assert.Equal("Casamento Ana e Beto", partes[0]);
        Assert.Equal("15 anos", partes[1]);
        Assert.Equal("08/05/2027", partes[2]);
        Assert.Equal("150", partes[3]);
        Assert.Equal("Igreja Matriz", partes[4]);
        Assert.Equal("Salão Jardim", partes[5]);
        Assert.Contains("12.500,00", partes[6]);
        Assert.Equal("20/12/2026", partes[7]);
        Assert.Equal("Aralu Eventos", partes[8]);
    }

    [Fact]
    public void Dado_ausente_vira_vazio_e_texto_fora_da_lista_fica_como_esta()
    {
        var texto = ParametrosOrcamento.Aplicar("Data: {{data_evento}}. Obs: {{outra}}", new Oportunidade { Nome = "Lead" }, null, new DateOnly(2026, 1, 1), null);

        Assert.Equal("Data: . Obs: {{outra}}", texto);
    }

    [Fact]
    public void Em_html_o_valor_entra_escapado()
    {
        var texto = ParametrosOrcamento.Aplicar("<p><strong>{{nome_oportunidade}}</strong></p>", new Oportunidade { Nome = "Ana & <Beto>" }, null, new DateOnly(2026, 1, 1), null);

        Assert.Equal("<p><strong>Ana &amp; &lt;Beto&gt;</strong></p>", texto);
    }
}
