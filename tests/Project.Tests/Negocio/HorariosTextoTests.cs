using Project.Domain.Funil;

namespace Project.Tests.Negocio;

public class HorariosTextoTests
{
    [Fact]
    public void Converte_texto_livre_com_palavras_chave()
    {
        var resultado = HorariosTexto.Interpretar("Convite 15:30, Cerimônia 16h, recepção 18h30 e festa 20:00");

        Assert.Equal(new TimeOnly(15, 30), resultado.Convite);
        Assert.Equal(new TimeOnly(16, 0), resultado.Cerimonia);
        Assert.Equal(new TimeOnly(18, 30), resultado.Recepcao);
        Assert.Equal(new TimeOnly(20, 0), resultado.Festa);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("à tarde")]
    [InlineData("16h")]
    [InlineData("cerimônia 25h")]
    public void Ignora_texto_sem_horario_reconhecivel(string? texto)
    {
        Assert.False(HorariosTexto.Interpretar(texto).TemAlgum);
    }

    [Fact]
    public void Mantem_o_primeiro_horario_de_cada_campo()
    {
        var resultado = HorariosTexto.Interpretar("festa 21h; festa 23h");

        Assert.Equal(new TimeOnly(21, 0), resultado.Festa);
    }
}
