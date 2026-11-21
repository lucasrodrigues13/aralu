using Project.Domain.Tarefas;

namespace Project.Tests.Negocio;

public class PrazoDoItemTests
{
    [Fact]
    public void Item_aberto_com_prazo_anda_com_a_data_do_evento()
    {
        var item = new ItemChecklistTarefa { Prazo = new DateOnly(2027, 5, 1) };
        Assert.True(item.DeslocarPrazo(10));
        Assert.Equal(new DateOnly(2027, 5, 11), item.Prazo);
    }

    [Fact]
    public void Item_feito_cancelado_ou_sem_prazo_nao_muda()
    {
        var feito = new ItemChecklistTarefa { Prazo = new DateOnly(2027, 5, 1), Feito = true };
        var cancelado = new ItemChecklistTarefa { Prazo = new DateOnly(2027, 5, 1), Cancelado = true };
        var semPrazo = new ItemChecklistTarefa();
        Assert.False(feito.DeslocarPrazo(10));
        Assert.False(cancelado.DeslocarPrazo(10));
        Assert.False(semPrazo.DeslocarPrazo(10));
        Assert.Equal(new DateOnly(2027, 5, 1), feito.Prazo);
        Assert.Equal(new DateOnly(2027, 5, 1), cancelado.Prazo);
        Assert.Null(semPrazo.Prazo);
    }

    [Fact]
    public void Data_do_evento_adiantada_puxa_o_prazo_para_antes()
    {
        var item = new ItemChecklistTarefa { Prazo = new DateOnly(2027, 5, 11) };
        item.DeslocarPrazo(-10);
        Assert.Equal(new DateOnly(2027, 5, 1), item.Prazo);
    }
}
