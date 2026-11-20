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

    [Fact]
    public async Task Tarefa_do_funil_aceita_dona_e_assistentes_ativas_como_responsaveis()
    {
        var dona = await EntrarOrganizer();
        var (_, assistenteId, _) = await ConvidarEAtivar(dona, financeiro: false, somenteDela: false);
        var (_, pendenteId, _) = await ConvidarSemAtivar(dona);
        var lead = await Ler(await dona.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Lead com tarefa",
            estagio = "Contato inicial",
            contatos = new[] { new { nome = "Lia", telefone = "11977770001", email = "lia@ex.com" } },
        }));
        var leadId = lead.GetProperty("id").GetGuid();

        var tarefa = await Ler(await dona.PostAsJsonAsync("/api/v1/tarefas-funil", new
        {
            titulo = "Ligar para a Lia",
            oportunidadeId = leadId,
            tipo = "Ligacao",
            prazo = "2030-06-01",
            observacao = "**Levar** o orçamento",
            responsaveis = new object[]
            {
                new { papel = "Organizer" },
                new { papel = "Assistente", referenciaId = assistenteId.ToString() },
            },
        }));
        Assert.Equal(2, tarefa.GetProperty("responsaveis").GetArrayLength());

        var invalida = await dona.PostAsJsonAsync("/api/v1/tarefas-funil", new
        {
            titulo = "Convite pendente",
            oportunidadeId = leadId,
            tipo = "Tarefa",
            prazo = "2030-06-02",
            responsaveis = new object[] { new { papel = "Assistente", referenciaId = pendenteId.ToString() } },
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalida.StatusCode);

        var editada = await Ler(await dona.PutAsJsonAsync($"/api/v1/tarefas-funil/{tarefa.GetProperty("id").GetGuid()}", new
        {
            titulo = "Ligar para a Lia",
            oportunidadeId = leadId,
            tipo = "Ligacao",
            prazo = "2030-06-01",
            responsaveis = new object[] { new { papel = "Assistente", referenciaId = assistenteId.ToString() } },
        }));
        Assert.Single(editada.GetProperty("responsaveis").EnumerateArray());
    }

    [Fact]
    public async Task Assistente_exclui_so_o_que_criou_no_funil_e_a_dona_exclui_tudo()
    {
        var dona = await EntrarOrganizer();
        var outraConta = await EntrarOrganizer();
        var (assistente, _, _) = await ConvidarEAtivar(dona, financeiro: false, somenteDela: false);

        async Task<Guid> Lead(HttpClient quem, string nome) =>
            (await Ler(await quem.PostAsJsonAsync("/api/v1/oportunidades", new
            {
                nome,
                estagio = "Contato inicial",
                contatos = new[] { new { nome = "Lia", telefone = "11977770002", email = "lia2@ex.com" } },
            }))).GetProperty("id").GetGuid();

        async Task<Guid> Orcamento(HttpClient quem, Guid lead) =>
            (await Ler(await quem.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId = lead, conteudo = "Proposta" }))).GetProperty("id").GetGuid();

        async Task<Guid> Contrato(HttpClient quem, Guid lead) =>
            (await Ler(await quem.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId = lead, conteudo = "Contrato" }))).GetProperty("id").GetGuid();

        async Task<Guid> Tarefa(HttpClient quem, Guid lead) =>
            (await Ler(await quem.PostAsJsonAsync("/api/v1/tarefas-funil", new
            {
                titulo = "Ligar",
                oportunidadeId = lead,
                tipo = "Ligacao",
                prazo = "2030-06-01",
                responsavel = "Equipe",
            }))).GetProperty("id").GetGuid();

        var leadDona = await Lead(dona, "Lead da dona");
        var leadDela = await Lead(assistente, "Lead dela");
        var itensDona = new[]
        {
            ("oportunidades", leadDona),
            ("orcamentos-funil", await Orcamento(dona, leadDona)),
            ("contratos-funil", await Contrato(dona, leadDona)),
            ("tarefas-funil", await Tarefa(dona, leadDona)),
        };

        // O que é da dona, e o que não tem autor (itens antigos), a assistente não exclui.
        foreach (var (rota, id) in itensDona)
        {
            Assert.True(HttpStatusCode.Forbidden == (await assistente.DeleteAsync($"/api/v1/{rota}/{id}")).StatusCode, rota);
            Assert.Equal(HttpStatusCode.NotFound, (await outraConta.DeleteAsync($"/api/v1/{rota}/{id}")).StatusCode);
        }

        // A leitura traz o autor, para a tela decidir o botão.
        var lista = await Ler(await assistente.GetAsync("/api/v1/oportunidades"));
        Assert.All(lista.EnumerateArray(), item => Assert.Equal(JsonValueKind.String, item.GetProperty("criadoPor").ValueKind));

        // O que ela criou, ela exclui.
        var dela = new[]
        {
            ("orcamentos-funil", await Orcamento(assistente, leadDela)),
            ("contratos-funil", await Contrato(assistente, leadDela)),
            ("tarefas-funil", await Tarefa(assistente, leadDela)),
            ("oportunidades", leadDela),
        };
        foreach (var (rota, id) in dela)
        {
            Assert.Equal(HttpStatusCode.OK, (await assistente.DeleteAsync($"/api/v1/{rota}/{id}")).StatusCode);
        }

        // A dona exclui tudo, inclusive o que a assistente criou.
        var leadOutro = await Lead(assistente, "Outro lead dela");
        var itensOutro = new[]
        {
            ("orcamentos-funil", await Orcamento(assistente, leadOutro)),
            ("contratos-funil", await Contrato(assistente, leadOutro)),
            ("tarefas-funil", await Tarefa(assistente, leadOutro)),
        };
        foreach (var (rota, id) in itensOutro.Concat(itensDona.Skip(1).Reverse()))
        {
            Assert.Equal(HttpStatusCode.OK, (await dona.DeleteAsync($"/api/v1/{rota}/{id}")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, (await dona.DeleteAsync($"/api/v1/oportunidades/{leadOutro}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dona.DeleteAsync($"/api/v1/oportunidades/{leadDona}")).StatusCode);
    }

    private async Task<(HttpClient Cliente, Guid Id, string Email)> ConvidarSemAtivar(HttpClient dona)
    {
        var email = $"pend-{Guid.NewGuid():N}@gevents.test";
        var convite = await Ler(await dona.PostAsJsonAsync("/api/v1/assistentes", new { nome = "Pendente", email }));
        return (_banco.Fabrica.CreateClient(), convite.GetProperty("id").GetGuid(), email);
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
