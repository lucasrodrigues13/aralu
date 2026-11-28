using Project.Domain.Comum;
namespace Project.Domain.Eventos;

/// <summary>Código pedido para abrir o link do cliente (SPEC-063 R3 e R4). Só o hash do código é guardado.</summary>
public sealed class CodigoAcessoCliente : ITemConta
{
    public Guid Id { get; set; }

    public Guid LinkId { get; set; }

    public Guid ContaId { get; set; }

    /// <summary>E-mail de destino, de um cliente vinculado ao evento.</summary>
    public string Email { get; set; } = "";

    public string CodigoHash { get; set; } = "";

    public DateTimeOffset CriadoEm { get; set; }

    public DateTimeOffset ExpiraEm { get; set; }

    public int Tentativas { get; set; }

    public DateTimeOffset? UsadoEm { get; set; }

    /// <summary>Um código válido por vez: pedir outro invalida este.</summary>
    public bool Invalidado { get; set; }
}

/// <summary>Sessão do link do cliente num navegador (SPEC-063 R6). Só o hash do token é guardado.</summary>
public sealed class SessaoLinkCliente : ITemConta
{
    public Guid Id { get; set; }

    public Guid LinkId { get; set; }

    public Guid ContaId { get; set; }

    public string TokenHash { get; set; } = "";

    public DateTimeOffset CriadaEm { get; set; }

    public DateTimeOffset ExpiraEm { get; set; }

    public DateTimeOffset UltimoAcesso { get; set; }
}

/// <summary>Regras de prazo e limite do código do link do cliente (SPEC-063 R4 a R6).</summary>
public static class RegrasAcessoCliente
{
    public const int Digitos = 6;

    public const int TentativasMaximas = 5;

    public const int PedidosAntesDaEspera = 3;

    public static readonly TimeSpan ValidadeCodigo = TimeSpan.FromMinutes(10);

    public static readonly TimeSpan IntervaloPedidos = TimeSpan.FromMinutes(2);

    public static readonly TimeSpan Espera = TimeSpan.FromMinutes(15);

    public static readonly TimeSpan ValidadeSessao = TimeSpan.FromDays(7);

    /// <summary>
    /// Quando o próximo pedido pode ser feito, dados os pedidos anteriores do link (em qualquer ordem).
    /// Nulo: pode pedir agora. <c>Espera</c> diz se é a espera longa (depois de 3 pedidos).
    /// </summary>
    public static (DateTimeOffset Liberado, bool Espera)? ProximoPedido(IEnumerable<DateTimeOffset> pedidos, DateTimeOffset agora)
    {
        var contagem = 0;
        DateTimeOffset? anterior = null;
        DateTimeOffset? liberadoEspera = null;
        foreach (var pedido in pedidos.OrderBy(item => item))
        {
            // A contagem recomeça depois da espera (ou de um intervalo tão longo quanto ela).
            if ((liberadoEspera is DateTimeOffset fim && pedido >= fim) || (anterior is DateTimeOffset antes && pedido - antes >= Espera))
            {
                contagem = 0;
                liberadoEspera = null;
            }

            contagem++;
            anterior = pedido;
            if (contagem >= PedidosAntesDaEspera)
            {
                liberadoEspera = pedido + Espera;
            }
        }

        if (liberadoEspera is DateTimeOffset espera && agora < espera)
        {
            return (espera, true);
        }

        return anterior is DateTimeOffset ultimo && agora < ultimo + IntervaloPedidos ? (ultimo + IntervaloPedidos, false) : null;
    }

    /// <summary>Mascara o e-mail para a página: "ana.souza@gmail.com" vira "an***@gmail.com".</summary>
    public static string Mascarar(string email)
    {
        var arroba = email.IndexOf('@');
        if (arroba <= 0)
        {
            return "***";
        }

        var usuario = email[..arroba];
        var visivel = usuario.Length <= 2 ? usuario[..1] : usuario[..2];
        return visivel + "***" + email[arroba..];
    }
}
