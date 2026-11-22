using Project.Domain.Convidados;

namespace Project.Tests.Negocio;

public class PrazoDoRsvpTests
{
    private static readonly DateOnly Prazo = new(2026, 12, 10);

    [Fact]
    public void Sem_prazo_nunca_expira()
    {
        Assert.False(PrazoDoRsvp.Expirado(null, new DateOnly(2030, 1, 1), false));
        Assert.False(PrazoDoRsvp.Encerrado(null, new DateOnly(2030, 1, 1)));
    }

    [Fact]
    public void No_dia_do_prazo_ainda_aceita()
    {
        Assert.False(PrazoDoRsvp.Expirado(Prazo, Prazo, false));
        Assert.False(PrazoDoRsvp.Expirado(Prazo, Prazo.AddDays(-5), false));
    }

    [Fact]
    public void No_dia_seguinte_expira()
    {
        Assert.True(PrazoDoRsvp.Expirado(Prazo, Prazo.AddDays(1), false));
        Assert.True(PrazoDoRsvp.Encerrado(Prazo, Prazo.AddDays(1)));
    }

    [Fact]
    public void Excecao_reabre_o_link_mas_nao_o_prazo_do_evento()
    {
        Assert.False(PrazoDoRsvp.Expirado(Prazo, Prazo.AddDays(30), true));
        Assert.True(PrazoDoRsvp.Encerrado(Prazo, Prazo.AddDays(30)));
    }
}
