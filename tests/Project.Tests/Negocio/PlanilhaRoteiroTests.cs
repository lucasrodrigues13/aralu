using Project.Domain.Modelos;

namespace Project.Tests.Negocio;

public class PlanilhaRoteiroTests
{
    private static readonly string?[] Cabecalho = ["Momento *", "Horário", "Música", "Item"];

    private static LeituraPlanilhaRoteiro Ler(params string?[][] linhas) =>
        PlanilhaRoteiro.Interpretar([Cabecalho, .. linhas]);

    [Fact]
    public void Agrupa_itens_por_momento_e_pega_horario_e_musica_de_qualquer_linha()
    {
        var leitura = Ler(
            ["Chegada", "15:30", null, "Checar alianças"],
            ["Entrada da noiva", null, null, "Checar véu"],
            ["chegada", null, "Coral", "Checar microfone"],
            ["Entrada da noiva", "16h", null, null]);

        Assert.Empty(leitura.Erros);
        Assert.Equal(2, leitura.Momentos.Count);
        Assert.Equal(new TimeOnly(15, 30), leitura.Momentos[0].Horario);
        Assert.Equal("Coral", leitura.Momentos[0].Musica);
        Assert.Equal(["Checar alianças", "Checar microfone"], leitura.Momentos[0].Itens);
        Assert.Equal(new TimeOnly(16, 0), leitura.Momentos[1].Horario);
        Assert.Equal(["Checar véu"], leitura.Momentos[1].Itens);
    }

    [Fact]
    public void Aceita_momento_sem_itens()
    {
        var leitura = Ler(["Saída dos noivos", null, null, null]);

        Assert.Empty(leitura.Erros);
        Assert.Empty(Assert.Single(leitura.Momentos).Itens);
    }

    [Fact]
    public void Recusa_horario_invalido_exemplo_e_momento_vazio()
    {
        var leitura = Ler(
            ["Chegada", "meio-dia", null, "Item"],
            ["Chegada (exemplo)", null, null, "Item"],
            [null, null, null, "Item solto"]);

        Assert.Empty(leitura.Momentos);
        Assert.Equal(
            ["Linha 2: horário inválido. Use o formato 15:30.", "Linha 3: apague as linhas de exemplo antes de importar.", "Linha 4: informe o momento."],
            leitura.Erros);
    }

    [Fact]
    public void Exige_coluna_momento()
    {
        var leitura = PlanilhaRoteiro.Interpretar([["Item"], ["Algo"]]);

        Assert.Equal(["A aba Roteiro precisa da coluna Momento. Use a planilha modelo."], leitura.Erros);
    }
}
