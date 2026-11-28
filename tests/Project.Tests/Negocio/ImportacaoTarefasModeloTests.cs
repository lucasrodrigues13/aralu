using Project.Domain.Eventos;
using Project.Domain.Tarefas;
using Project.Infrastructure.Eventos;

namespace Project.Tests.Negocio;

/// <summary>Leitura da lista colada e da planilha (SPEC-012 v3 §8.6 e §8.7).</summary>
public class ImportacaoTarefasModeloTests
{
    [Fact]
    public void Texto_com_titulos_de_servico_marcadores_e_prazos()
    {
        var texto = """
            Buffet:
            - Pedir orçamentos (6 semanas)
            * Degustação (30 dias antes)
            • Conferir montagem (no dia)

            FOTOGRAFIA
            1. Escolher fotógrafo (2 meses)
            1) Escolher fotógrafo (2 meses)
            [ ] Pedir álbum (2 semanas depois)
            [x] Lista de fotos
            """;

        var resultado = ImportacaoTarefasModelo.LerTexto(texto, aceitaData: false);

        Assert.Equal(6, resultado.Tarefas.Count);
        Assert.Equal(("Pedir orçamentos", "Buffet", -42), (resultado.Tarefas[0].Titulo, resultado.Tarefas[0].Servico, resultado.Tarefas[0].PrazoRelativo));
        Assert.Equal(("Degustação", "Buffet", -30), (resultado.Tarefas[1].Titulo, resultado.Tarefas[1].Servico, resultado.Tarefas[1].PrazoRelativo));
        Assert.Equal(("Conferir montagem", "Buffet", 0), (resultado.Tarefas[2].Titulo, resultado.Tarefas[2].Servico, resultado.Tarefas[2].PrazoRelativo));
        Assert.Equal(("Escolher fotógrafo", "FOTOGRAFIA", -60), (resultado.Tarefas[3].Titulo, resultado.Tarefas[3].Servico, resultado.Tarefas[3].PrazoRelativo));
        Assert.Equal(("Pedir álbum", "FOTOGRAFIA", 14), (resultado.Tarefas[4].Titulo, resultado.Tarefas[4].Servico, resultado.Tarefas[4].PrazoRelativo));
        Assert.Equal(("Lista de fotos", "FOTOGRAFIA", (int?)null), (resultado.Tarefas[5].Titulo, resultado.Tarefas[5].Servico, resultado.Tarefas[5].PrazoRelativo));
    }

    [Fact]
    public void Repetida_no_mesmo_servico_entra_uma_vez_e_em_outro_servico_entra_de_novo()
    {
        var resultado = ImportacaoTarefasModelo.LerTexto("""
            Buffet:
            - Pedir orçamento
            - pedir ORÇAMENTO
            Fotografia:
            - Pedir orçamento
            """, aceitaData: false);

        Assert.Equal(2, resultado.Tarefas.Count);
        Assert.Equal(new[] { "Buffet", "Fotografia" }, resultado.Tarefas.Select(item => item.Servico).ToArray());
    }

    [Fact]
    public void Data_exata_so_vale_no_evento()
    {
        var noEvento = ImportacaoTarefasModelo.LerTexto("- Pagar sinal (15/03/2027)", aceitaData: true);
        Assert.Equal(new DateOnly(2027, 3, 15), noEvento.Tarefas[0].PrazoData);
        Assert.Null(noEvento.Tarefas[0].PrazoRelativo);

        var noModelo = ImportacaoTarefasModelo.LerTexto("- Pagar sinal (15/03/2027)", aceitaData: false);
        Assert.Null(noModelo.Tarefas[0].PrazoData);
        Assert.Contains("relativo", noModelo.Tarefas[0].Avisos.Single());
    }

    [Fact]
    public void Titulo_longo_e_cortado_com_aviso()
    {
        var resultado = ImportacaoTarefasModelo.LerTexto($"- {new string('A', 250)} (7 dias)", aceitaData: false);

        Assert.Equal(200, resultado.Tarefas[0].Titulo.Length);
        Assert.Equal(-7, resultado.Tarefas[0].PrazoRelativo);
        Assert.Contains(resultado.Tarefas[0].Avisos, aviso => aviso.Contains("200"));
    }

    [Fact]
    public void Planilha_le_todas_as_colunas()
    {
        var resultado = ImportacaoTarefasModelo.LerPlanilha(
            new[]
            {
                new LinhaPlanilhaTarefa("Reservar igreja", "Cerimônia", "6 semanas", "Organizador; Cliente", "Alta", "Ver horários"),
                new LinhaPlanilhaTarefa("Confirmar", null, "amanhã", null, "urgente", null),
            },
            aceitaData: false);

        var primeira = resultado.Tarefas[0];
        Assert.Equal(("Cerimônia", -42, PrioridadeTarefa.Alta, "Ver horários"), (primeira.Servico, primeira.PrazoRelativo, primeira.Prioridade, primeira.Descricao));
        Assert.Equal(new[] { "Organizador", "Cliente" }, primeira.Responsaveis.ToArray());
        var segunda = resultado.Tarefas[1];
        Assert.Null(segunda.PrazoRelativo);
        Assert.Null(segunda.Prioridade);
        Assert.Contains("Prazo não reconhecido.", segunda.Avisos);
        Assert.Contains("Prioridade não reconhecida.", segunda.Avisos);
    }

