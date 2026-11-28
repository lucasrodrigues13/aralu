using Project.Domain.Tarefas;

namespace Project.Tests.Negocio;

public class GruposDePrazoTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 18);

    [Fact]
    public void Concluida_vai_para_feitas()
    {
        var grupo = GruposDePrazo.Classificar(SituacaoTarefa.Concluida, Hoje, Hoje, Hoje);

        Assert.Equal(GrupoPrazo.Feitas, grupo);
    }

    [Fact]
    public void Sem_prazo_fica_sem_prazo()
    {
        var grupo = GruposDePrazo.Classificar(SituacaoTarefa.Pendente, null, Hoje, Hoje);

        Assert.Equal(GrupoPrazo.SemPrazo, grupo);
    }

    [Fact]
    public void Prazo_ate_domingo_entra_nesta_semana()
    {
        Assert.Equal(new DateOnly(2026, 11, 22), GruposDePrazo.Domingo(Hoje));
        Assert.Equal(GrupoPrazo.EstaSemana, GruposDePrazo.Classificar(SituacaoTarefa.Pendente, Hoje, Hoje, Hoje));
        Assert.Equal(GrupoPrazo.EstaSemana, GruposDePrazo.Classificar(SituacaoTarefa.Pendente, new DateOnly(2026, 11, 22), Hoje, Hoje));
        Assert.Equal(GrupoPrazo.Depois, GruposDePrazo.Classificar(SituacaoTarefa.Pendente, new DateOnly(2026, 11, 23), Hoje, Hoje));
    }

    [Fact]
    public void Prazo_anterior_a_criacao_do_evento_vai_para_conferir()
    {
        var grupo = GruposDePrazo.Classificar(SituacaoTarefa.Pendente, new DateOnly(2026, 11, 1), new DateOnly(2026, 11, 18), Hoje);

        Assert.Equal(GrupoPrazo.ParaConferir, grupo);
    }

    [Fact]
    public void Prazo_vencido_depois_da_criacao_nao_entra_em_grupo()
    {
        var grupo = GruposDePrazo.Classificar(SituacaoTarefa.Pendente, new DateOnly(2026, 11, 17), new DateOnly(2026, 11, 1), Hoje);

        Assert.Null(grupo);
    }

    [Fact]
    public void Domingo_como_hoje_so_inclui_o_proprio_dia_nesta_semana()
    {
        var domingo = new DateOnly(2026, 11, 22);

        Assert.Equal(domingo, GruposDePrazo.Domingo(domingo));
        Assert.Equal(GrupoPrazo.EstaSemana, GruposDePrazo.Classificar(SituacaoTarefa.Pendente, domingo, domingo, domingo));
    }
}
