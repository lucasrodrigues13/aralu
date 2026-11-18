using Project.Application.Negocio;
using Project.Domain.Tarefas;

namespace Project.Tests.Negocio;

public class HojeRegrasTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 18);

    [Fact]
    public void Pede_hoje_so_tarefa_ativa_com_prazo_hoje()
    {
        var evento = Guid.NewGuid();
        Assert.True(HojeRegras.PedeHoje(new TarefaHojeDado(evento, Hoje, SituacaoTarefa.Pendente), Hoje));
        Assert.True(HojeRegras.PedeHoje(new TarefaHojeDado(evento, Hoje, SituacaoTarefa.EmAndamento), Hoje));
        Assert.False(HojeRegras.PedeHoje(new TarefaHojeDado(evento, Hoje, SituacaoTarefa.Concluida), Hoje));
        Assert.False(HojeRegras.PedeHoje(new TarefaHojeDado(evento, Hoje.AddDays(1), SituacaoTarefa.Pendente), Hoje));
    }

    [Fact]
    public void Atrasada_por_prazo_vencido_ou_marcada()
    {
        var evento = Guid.NewGuid();
        Assert.True(HojeRegras.Atrasada(new TarefaHojeDado(evento, Hoje.AddDays(-1), SituacaoTarefa.Pendente), Hoje));
        Assert.True(HojeRegras.Atrasada(new TarefaHojeDado(evento, null, SituacaoTarefa.Atrasada), Hoje));
        Assert.False(HojeRegras.Atrasada(new TarefaHojeDado(evento, Hoje.AddDays(-1), SituacaoTarefa.Concluida), Hoje));
    }

    [Fact]
    public void Respostas_abaixo_com_menos_de_dois_meses_e_metade_sem_resposta()
    {
        Assert.True(HojeRegras.RespostasAbaixo(Hoje.AddDays(30), Hoje, total: 100, pendentes: 50));
        Assert.False(HojeRegras.RespostasAbaixo(Hoje.AddDays(30), Hoje, total: 100, pendentes: 49));
        Assert.False(HojeRegras.RespostasAbaixo(Hoje.AddMonths(2), Hoje, total: 100, pendentes: 90));
        Assert.False(HojeRegras.RespostasAbaixo(Hoje.AddDays(30), Hoje, total: 0, pendentes: 0));
        Assert.False(HojeRegras.RespostasAbaixo(null, Hoje, total: 10, pendentes: 10));
    }
}