    [Fact]
    public void Cabecalho_fora_de_ordem_sem_acento_e_grupo_antigo_como_servico()
    {
        Assert.True(PlanilhaTarefasModelo.TentarMapearCabecalho(new[] { "Prazo", "Grupo", "TAREFA", "Responsaveis", "Descricao" }, out var colunas, out _));
        Assert.Equal(new ColunasPlanilhaTarefas(2, 1, 0, 3, null, 4), colunas);
    }

    [Fact]
    public void Planilha_sem_coluna_tarefa_falha()
    {
        Assert.False(PlanilhaTarefasModelo.TentarMapearCabecalho(new[] { "Serviço", "Prazo" }, out _, out var erro));
        Assert.Contains("Tarefa", erro);
    }

    [Fact]
    public void Planilha_xlsx_importa_igual_ao_texto()
    {
        using var livro = new ClosedXML.Excel.XLWorkbook();
        var aba = livro.AddWorksheet("Tarefas");
        aba.Cell(1, 1).Value = "Prazo";
        aba.Cell(1, 2).Value = "Tarefa";
        aba.Cell(1, 3).Value = "Serviço";
        aba.Cell(2, 1).Value = "6 semanas";
        aba.Cell(2, 2).Value = "Reservar igreja";
        aba.Cell(2, 3).Value = "Cerimônia";
        aba.Cell(3, 1).Value = "2 meses depois";
        aba.Cell(3, 2).Value = "Pedir depoimento";
        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        memoria.Position = 0;

        var lido = new PlanilhaTarefasExcel().Ler(memoria, "tarefas.xlsx", aceitaData: false);

        Assert.True(lido.Ok);
        Assert.Equal(("Reservar igreja", "Cerimônia", -42), (lido.Valor!.Tarefas[0].Titulo, lido.Valor.Tarefas[0].Servico, lido.Valor.Tarefas[0].PrazoRelativo));
        Assert.Equal(("Pedir depoimento", (string?)null, 60), (lido.Valor.Tarefas[1].Titulo, lido.Valor.Tarefas[1].Servico, lido.Valor.Tarefas[1].PrazoRelativo));
    }

    [Fact]
    public void Planilha_modelo_tem_as_seis_colunas_e_exemplos_legiveis()
    {
        using var leitura = new MemoryStream(new PlanilhaTarefasExcel().Modelo());
        var lido = new PlanilhaTarefasExcel().Ler(leitura, "modelo.xlsx", aceitaData: false);

        Assert.True(lido.Ok);
        Assert.Equal(6, PlanilhaTarefasModelo.Colunas.Length);
        Assert.Equal(3, lido.Valor!.Tarefas.Count);
        Assert.All(lido.Valor.Tarefas, tarefa => Assert.Empty(tarefa.Avisos));
    }

    [Theory]
    [InlineData("30 dias", -30)]
    [InlineData("6 semanas", -42)]
    [InlineData("6 semanas antes", -42)]
    [InlineData("2 meses", -60)]
    [InlineData("1 mês antes do evento", -30)]
    [InlineData("2 semanas depois", 14)]
    [InlineData("no dia", 0)]
    public void Prazo_relativo_em_texto(string texto, int esperado)
    {
        Assert.True(PrazoModelo.TentarLerPrazo(texto, aceitaData: false, out var relativo, out var data));
        Assert.Equal(esperado, relativo);
        Assert.Null(data);
    }

    [Theory]
    [InlineData(null, "Sem prazo")]
    [InlineData(0, "No dia do evento")]
    [InlineData(-42, "6 semanas antes")]
    [InlineData(-180, "6 meses antes")]
    [InlineData(-10, "10 dias antes")]
    [InlineData(14, "2 semanas depois")]
    [InlineData(30, "1 mês depois")]
    public void Exibir_prazo_relativo(int? deslocamento, string esperado)
    {
        Assert.Equal(esperado, PrazoModelo.ExibirRelativo(deslocamento));
    }

    [Fact]
    public void Prazo_efetivo_acompanha_a_data_do_evento()
    {
        Assert.Equal(new DateOnly(2027, 5, 9), PrazosRelativos.Efetivo(new DateOnly(2027, 6, 20), -42));
        Assert.Null(PrazosRelativos.Efetivo(null, -42));
        Assert.Equal(-42, PrazosRelativos.DeDataExata(new DateOnly(2027, 6, 20), new DateOnly(2027, 5, 9)));
        Assert.Equal(3, PrazosRelativos.DeDataExata(new DateOnly(2027, 6, 20), new DateOnly(2027, 6, 23)));
    }
}
