using Project.Domain.Modelos;

namespace Project.Tests.Negocio;

public class PlanilhaCronogramaTests
{
    private static readonly string?[] Cabecalho = ["Item *", "Descrição", "Data", "Hora", "Responsável", "Recado aos fornecedores"];

    private static LeituraPlanilhaCronograma Ler(params string?[][] linhas) =>
        PlanilhaCronograma.Interpretar([Cabecalho, .. linhas]);

    [Fact]
    public void Le_um_item_por_linha_na_ordem()
    {
        var leitura = Ler(
            ["Entrega das flores", "Quais flores?", null, "08:00", "organizador", "Entrada lateral"],
            ["Chegada do buffet", null, "25/12/2026", "14h", "Cliente", null]);

        Assert.Empty(leitura.Erros);
        Assert.Equal(2, leitura.Itens.Count);
        Assert.Equal(new("Entrega das flores", "Quais flores?", null, new TimeOnly(8, 0), "Organizer", "Entrada lateral"), leitura.Itens[0]);
        Assert.Equal(new DateOnly(2026, 12, 25), leitura.Itens[1].Data);
        Assert.Equal("Cliente", leitura.Itens[1].Responsavel);
    }

    [Fact]
    public void Recusa_responsavel_fora_dos_papeis_data_e_hora_invalidas()
    {
        var leitura = Ler(
            ["Item", null, null, null, "Fotógrafo", null],
            ["Item", null, "amanhã", null, null, null],
            ["Item", null, null, "cedo", null, null],
            ["Flores (exemplo)", null, null, null, null, null]);

        Assert.Empty(leitura.Itens);
        Assert.Equal(
        [
            "Linha 2: responsável deve ser Organizador, Assistente ou Cliente.",
            "Linha 3: data inválida. Use o formato 25/12/2026.",
            "Linha 4: hora inválida. Use o formato 15:30.",
            "Linha 5: apague as linhas de exemplo antes de importar.",
        ], leitura.Erros);
    }

    [Theory]
    [InlineData("Organizador", "Organizer")]
    [InlineData("Organizer", "Organizer")]
    [InlineData(" assistente ", "Assistente")]
    [InlineData("CLIENTE", "Cliente")]
    [InlineData("Equipe", null)]
    [InlineData(null, null)]
    public void Normaliza_responsavel(string? texto, string? esperado) =>
        Assert.Equal(esperado, ResponsaveisCronograma.Normalizar(texto));
}
