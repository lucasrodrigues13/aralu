using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class AssistentesFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public AssistentesFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Convite_primeiro_acesso_e_isolamento_de_permissoes()
    {
        var dona = await EntrarOrganizer();
        var (assistente, assistenteId, _) = await ConvidarEAtivar(dona, financeiro: false, somenteDela: false);

        // Área da dona: perfil, assistentes e contratos da conta ficam fechados.
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/perfil")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/assistentes")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/contratos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/pagamentos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync("/api/v1/eventos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync("/api/v1/hoje")).StatusCode);

        // Cria um evento na conta da dona e confere o isolamento pelo financeiro.
        var evento = await CriarEvento(assistente, "Festa da assistente");
        var id = evento.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync($"/api/v1/eventos/{id}/dinheiro")).StatusCode);
        var resumo = await Ler(await assistente.GetAsync($"/api/v1/eventos/{id}/resumo"));
        Assert.Equal(0m, resumo.GetProperty("valorContratado").GetDecimal());

        // Com a permissão, o financeiro abre no próximo pedido, sem entrar de novo.
        var lista = await Ler(await dona.GetAsync("/api/v1/assistentes"));
        var email = lista.EnumerateArray().First(item => item.GetProperty("id").GetGuid() == assistenteId).GetProperty("email").GetString();
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/assistentes/{assistenteId}", new
        {
            nome = "Ana Assistente",
            email,
            podeVerFinanceiro = true,
            somenteDela = false,
        })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync($"/api/v1/eventos/{id}/dinheiro")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync("/api/v1/pagamentos")).StatusCode);
    }

    [Fact]
    public async Task Somente_dela_ve_so_os_eventos_marcados_e_remocao_derruba_o_acesso()
    {
        var dona = await EntrarOrganizer();
        var (assistente, assistenteId, email) = await ConvidarEAtivar(dona, financeiro: false, somenteDela: true);

        var marcado = (await CriarEvento(dona, "Marcado")).GetProperty("id").GetGuid();
        var outro = (await CriarEvento(dona, "Outro")).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/eventos/{marcado}/assistentes", new { assistentes = new[] { assistenteId } })).StatusCode);

        var eventos = await Ler(await assistente.GetAsync("/api/v1/eventos"));
        var ids = eventos.EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToArray();
        Assert.Contains(marcado, ids);
        Assert.DoesNotContain(outro, ids);
        Assert.Equal(HttpStatusCode.NotFound, (await assistente.GetAsync($"/api/v1/eventos/{outro}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync($"/api/v1/eventos/{marcado}")).StatusCode);

        // Evento criado por ela já nasce marcado.
        var dela = (await CriarEvento(assistente, "Criado por ela")).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync($"/api/v1/eventos/{dela}")).StatusCode);

        // Tarefa do evento com a assistente como responsável; depois ela é removida e o nome continua.
        var tarefas = await Ler(await dona.GetAsync($"/api/v1/eventos/{marcado}/tarefas"));
        var tarefa = await Ler(await dona.PostAsJsonAsync($"/api/v1/eventos/{marcado}/tarefas", new
        {
            titulo = "Confirmar buffet",
            responsaveis = new object[]
            {
                new { papel = "Organizer" },
                new { papel = "Assistente", referenciaId = assistenteId.ToString() },
            },
        }));
        Assert.Equal(2, tarefa.GetProperty("responsaveis").GetArrayLength());
        Assert.Equal(JsonValueKind.Array, tarefas.ValueKind);

        Assert.Equal(HttpStatusCode.NoContent, (await dona.DeleteAsync($"/api/v1/assistentes/{assistenteId}")).StatusCode);
        var depois = await assistente.GetAsync("/api/v1/eventos");
        Assert.Equal(HttpStatusCode.Unauthorized, depois.StatusCode);
        Assert.Contains("Seu acesso foi removido", await depois.Content.ReadAsStringAsync());

        var nomes = await Ler(await dona.GetAsync("/api/v1/assistentes/nomes"));
        Assert.True(nomes.EnumerateArray().First(item => item.GetProperty("id").GetGuid() == assistenteId).GetProperty("removida").GetBoolean());

        // O e-mail volta a ficar livre para um novo convite.
        var novo = await dona.PostAsJsonAsync("/api/v1/assistentes", new { nome = "Ana de novo", email, podeVerFinanceiro = false, somenteDela = false });
        Assert.Equal(HttpStatusCode.Created, novo.StatusCode);
    }

    [Fact]
    public async Task Convite_nao_aceita_email_de_outra_conta_e_reenviar_invalida_o_link_anterior()
    {
        var dona = await EntrarOrganizer();
        var outraDona = await EntrarOrganizer();
        var emailOutraDona = (await Ler(await outraDona.GetAsync("/api/v1/conta/area"))).GetProperty("email").GetString();
        var recusado = await dona.PostAsJsonAsync("/api/v1/assistentes", new { nome = "X", email = emailOutraDona });
        Assert.Equal(HttpStatusCode.BadRequest, recusado.StatusCode);
        Assert.Contains("outra conta", await recusado.Content.ReadAsStringAsync());

        var email = $"ass-{Guid.NewGuid():N}@gevents.test";
        var convite = await Ler(await dona.PostAsJsonAsync("/api/v1/assistentes", new { nome = "Bia", email }));
        Assert.True(convite.GetProperty("conviteEnviado").GetBoolean());
        Assert.Equal("Convidada", convite.GetProperty("situacao").GetString());
        var repetido = await dona.PostAsJsonAsync("/api/v1/assistentes", new { nome = "Bia", email });
        Assert.Equal(HttpStatusCode.Conflict, repetido.StatusCode);

        var primeiro = LinkDoConvite(email);
        Assert.Equal(HttpStatusCode.OK, (await dona.PostAsync($"/api/v1/assistentes/{convite.GetProperty("id").GetGuid()}/reenviar", null)).StatusCode);
        var segundo = LinkDoConvite(email);
        Assert.NotEqual(primeiro.Token, segundo.Token);

        var anonimo = _banco.Fabrica.CreateClient();
        var velho = await anonimo.PostAsJsonAsync("/api/v1/conta/aceitar-convite", new { usuarioId = primeiro.UsuarioId, token = primeiro.Token, senha = Senha, confirmacao = Senha });
        Assert.Equal(HttpStatusCode.BadRequest, velho.StatusCode);
        var novo = await anonimo.PostAsJsonAsync("/api/v1/conta/aceitar-convite", new { usuarioId = segundo.UsuarioId, token = segundo.Token, senha = Senha, confirmacao = Senha });
        Assert.Equal(HttpStatusCode.OK, novo.StatusCode);
    }

    private (string UsuarioId, string Token) LinkDoConvite(string email)
    {
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "texto");
        var link = mensagem.Corpo[mensagem.Corpo.IndexOf("http", StringComparison.Ordinal)..].Trim();
        var query = QueryHelpers.ParseQuery(new Uri(link).Query);
        return (query["usuarioId"].ToString(), query["token"].ToString());
    }

    private async Task<(HttpClient Cliente, Guid Id, string Email)> ConvidarEAtivar(HttpClient dona, bool financeiro, bool somenteDela)
    {
        var email = $"ass-{Guid.NewGuid():N}@gevents.test";
        var convite = await Ler(await dona.PostAsJsonAsync("/api/v1/assistentes", new
        {
            nome = "Ana Assistente",
            email,
            podeVerFinanceiro = financeiro,
            somenteDela,
        }));
        var (usuarioId, token) = LinkDoConvite(email);
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/aceitar-convite", new
        {
            usuarioId,
            token,
            senha = Senha,
            confirmacao = Senha,
        })).StatusCode);
        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        Assert.Equal(HttpStatusCode.OK, entrada.StatusCode);
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();
        Assert.Contains("Assistant", sessao!.Papeis);
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);
        return (cliente, convite.GetProperty("id").GetGuid(), email);
    }

    private static async Task<JsonElement> CriarEvento(HttpClient cliente, string nome)
    {
        var modelo = await Ler(await cliente.PostAsJsonAsync("/api/v1/modelos", new { nome = $"Modelo {nome}", tipo = "Aniversario" }));
        return await Ler(await cliente.PostAsJsonAsync("/api/v1/eventos", new
        {
            modeloId = modelo.GetProperty("id").GetGuid(),
            primeiroNome = nome,
        }));
    }

    private async Task<HttpClient> EntrarOrganizer()
    {
        var email = $"org-{Guid.NewGuid():N}@gevents.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha })).StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new
        {
            usuarioId = query["usuarioId"].ToString(),
            token = query["token"].ToString(),
        })).StatusCode);
        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao!.Token);
        return cliente;
    }

    private static async Task<JsonElement> Ler(HttpResponseMessage resposta)
    {
        var texto = await resposta.Content.ReadAsStringAsync();
        Assert.True(resposta.IsSuccessStatusCode, texto);
        using var documento = JsonDocument.Parse(texto);
        return documento.RootElement.Clone();
    }

    private sealed record Sessao(string Token, string Email, string[] Papeis);
}
