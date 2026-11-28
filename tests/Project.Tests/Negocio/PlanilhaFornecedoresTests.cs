using ClosedXML.Excel;
using Project.Domain.Fornecedores;
using Project.Infrastructure.Fornecedores;

namespace Project.Tests.Negocio;

/// <summary>Leitura da planilha de fornecedores: aba principal e aba opcional de dados bancários.</summary>
public class PlanilhaFornecedoresTests
{
    private static IReadOnlyList<IReadOnlyList<string?>> Linhas(params string?[][] linhas) => linhas;

    [Fact]
    public void Le_fornecedores_e_liga_dados_bancarios_pelo_nome()
    {
        var leitura = PlanilhaFornecedores.Interpretar(
            Linhas(
                ["Nome *", "Serviços *", "Telefone", "E-mail", "Preço de"],
                ["Buffet Sabor", "Buffet, bar, Buffet", "(11) 99999-0000", "a@b.com", "1.500,50"],
                ["", "", "", "", ""],
                ["Foto Luz", "Fotografia", "", "", ""]),
            Linhas(
                ["Fornecedor *", "Banco", "Tipo de conta", "Tipo de Pix", "Chave Pix"],
                ["buffet sabor", "341 - Itaú", "poupanca", "E-mail", "fin@b.com"]));

        Assert.Empty(leitura.Erros);
        Assert.Equal(2, leitura.Fornecedores.Count);
        var buffet = leitura.Fornecedores[0];
        Assert.Equal(["Buffet", "bar"], buffet.Servicos);
        Assert.Equal("11999990000", buffet.Telefone);
        Assert.Equal(1500.50m, buffet.PrecoDe);
        Assert.Equal("Poupança", buffet.TipoConta);
        Assert.Equal("Email", buffet.PixTipo);
        Assert.Equal(4, leitura.Fornecedores[1].Linha);
        Assert.Null(leitura.Fornecedores[1].Banco);
    }

    [Fact]
    public void Junta_todos_os_erros_com_a_linha()
    {
        var leitura = PlanilhaFornecedores.Interpretar(
            Linhas(
                ["Nome", "Serviços"],
                ["Buffet (exemplo)", "Buffet"],
                ["Sem serviço", ""],
                ["Banda", "Música"],
                ["banda", "Música"]),
            Linhas(
                ["Fornecedor", "Tipo de conta"],
                ["Inexistente", "Corrente"],
                ["Banda", "Salário"]));

        Assert.Equal(
            [
                "Linha 2: apague as linhas de exemplo antes de importar.",
                "Linha 3: informe ao menos um serviço de \"Sem serviço\".",
                "Linha 5: o fornecedor \"banda\" aparece mais de uma vez na planilha.",
                "Dados bancários, linha 2: \"Inexistente\" não está na aba Fornecedores.",
                "Dados bancários, linha 3: tipo de conta deve ser Corrente, Pagamento ou Poupança.",
            ],
            leitura.Erros);
    }

    [Fact]
    public void Exige_as_colunas_do_modelo()
    {
        var leitura = PlanilhaFornecedores.Interpretar(Linhas(["Fornecedor", "Telefone"], ["Banda", "1"]), []);
        Assert.Single(leitura.Erros);
        Assert.Empty(leitura.Fornecedores);
    }

    [Fact]
    public void Modelo_baixado_e_lido_de_volta_recusa_os_exemplos()
    {
        var planilha = new PlanilhaFornecedoresExcel();
        var modelo = planilha.Modelo();
        using (var livro = new XLWorkbook(new MemoryStream(modelo)))
        {
            Assert.Equal(["Fornecedores", "Dados bancários", "Instruções"], livro.Worksheets.Select(a => a.Name));
        }

        var lido = planilha.Ler(new MemoryStream(modelo), "fornecedores.xlsx");
        Assert.True(lido.Ok);
        Assert.Empty(lido.Valor!.Fornecedores);
        Assert.Contains(lido.Valor.Erros, erro => erro.Contains("exemplo"));
    }

    [Fact]
    public void Planilha_preenchida_le_as_duas_abas()
    {
        using var livro = new XLWorkbook();
        var aba = livro.AddWorksheet("Fornecedores");
        aba.Cell(1, 1).Value = "Nome *";
        aba.Cell(1, 2).Value = "Serviços *";
        aba.Cell(1, 3).Value = "Preço até";
        aba.Cell(2, 1).Value = "Banda Som";
        aba.Cell(2, 2).Value = "Banda";
        aba.Cell(2, 3).Value = 2500.5;
        var bancos = livro.AddWorksheet("Dados bancários");
        bancos.Cell(1, 1).Value = "Fornecedor *";
        bancos.Cell(1, 2).Value = "Agência";
        bancos.Cell(2, 1).Value = "Banda Som";
        bancos.Cell(2, 2).Value = "0012";
        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        memoria.Position = 0;

        var lido = new PlanilhaFornecedoresExcel().Ler(memoria, "minha.xlsx");

        Assert.True(lido.Ok);
        Assert.Empty(lido.Valor!.Erros);
        var banda = Assert.Single(lido.Valor.Fornecedores);
        Assert.Equal(2500.5m, banda.PrecoAte);
        Assert.Equal("0012", banda.Agencia);
    }
}
