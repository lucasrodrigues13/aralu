using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

/// <summary>Lote 5 (A06-002): honeypot, limites de tamanho e rate limit do lead público.</summary>
[Collection(ColecaoApi.Nome)]
public class LeadPublicoSegurancaTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public LeadPublicoSegurancaTests(BancoFixture banco) => _banco = banco;

    private static long Ha(int segundos) => DateTimeOffset.UtcNow.AddSeconds(-segundos).ToUnixTimeMilliseconds();

    [Fact]
    public async Task Honeypot_preenchido_responde_201_e_nao_grava()
    {
        var dono = await Entrar(_banco.Fabrica);
        var anonimo = _banco.Fabrica.CreateClient();
        var resposta = await anonimo.PostAsJsonAsync($"/api/v1/public/leads/{ContaId(dono)}", new
        {
            contatoNome = "Robô Isca",
            telefone = "11900001111",
            site = "http://spam.example",
            iniciadoEm = Ha(10),
        });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        Assert.False(await Existe(dono, "Robô Isca"));
        Assert.Contains(_banco.Fabrica.Logs.Linhas, linha => linha.Contains("lead_descartado_honeypot", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Envio_em_menos_de_3s_responde_201_e_nao_grava()
    {
        var dono = await Entrar(_banco.Fabrica);
        var anonimo = _banco.Fabrica.CreateClient();
        var resposta = await anonimo.PostAsJsonAsync($"/api/v1/public/leads/{ContaId(dono)}", new
        {
            contatoNome = "Robô Rápido",
            iniciadoEm = Ha(0),
        });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        Assert.False(await Existe(dono, "Robô Rápido"));

        var humano = await anonimo.PostAsJsonAsync($"/api/v1/public/leads/{ContaId(dono)}", new
        {
            contatoNome = "Pessoa Real",
            site = "",
            iniciadoEm = Ha(10),
        });
        Assert.Equal(HttpStatusCode.Created, humano.StatusCode);
        Assert.True(await Existe(dono, "Pessoa Real"));
    }

    [Fact]
    public async Task Campo_longo_responde_400_e_conta_inexistente_404()
    {
        var dono = await Entrar(_banco.Fabrica);
        var anonimo = _banco.Fabrica.CreateClient();
        var url = $"/api/v1/public/leads/{ContaId(dono)}";
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync(url, new { contatoNome = new string('a', 121) })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync(url, new { contatoNome = "Ana", email = new string('a', 201) })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await anonimo.PostAsJsonAsync(url, new { contatoNome = new string('a', 120) })).StatusCode);

        var inexistente = await anonimo.PostAsJsonAsync($"/api/v1/public/leads/{Guid.NewGuid()}", new { contatoNome = "Ana" });
        Assert.Equal(HttpStatusCode.NotFound, inexistente.StatusCode);
    }

    [Fact]
    public async Task Trigesimo_primeiro_lead_da_conta_na_hora_responde_429()
    {
        await using var fabrica = new FabricaApi(_banco.Conexao, leadsPorContaPorHora: 30);
        var dono = await Entrar(fabrica);
        var anonimo = fabrica.CreateClient();
        var url = $"/api/v1/public/leads/{ContaId(dono)}";
        for (var vez = 0; vez < 30; vez++)
        {
            Assert.Equal(HttpStatusCode.Created, (await anonimo.PostAsJsonAsync(url, new { contatoNome = $"Lead {vez}" })).StatusCode);
        }

        var excedente = await anonimo.PostAsJsonAsync(url, new { contatoNome = "Lead 31" });
        Assert.Equal(HttpStatusCode.TooManyRequests, excedente.StatusCode);
        Assert.True(excedente.Headers.Contains("Retry-After"));

        // Outra conta tem a sua própria cota.
        var outra = await Entrar(fabrica);
        Assert.Equal(HttpStatusCode.Created, (await anonimo.PostAsJsonAsync($"/api/v1/public/leads/{ContaId(outra)}", new { contatoNome = "Outra" })).StatusCode);
    }

    [Fact]
    public async Task Rotas_publicas_limitam_por_ip()
    {
        await using var fabrica = new FabricaApi(_banco.Conexao, publicoPorMinuto: 20);
        var anonimo = fabrica.CreateClient();
        var url = "/api/v1/rsvp/qualquer";
        for (var vez = 0; vez < 20; vez++)
        {
            Assert.NotEqual(HttpStatusCode.TooManyRequests, (await anonimo.PostAsJsonAsync(url, new { })).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await anonimo.PostAsJsonAsync(url, new { })).StatusCode);
    }

    private static async Task<bool> Existe(HttpClient dono, string contato)
    {
        var texto = await (await dono.GetAsync("/api/v1/oportunidades")).Content.ReadAsStringAsync();
        return texto.Contains(contato, StringComparison.Ordinal);
    }

    private static async Task<HttpClient> Entrar(FabricaApi fabrica)
    {
        var email = $"lead-{Guid.NewGuid():N}@aralu.test";
        var cliente = fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
        var mensagem = fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = query["usuarioId"].ToString(), token = query["token"].ToString() })).StatusCode);
        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var sessao = await entrada.Content.ReadFromJsonAsync<JsonElement>();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.GetProperty("token").GetString());
        return cliente;
    }

    private static string ContaId(HttpClient cliente)
    {
        var token = cliente.DefaultRequestHeaders.Authorization!.Parameter!;
        var payload = token.Split('.')[1];
        var padded = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
        var json = JsonDocument.Parse(Convert.FromBase64String(padded.Replace('-', '+').Replace('_', '/')));
        return json.RootElement.GetProperty("sub").GetString()!;
    }
}
