using Project.Domain.Convidados;
using Project.Domain.Eventos;
using Project.Infrastructure.Convidados;

namespace Project.Tests.Negocio;

public class RegrasNegocioTests
{
    [Fact]
    public void Casamento_une_os_dois_nomes_com_e_comercial()
    {
        Assert.Equal("Ana & Bruno", NomeDoEvento.Montar(TipoEvento.Casamento, " Ana ", "Bruno"));
        Assert.Equal("Ana", NomeDoEvento.Montar(TipoEvento.Casamento, "Ana", " "));
        Assert.Equal("Maria e João", NomeDoEvento.Montar(TipoEvento.Casamento, " Maria e João ", null));
        Assert.Equal("Bruno", NomeDoEvento.Montar(TipoEvento.Casamento, null, "Bruno"));
        Assert.Null(NomeDoEvento.Montar(TipoEvento.Casamento, " ", " "));
        Assert.Equal("Helena", NomeDoEvento.Montar(TipoEvento.Aniversario, " Helena ", null));
    }

    [Fact]
    public void Assessoria_separa_entrada_e_parcelas()
    {
        var parcelas = ParcelasDaAssessoria.Calcular(
            15000m, 4, new DateOnly(2026, 12, 10), true, BaseEntrada.Valor, 3000m, new DateOnly(2026, 11, 10));

        Assert.Equal(5, parcelas.Count);
        Assert.Equal(3000m, parcelas[0].Valor);
        Assert.True(parcelas[0].Entrada);
        Assert.All(parcelas.Skip(1), parcela => Assert.Equal(3000m, parcela.Valor));
        Assert.Equal(new DateOnly(2027, 3, 10), parcelas[4].Vencimento);
    }

