using Project.Domain.Eventos;
using Project.Infrastructure.Eventos;

namespace Project.Tests.Negocio;

public class ImportacaoTarefasModeloTests
{
    [Fact]
    public void Texto_com_titulos_marcadores_e_prazos_gera_previa()
    {
        var texto = """
            Cerimônia:
            - Reservar igreja (6 semanas)
            * Confirmar padrinhos (30 dias)
            • Ensaio (no dia)

            RECEPÇÃO
            1. Contratar buffet (2 meses)
            1) Contratar buffet (2 meses)
            [ ] Testar som (10 dias)
            [x] Lista de presentes
            """;

        var resultado = ImportacaoTarefasModelo.LerTexto(texto);

        Assert.Equal(6, resultado.Tarefas.Count);
        Assert.Equal(("Reservar igreja", "Cerimônia", 42), (
            resultado.Tarefas[0].Titulo, resultado.Tarefas[0].Grupo, resultado.Tarefas[0].DiasAntes));
        Assert.Equal(("Confirmar padrinhos", "Cerimônia", 30), (
            resultado.Tarefas[1].Titulo, resultado.Tarefas[1].Grupo, resultado.Tarefas[1].DiasAntes));
        Assert.Equal(("Ensaio", "Cerimônia", 0), (
            resultado.Tarefas[2].Titulo, resultado.Tarefas[2].Grupo, resultado.Tarefas[2].DiasAntes));
        Assert.Equal(("Contratar buffet", "RECEPÇÃO", 60), (
            resultado.Tarefas[3].Titulo, resultado.Tarefas[3].Grupo, resultado.Tarefas[3].DiasAntes));
        Assert.Equal(("Testar som", "RECEPÇÃO", 10), (
            resultado.Tarefas[4].Titulo, resultado.Tarefas[4].Grupo, resultado.Tarefas[4].DiasAntes));
        Assert.Equal(("Lista de presentes", "RECEPÇÃO", null), (
            resultado.Tarefas[5].Titulo, resultado.Tarefas[5].Grupo, resultado.Tarefas[5].DiasAntes));
    }

    [Fact]
    public void Linhas_vazias_e_repetidas_sao_tratadas()
    {
        var resultado = ImportacaoTarefasModelo.LerTexto("""
            Documentos:
            - Tirar RG
            - Tirar RG

            - Tirar RG
            """);

        Assert.Single(resultado.Tarefas);
        Assert.Equal("Tirar RG", resultado.Tarefas[0].Titulo);
        Assert.Equal("Documentos", resultado.Tarefas[0].Grupo);
    }

    [Fact]
    public void Titulo_longo_e_cortado_com_aviso()
    {
        var longo = new string('A', 250);
        var resultado = ImportacaoTarefasModelo.LerTexto($"- {longo} (7 dias)");

        Assert.Single(resultado.Tarefas);
        Assert.Equal(200, resultado.Tarefas[0].Titulo.Length);
        Assert.Equal(7, resultado.Tarefas[0].DiasAntes);
        Assert.Contains("200", resultado.Tarefas[0].Aviso);
    }

    [Fact]
    public void Planilha_com_cabecalho_fora_de_ordem()
    {
        var linhas = new (string?, string?, string?)[]
        {
            ("Cerimônia", "Reservar igreja", "6 semanas"),
            (null, "Confirmar", "amanhã"),
        };

        var resultado = ImportacaoTarefasModelo.LerPlanilha(linhas);

        Assert.Equal(2, resultado.Tarefas.Count);
        Assert.Equal(42, resultado.Tarefas[0].DiasAntes);
        Assert.Null(resultado.Tarefas[1].DiasAntes);
        Assert.Contains("ilegível", resultado.Tarefas[1].Aviso, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Planilha_sem_coluna_tarefa_falha()
    {
        Assert.False(PlanilhaTarefasModelo.TentarMapearCabecalho(
            ["Grupo", "Prazo"], out _, out _, out _, out var erro));
        Assert.Contains("Tarefa", erro);
    }

    [Fact]
    public void Planilha_padrao_xlsx_importa_igual_ao_texto()
    {
        var planilha = new PlanilhaTarefasExcel();
        using var livro = new ClosedXML.Excel.XLWorkbook();
        var aba = livro.AddWorksheet("Tarefas");
        aba.Cell(1, 1).Value = "Prazo";
        aba.Cell(1, 2).Value = "Tarefa";
        aba.Cell(1, 3).Value = "Grupo";
        aba.Cell(2, 1).Value = "6 semanas";
        aba.Cell(2, 2).Value = "Reservar igreja";
        aba.Cell(2, 3).Value = "Cerimônia";
        aba.Cell(3, 1).Value = "2 meses";
        aba.Cell(3, 2).Value = "Contratar buffet";
        aba.Cell(3, 3).Value = "Recepção";
        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        memoria.Position = 0;

        var lido = planilha.Ler(memoria, "tarefas.xlsx");

        Assert.True(lido.Ok);
        Assert.Equal(2, lido.Valor!.Tarefas.Count);
        Assert.Equal(("Reservar igreja", "Cerimônia", 42), (
            lido.Valor.Tarefas[0].Titulo, lido.Valor.Tarefas[0].Grupo, lido.Valor.Tarefas[0].DiasAntes));
        Assert.Equal(("Contratar buffet", "Recepção", 60), (
            lido.Valor.Tarefas[1].Titulo, lido.Valor.Tarefas[1].Grupo, lido.Valor.Tarefas[1].DiasAntes));
    }

    [Fact]
    public void Modelo_da_planilha_tem_tres_colunas()
    {
        var bytes = new PlanilhaTarefasExcel().Modelo();
        using var leitura = new MemoryStream(bytes);
        var lido = new PlanilhaTarefasExcel().Ler(leitura, "modelo.xlsx");
        Assert.True(lido.Ok);
        Assert.Empty(lido.Valor!.Tarefas);
        Assert.Equal(3, PlanilhaTarefasModelo.Colunas.Length);
    }

    [Theory]
    [InlineData("30 dias", 30)]
    [InlineData("6 semanas", 42)]
    [InlineData("2 meses", 60)]
    [InlineData("no dia", 0)]
    [InlineData("1 mês antes", 30)]
    public void TentarLer_prazo_em_texto(string texto, int esperado)
    {
        Assert.True(PrazoModelo.TentarLer(texto, out var dias));
        Assert.Equal(esperado, dias);
    }
}
