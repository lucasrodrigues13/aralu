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
    public void Modelo_traz_a_aba_de_exemplo_que_nao_e_importada()
    {
        var planilha = new PlanilhaExcel();
        using var livro = new ClosedXML.Excel.XLWorkbook(new MemoryStream(planilha.Modelo()));

        Assert.Equal(["Convidados", "Exemplo"], livro.Worksheets.Select(aba => aba.Name));
        var exemplo = livro.Worksheet("Exemplo");
        Assert.Equal("Família Souza", exemplo.Cell(2, 1).GetString());
        Assert.Equal("11999990000", exemplo.Cell(2, 3).GetString());
        Assert.Equal("Família Souza", exemplo.Cell(3, 1).GetString());
        Assert.Equal("", exemplo.Cell(3, 3).GetString());

        // O exemplo serve de referência; a importação lê só a primeira aba.
        Assert.Empty(planilha.Ler(new MemoryStream(planilha.Modelo()), "modelo.xlsx").Valor!);
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
    public void Planilha_free_vira_gratuita_e_o_modelo_tem_10_colunas()
    {
        Assert.Equal(CustoConvidado.Gratuita, Rotulos.Custo("Free"));
        Assert.Equal(SituacaoConvidado.NaoComparecera, Rotulos.Situacao("Não comparecerá"));
        Assert.Equal("Cancelado", Rotulos.RecusaNoIcone(SituacaoConvidado.NaoComparecera));

        var planilha = new PlanilhaExcel();
        var bytes = planilha.Modelo();
        using var leitura = new MemoryStream(bytes);
        var linhas = planilha.Ler(leitura, "convidados.xlsx");

        Assert.True(linhas.Ok);
        Assert.Empty(linhas.Valor!);
        Assert.Equal(10, PlanilhaConvites.Colunas.Length);
        Assert.Equal("Nome do convite *", PlanilhaConvites.Colunas[0]);
        Assert.Equal("Mesa", PlanilhaConvites.Colunas[9]);
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