    [Fact]
    public void Modelo_vem_com_dois_convites_de_exemplo_listas_e_instrucoes()
    {
        var planilha = new PlanilhaExcel();
        using var livro = new ClosedXML.Excel.XLWorkbook(new MemoryStream(planilha.Modelo()));

        Assert.Equal(["Convidados", "Instruções"], livro.Worksheets.Select(aba => aba.Name));
        var aba = livro.Worksheet("Convidados");
        Assert.Equal(PlanilhaConvites.Colunas, Enumerable.Range(1, 9).Select(coluna => aba.Cell(1, coluna).GetString()));
        Assert.Equal("", aba.Cell(1, 10).GetString());
        Assert.Equal(["Sim", "Não", "Não", "Sim"], Enumerable.Range(2, 4).Select(linha => aba.Cell(linha, 6).GetString()));
        Assert.Contains("apague", aba.Cell(1, 1).GetComment().Text, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("Família Souza (exemplo)", aba.Cell(2, 1).GetString());
        Assert.Equal("11999990000", aba.Cell(2, 3).GetString());
        Assert.Equal("Ana Lima (exemplo)", aba.Cell(5, 1).GetString());

        string Lista(int coluna) => aba.DataValidations.Single(validacao => validacao.Ranges.Any(intervalo => intervalo.FirstCell().Address.ColumnNumber == coluna)).Value;
        Assert.Equal("\"Sim,Não\"", Lista(6));
        Assert.Equal("\"Masculino,Feminino\"", Lista(7));
        Assert.Contains("Apague as linhas de exemplo", livro.Worksheet("Instruções").Cell(2, 1).GetString(), StringComparison.Ordinal);

        // Os exemplos estão na aba importada: a leitura os traz e a importação os reconhece.
        var linhas = planilha.Ler(new MemoryStream(planilha.Modelo()), "modelo.xlsx").Valor!;
        Assert.Equal(4, linhas.Count);
        Assert.All(linhas, linha => Assert.True(PlanilhaConvites.LinhaDeExemplo(linha.Convite, linha.Convidado)));
        Assert.False(PlanilhaConvites.LinhaDeExemplo("Família Souza", "Maria Souza"));
    }

    [Fact]
    public void Leitura_guarda_o_numero_da_linha_e_pula_linhas_vazias()
    {
        using var livro = new ClosedXML.Excel.XLWorkbook();
        var aba = livro.AddWorksheet("Convidados");
        for (var i = 0; i < PlanilhaConvites.Colunas.Length; i++)
        {
            aba.Cell(1, i + 1).Value = PlanilhaConvites.Colunas[i];
        }

        aba.Cell(2, 1).Value = "Família Souza";
        aba.Cell(2, 5).Value = "Maria Souza";
        aba.Cell(4, 1).Value = "Família Souza";
        aba.Cell(4, 5).Value = "João Souza";
        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        memoria.Position = 0;

        var linhas = new PlanilhaExcel().Ler(memoria, "convidados.xlsx").Valor!;

        Assert.Equal([2, 4], linhas.Select(item => item.Linha));
    }

    [Fact]
    public void Colunas_a_mais_como_mesa_e_custo_sao_ignoradas_e_falta_de_coluna_e_avisada()
    {
        string[] antigo = ["Nome do convite *", "DDI", "DDD + Telefone para confirmação de presença", "Observação do convite", "Nome dos convidados *", "Convidado principal *", "Gênero", "Faixa etária", "Custo/pagamento", "Situação", "Mesa"];
        using var livro = new ClosedXML.Excel.XLWorkbook();
        var aba = livro.AddWorksheet("Convidados");
        for (var i = 0; i < antigo.Length; i++)
        {
            aba.Cell(1, i + 1).Value = antigo[i];
        }

        string[] linha = ["Família Souza", "+55", "11999990000", "", "Maria Souza", "Sim", "Feminino", "Adulto", "Meia", "Confirmado", "3"];
        for (var i = 0; i < linha.Length; i++)
        {
            aba.Cell(2, i + 1).Value = linha[i];
        }

        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        memoria.Position = 0;

        var lida = Assert.Single(new PlanilhaExcel().Ler(memoria, "antiga.xlsx").Valor!);

        Assert.Equal("Confirmado", lida.Situacao);
        Assert.Equal("Adulto", lida.Faixa);
        Assert.Equal("Sim", lida.Principal);
        Assert.Null(PlanilhaConvites.MapearCabecalho(["Nome do convite *", "DDI"]));

        // Modelo de antes da coluna Convidado principal: a mensagem diz o que falta.
        string[] semPrincipal = antigo.Where(coluna => coluna != "Convidado principal *").ToArray();
        Assert.Equal(["Convidado principal *"], PlanilhaConvites.ColunasQueFaltam(semPrincipal));
        Assert.Equal(true, PlanilhaConvites.LerSimNao(" sim "));
        Assert.Equal(false, PlanilhaConvites.LerSimNao(""));
        Assert.Null(PlanilhaConvites.LerSimNao("Talvez"));
    }

    [Fact]
    public void Rotulos_da_planilha_e_o_modelo_tem_9_colunas()
    {
        Assert.Equal(CustoConvidado.Gratuita, Rotulos.Custo("Free"));
        Assert.Equal(SituacaoConvidado.NaoComparecera, Rotulos.Situacao("Não comparecerá"));
        Assert.Equal("Cancelado", Rotulos.RecusaNoIcone(SituacaoConvidado.NaoComparecera));
        Assert.All(PlanilhaConvites.Faixas, faixa => Assert.NotNull(Rotulos.Faixa(faixa)));
        Assert.All(PlanilhaConvites.Generos, genero => Assert.NotNull(Rotulos.Genero(genero)));

        Assert.Equal(9, PlanilhaConvites.Colunas.Length);
        Assert.Contains("Convidado principal *", PlanilhaConvites.Colunas);
        Assert.Equal("Nome do convite *", PlanilhaConvites.Colunas[0]);
        Assert.DoesNotContain("Mesa", PlanilhaConvites.Colunas);
        Assert.DoesNotContain("Custo/pagamento", PlanilhaConvites.Colunas);
    }

    [Fact]
    public void Principal_precisa_de_telefone_do_mesmo_convite()
    {
        Assert.False(ConviteRegras.PodeSerPrincipal(false, "11999999999"));
        Assert.False(ConviteRegras.PodeSerPrincipal(true, " "));
        Assert.True(ConviteRegras.PodeSerPrincipal(true, "11999999999"));
    }

    [Fact]
    public void Qr_e_um_png()
    {
        var png = new GeradorQr().Png("http://localhost/rsvp/abc");

        Assert.True(png.Length > 8);
        Assert.Equal(0x89, png[0]);
        Assert.Equal(0x50, png[1]);
        Assert.Equal(0x4E, png[2]);
        Assert.Equal(0x47, png[3]);
    }
}
