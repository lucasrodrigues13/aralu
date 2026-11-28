using Project.Domain.Eventos;
using Project.Domain.Funil;

namespace Project.Tests.Negocio;

/// <summary>Limites do código do link do cliente (SPEC-063 R5) e validade da proposta (SPEC-064 R1).</summary>
public class AcessoLinkClienteRegrasTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Primeiro_pedido_e_liberado()
    {
        Assert.Null(RegrasAcessoCliente.ProximoPedido([], T0));
    }

    [Fact]
    public void Segundo_pedido_antes_de_2_minutos_espera_o_que_falta()
    {
        var bloqueio = RegrasAcessoCliente.ProximoPedido([T0], T0.AddSeconds(30));

        Assert.NotNull(bloqueio);
        Assert.False(bloqueio.Value.Espera);
        Assert.Equal(T0.AddMinutes(2), bloqueio.Value.Liberado);
        Assert.Null(RegrasAcessoCliente.ProximoPedido([T0], T0.AddMinutes(2)));
    }

    [Fact]
    public void Depois_de_3_pedidos_espera_15_minutos_e_a_contagem_recomeca()
    {
        DateTimeOffset[] pedidos = [T0, T0.AddMinutes(2), T0.AddMinutes(4)];

        var bloqueio = RegrasAcessoCliente.ProximoPedido(pedidos, T0.AddMinutes(10));
        Assert.NotNull(bloqueio);
        Assert.True(bloqueio.Value.Espera);
        Assert.Equal(T0.AddMinutes(19), bloqueio.Value.Liberado);

        Assert.Null(RegrasAcessoCliente.ProximoPedido(pedidos, T0.AddMinutes(19)));
        // Depois da espera, mais dois pedidos não bloqueiam pela espera longa.
        DateTimeOffset[] depois = [.. pedidos, T0.AddMinutes(19), T0.AddMinutes(21)];
        Assert.Null(RegrasAcessoCliente.ProximoPedido(depois, T0.AddMinutes(23)));
    }

    [Theory]
    [InlineData("ana.souza@gmail.com", "an***@gmail.com")]
    [InlineData("a@x.com", "a***@x.com")]
    [InlineData("invalido", "***")]
    public void Mascara_o_email(string email, string esperado)
    {
        Assert.Equal(esperado, RegrasAcessoCliente.Mascarar(email));
    }

    [Fact]
    public void Proposta_vale_ate_o_fim_do_ultimo_dia_em_Brasilia()
    {
        // Enviada em 10/03 às 15h de Brasília, com 7 dias: vale até 17/03 inclusive.
        var envio = new DateTimeOffset(2027, 3, 10, 15, 0, 0, TimeSpan.FromHours(-3));

        var ate = OrcamentoFunil.ValidoAteDe(envio, 7);

        Assert.Equal(new DateTimeOffset(2027, 3, 18, 0, 0, 0, TimeSpan.FromHours(-3)), ate);
        Assert.Equal(new DateOnly(2027, 3, 17), OrcamentoFunil.UltimoDiaDe(ate));
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(180, true)]
    [InlineData(181, false)]
    public void Validade_vai_de_1_a_180_dias(int dias, bool valido)
    {
        Assert.Equal(valido, OrcamentoFunil.DiasValidos(dias));
    }
}
