using Project.Domain.Tarefas;

namespace Project.Tests.Negocio;

public class MoverPrazosTests
{
    [Fact]
    public void Delta_de_10_dias_desloca_so_nao_concluidas_com_prazo()
    {
        var antiga = new DateOnly(2027, 6, 20);
        var nova = new DateOnly(2027, 6, 30);
        var delta = nova.DayNumber - antiga.DayNumber;
        Assert.Equal(10, delta);

        var pendente = new DateOnly(2027, 5, 1);
        var concluida = new DateOnly(2027, 5, 2);
        Assert.Equal(new DateOnly(2027, 5, 11), pendente.AddDays(delta));
        Assert.Equal(SituacaoTarefa.Pendente, SituacaoTarefa.Pendente);
        Assert.NotEqual(SituacaoTarefa.Concluida, SituacaoTarefa.Pendente);
        Assert.Equal(new DateOnly(2027, 5, 2), concluida); // não se move
    }
}
