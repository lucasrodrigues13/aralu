using ClosedXML.Excel;
using Project.Domain.Modelos;
using Project.Infrastructure.Modelos;

namespace Project.Tests.Negocio;

/// <summary>Leitura da planilha de briefing: uma pergunta por linha, agrupada pela seção.</summary>
public class PlanilhaBriefingTests
{
    private static IReadOnlyList<IReadOnlyList<string?>> Linhas(params string?[][] linhas) => linhas;

    [Fact]
    public void Agrupa_perguntas_pela_secao_na_ordem_da_planilha()
    {
        var leitura = PlanilhaBriefing.Interpretar(Linhas(
            ["Pergunta *", "Seção *", "Descrição da seção"],
            ["Nome da noiva", "Conhecendo a noiva", ""],
            ["Nome do noivo", "Conhecendo o noivo", "Sobre ele"],
            ["", "", ""],
            ["Idade da noiva", "conhecendo a NOIVA", "Sobre ela"]));

        Assert.Empty(leitura.Erros);
        Assert.Equal(2, leitura.Secoes.Count);
        Assert.Equal("Conhecendo a noiva", leitura.Secoes[0].Titulo);
        Assert.Equal("Sobre ela", leitura.Secoes[0].Descricao);
        Assert.Equal(["Nome da noiva", "Idade da noiva"], leitura.Secoes[0].Perguntas);
        Assert.Equal(["Nome do noivo"], leitura.Secoes[1].Perguntas);
    }

    [Fact]
    public void Junta_todos_os_erros_com_a_linha_e_nao_devolve_secoes()
    {
        var leitura = PlanilhaBriefing.Interpretar(Linhas(
            ["Seção *", "Pergunta *"],
            ["Casal (exemplo)", "Como se conheceram?"],
            ["", "Sem seção"],
            ["Casal", ""],
            ["Casal", "Ok"]));

        Assert.Empty(leitura.Secoes);
        Assert.Equal(
            ["Linha 2: apague as linhas de exemplo antes de importar.", "Linha 3: informe a seção.", "Linha 4: informe a pergunta."],
            leitura.Erros);
    }

    [Fact]
    public void Recusa_cabecalho_sem_as_colunas_obrigatorias()
    {
        var leitura = PlanilhaBriefing.Interpretar(Linhas(["Título", "Texto"], ["a", "b"]));
        Assert.Single(leitura.Erros);
    }

    [Fact]
    public void Modelo_baixado_so_tem_exemplos_e_eles_sao_recusados()
    {
        var planilha = new PlanilhaBriefingExcel();
        using var fluxo = new MemoryStream(planilha.Modelo());
        using (var livro = new XLWorkbook(fluxo))
        {
            Assert.True(livro.Worksheets.Contains(PlanilhaBriefing.AbaBriefing));
        }

        fluxo.Position = 0;
        var lido = planilha.Ler(fluxo, "briefing.xlsx");
        Assert.True(lido.Ok);
        Assert.Equal(PlanilhaBriefing.Exemplos.Length, lido.Valor!.Erros.Count);
    }
}
