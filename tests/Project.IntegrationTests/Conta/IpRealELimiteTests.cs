using System.Net;
using System.Net.Http.Json;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

// A06-001: o limite por IP usa o IP real do X-Forwarded-For e o login também é limitado por e-mail.
[Collection(ColecaoApi.Nome)]
public class IpRealELimiteTests
{
    private readonly BancoFixture _banco;

    public IpRealELimiteTests(BancoFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task Janela_separa_os_clientes_pelo_x_forwarded_for_da_rede_conhecida()
    {
        await using var fabrica = new FabricaApi(
            _banco.Conexao,
            loginPorMinuto: 2,
            ipConexao: "172.30.0.5",
            redeConhecida: "172.30.0.0/24");
        var cliente = fabrica.CreateClient();

        // Dois saltos: proxy da VPS (IP público do cliente) -> Caddy interno (172.30.0.9) -> API.
        for (var vez = 0; vez < 2; vez++)
        {
            var entrada = await Entrar(cliente, "203.0.113.10, 172.30.0.9");
            Assert.Equal(HttpStatusCode.Unauthorized, entrada.StatusCode);
        }

        var terceira = await Entrar(cliente, "203.0.113.10, 172.30.0.9");
        Assert.Equal(HttpStatusCode.TooManyRequests, terceira.StatusCode);

        var outroCliente = await Entrar(cliente, "198.51.100.20, 172.30.0.9");
        Assert.Equal(HttpStatusCode.Unauthorized, outroCliente.StatusCode);
    }

    [Fact]
    public async Task X_forwarded_for_de_rede_desconhecida_e_ignorado()
    {
        await using var fabrica = new FabricaApi(
            _banco.Conexao,
            loginPorMinuto: 2,
            ipConexao: "10.9.9.9",
            redeConhecida: "172.30.0.0/24");
        var cliente = fabrica.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await Entrar(cliente, "203.0.113.1")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Entrar(cliente, "203.0.113.2")).StatusCode);

        // Trocar o cabeçalho não gera cota nova: o IP considerado é o da conexão.
        var terceira = await Entrar(cliente, "203.0.113.3");
        Assert.Equal(HttpStatusCode.TooManyRequests, terceira.StatusCode);
    }

    [Fact]
    public async Task Sexta_tentativa_no_mesmo_email_responde_429_mesmo_com_ips_diferentes()
    {
        await using var fabrica = new FabricaApi(
            _banco.Conexao,
            loginPorEmail: 5,
            ipConexao: "172.30.0.5",
            redeConhecida: "172.30.0.0/24");
        var cliente = fabrica.CreateClient();
        var email = $"pessoa-{Guid.NewGuid():N}@aralu.test";

        for (var vez = 0; vez < 5; vez++)
        {
            var entrada = await Entrar(cliente, $"203.0.113.{vez + 1}", email);
            Assert.Equal(HttpStatusCode.Unauthorized, entrada.StatusCode);
        }

        // Variação de caixa e espaços cai na mesma partição (e-mail normalizado).
        var sexta = await Entrar(cliente, "203.0.113.99", "  " + email.ToUpperInvariant() + " ");
        Assert.Equal(HttpStatusCode.TooManyRequests, sexta.StatusCode);
        Assert.True(sexta.Headers.Contains("Retry-After"));
        Assert.Contains("não pode ser repetida agora", await sexta.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        var outroEmail = await Entrar(cliente, "203.0.113.99", $"pessoa-{Guid.NewGuid():N}@aralu.test");
        Assert.Equal(HttpStatusCode.Unauthorized, outroEmail.StatusCode);
    }

    private static Task<HttpResponseMessage> Entrar(HttpClient cliente, string encaminhado, string? email = null)
    {
        var pedido = new HttpRequestMessage(HttpMethod.Post, "/api/v1/conta/entrar")
        {
            Content = JsonContent.Create(new { email = email ?? $"pessoa-{Guid.NewGuid():N}@aralu.test", senha = "abcdefgh" }),
        };
        pedido.Headers.Add("X-Forwarded-For", encaminhado);
        return cliente.SendAsync(pedido);
    }
}
