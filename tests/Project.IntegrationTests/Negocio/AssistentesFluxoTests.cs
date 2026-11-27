using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Project.Infrastructure.Conta;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class AssistentesFluxoTests
{
    private const string Senha = "ceu-de-junho-42";
    private readonly BancoFixture _banco;

    public AssistentesFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Convite_primeiro_acesso_e_isolamento_de_permissoes()
    {
        var dona = await EntrarOrganizer();
        var (assistente, assistenteId, _) = await ConvidarEAtivar(dona, financeiro: false, somenteDela: false);

        // Área da dona: perfil, assistentes e contratos da conta ficam fechados.
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/perfil")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/equipe")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/contratos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync("/api/v1/eventos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync("/api/v1/hoje")).StatusCode);

        // Cria um evento na conta da dona e confere o isolamento pelo financeiro.
        var evento = await CriarEvento(assistente, "Festa da assistente");
        var id = evento.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync($"/api/v1/eventos/{id}/dinheiro")).StatusCode);
        var resumo = await Ler(await assistente.GetAsync($"/api/v1/eventos/{id}/resumo"));
        Assert.Equal(0m, resumo.GetProperty("valorContratado").GetDecimal());

        // Com a permissão, o financeiro abre no próximo pedido, sem entrar de novo.
        // T11: o Dono libera "ver Financeiro" no grupo dela.
        var grupoId = (await Ler(await dona.GetAsync("/api/v1/equipe"))).EnumerateArray()
            .First(item => item.GetProperty("id").GetGuid() == assistenteId).GetProperty("grupoId").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/grupos-acesso/{grupoId}", PedidoGrupo("Grupo de teste", financeiro: true, todos: true))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync($"/api/v1/eventos/{id}/dinheiro")).StatusCode);
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

        Assert.Equal(HttpStatusCode.NoContent, (await dona.DeleteAsync($"/api/v1/equipe/{assistenteId}")).StatusCode);
        var depois = await assistente.GetAsync("/api/v1/eventos");
        Assert.Equal(HttpStatusCode.Unauthorized, depois.StatusCode);
        Assert.Contains("Seu acesso foi removido", await depois.Content.ReadAsStringAsync());

        var nomes = await Ler(await dona.GetAsync("/api/v1/assistentes/nomes"));
        Assert.True(nomes.EnumerateArray().First(item => item.GetProperty("id").GetGuid() == assistenteId).GetProperty("removida").GetBoolean());

        // O cadastro continua na lista, desativado, e o e-mail segue preso a ele.
        var lista = await Ler(await dona.GetAsync("/api/v1/equipe"));
        Assert.Equal("Inativa", lista.EnumerateArray().First(item => item.GetProperty("id").GetGuid() == assistenteId).GetProperty("situacao").GetString());
        var novo = await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Ana de novo", email });
        Assert.Equal(HttpStatusCode.Conflict, novo.StatusCode);

        // Reativar devolve o acesso com a mesma senha e os mesmos eventos marcados.
        var reativada = await Ler(await dona.PostAsync($"/api/v1/equipe/{assistenteId}/reativar", null));
        Assert.Equal("Ativa", reativada.GetProperty("situacao").GetString());
        Assert.Equal(HttpStatusCode.OK, (await assistente.GetAsync($"/api/v1/eventos/{marcado}")).StatusCode);
    }

    [Fact]
    public async Task Hoje_da_dona_lista_tarefas_abertas_de_assistente_removida_e_a_troca_tira_do_card()
    {
        var dona = await EntrarOrganizer();
        var (outraAssistente, _, _) = await ConvidarEAtivar(dona, financeiro: false, somenteDela: false);
        var (_, removidaId, _) = await ConvidarEAtivar(dona, financeiro: false, somenteDela: false);

        var evento = (await CriarEvento(dona, "Festa pendente")).GetProperty("id").GetGuid();
        var tarefaEvento = await Ler(await dona.PostAsJsonAsync($"/api/v1/eventos/{evento}/tarefas", new
        {
            titulo = "Contratar DJ",
            responsaveis = new object[] { new { papel = "Assistente", referenciaId = removidaId.ToString() } },
        }));
        var tarefaEventoId = tarefaEvento.GetProperty("id").GetGuid();
        var lead = await Ler(await dona.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Lead pendente",
            estagio = "Contato inicial",
            contatos = new[] { new { nome = "Lia", telefone = "11977770002", email = "lia2@ex.com" } },
                contratante = ContratanteDeTeste.Completo,
        }));
        var tarefaFunil = await Ler(await dona.PostAsJsonAsync("/api/v1/tarefas-funil", new
        {
            titulo = "Ligar para o lead",
            oportunidadeId = lead.GetProperty("id").GetGuid(),
            tipo = "Ligacao",
            prazo = "2030-06-01",
            responsaveis = new object[] { new { papel = "Assistente", referenciaId = removidaId.ToString() } },
        }));
        var tarefaFunilId = tarefaFunil.GetProperty("id").GetGuid();

        // Com a assistente ativa, nada aparece no card.
        Assert.Equal(0, (await Ler(await dona.GetAsync("/api/v1/hoje"))).GetProperty("tarefasSemResponsavelAtivo").GetArrayLength());

        Assert.Equal(HttpStatusCode.NoContent, (await dona.DeleteAsync($"/api/v1/equipe/{removidaId}")).StatusCode);

        var pendencias = (await Ler(await dona.GetAsync("/api/v1/hoje"))).GetProperty("tarefasSemResponsavelAtivo").EnumerateArray().ToArray();
        Assert.Equal(2, pendencias.Length);
        Assert.Contains(pendencias, item => item.GetProperty("id").GetGuid() == tarefaEventoId && item.GetProperty("origem").GetString() == "Evento");
        Assert.Contains(pendencias, item => item.GetProperty("id").GetGuid() == tarefaFunilId && item.GetProperty("origem").GetString() == "Funil");
        Assert.All(pendencias, item => Assert.Equal("Ana Assistente", item.GetProperty("assistente").GetString()));

        // A Hoje da assistente não traz o card.
        Assert.Equal(0, (await Ler(await outraAssistente.GetAsync("/api/v1/hoje"))).GetProperty("tarefasSemResponsavelAtivo").GetArrayLength());

        // Trocar o responsável tira a tarefa do card.
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/tarefas/{tarefaEventoId}", new
        {
            titulo = "Contratar DJ",
            situacao = "Pendente",
            prioridade = "Media",
            visibilidade = "SoEu",
            responsaveis = new object[] { new { papel = "Organizer" } },
        })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/tarefas-funil/{tarefaFunilId}", new
        {
            titulo = "Ligar para o lead",
            oportunidadeId = lead.GetProperty("id").GetGuid(),
            tipo = "Ligacao",
            prazo = "2030-06-01",
            responsaveis = new object[] { new { papel = "Organizer" } },
        })).StatusCode);
        Assert.Equal(0, (await Ler(await dona.GetAsync("/api/v1/hoje"))).GetProperty("tarefasSemResponsavelAtivo").GetArrayLength());
    }

    [Fact]
    public async Task Convite_nao_aceita_email_de_outra_conta_e_reenviar_invalida_o_link_anterior()
    {
        var dona = await EntrarOrganizer();
        var outraDona = await EntrarOrganizer();
        var emailOutraDona = (await Ler(await outraDona.GetAsync("/api/v1/conta/area"))).GetProperty("email").GetString();
        var recusado = await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "X", email = emailOutraDona });
        Assert.Equal(HttpStatusCode.BadRequest, recusado.StatusCode);
        Assert.Contains("outra conta", await recusado.Content.ReadAsStringAsync());

        var email = $"ass-{Guid.NewGuid():N}@aralu.test";
        var convite = await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Bia", email }));
        Assert.True(convite.GetProperty("conviteEnviado").GetBoolean());
        Assert.Equal("Convidada", convite.GetProperty("situacao").GetString());
        var repetido = await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Bia", email });
        Assert.Equal(HttpStatusCode.Conflict, repetido.StatusCode);

        var primeiro = LinkDoConvite(email);
        Assert.Equal(HttpStatusCode.OK, (await dona.PostAsync($"/api/v1/equipe/{convite.GetProperty("id").GetGuid()}/reenviar", null)).StatusCode);
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
                contratante = ContratanteDeTeste.Completo,
            }))).GetProperty("id").GetGuid();

        async Task<Guid> Orcamento(HttpClient quem, Guid lead) =>
            (await Ler(await quem.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId = lead, conteudo = "Proposta" }))).GetProperty("id").GetGuid();

        async Task<Guid> Contrato(HttpClient quem, Guid lead)
        {
            // Contrato só nasce com orçamento aprovado (SPEC-050).
            var aprovado = await Orcamento(quem, lead);
            Assert.Equal(HttpStatusCode.OK, (await quem.PostAsJsonAsync($"/api/v1/orcamentos-funil/{aprovado}/responder", new { tipo = "Aceitar" })).StatusCode);
            return (await Ler(await quem.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId = lead, conteudo = "Contrato" }))).GetProperty("id").GetGuid();
        }

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

    [Fact]
    public async Task Somente_dela_com_financeiro_ve_so_pagamentos_e_estatisticas_dos_eventos_marcados()
    {
        var dona = await EntrarOrganizer();
        var (restrita, restritaId, _) = await ConvidarEAtivar(dona, financeiro: true, somenteDela: true);
        var (todos, _, _) = await ConvidarEAtivar(dona, financeiro: true, somenteDela: false);

        var marcado = (await CriarEvento(dona, "Marcado")).GetProperty("id").GetGuid();
        var outro = (await CriarEvento(dona, "Outro")).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/eventos/{marcado}/assistentes", new { assistentes = new[] { restritaId } })).StatusCode);
        foreach (var id in new[] { marcado, outro })
        {
            await ContratarFornecedorComParcelas(dona, id);
        }

        async Task<HttpStatusCode> DinheiroDe(HttpClient quem, Guid eventoId) =>
            (await quem.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro")).StatusCode;

        Assert.Equal(HttpStatusCode.OK, await DinheiroDe(restrita, marcado));
        Assert.Equal(HttpStatusCode.NotFound, await DinheiroDe(restrita, outro));
        Assert.Equal(HttpStatusCode.OK, await DinheiroDe(todos, marcado));
        Assert.Equal(HttpStatusCode.OK, await DinheiroDe(todos, outro));
        Assert.Equal(2, (await Ler(await dona.GetAsync("/api/v1/eventos/estatisticas"))).GetProperty("total").GetInt32());
        Assert.Equal(2, (await Ler(await todos.GetAsync("/api/v1/eventos/estatisticas"))).GetProperty("total").GetInt32());
        var estatisticas = await Ler(await restrita.GetAsync("/api/v1/eventos/estatisticas"));
        Assert.Equal(1, estatisticas.GetProperty("total").GetInt32());
        Assert.Equal(1, estatisticas.GetProperty("rankingServicos").EnumerateArray().Max(item => item.GetProperty("quantidade").GetInt32()));
    }

    [Fact]
    public async Task Admin_le_as_assistentes_de_qualquer_conta_e_dona_e_assistente_recebem_403()
    {
        var dona = await EntrarOrganizer();
        var (assistente, assistenteId, email) = await ConvidarEAtivar(dona, financeiro: true, somenteDela: true);

        var adminEmail = $"adm-{Guid.NewGuid():N}@aralu.test";
        const string senhaAdmin = "administrador-de-teste";
        await using var fabrica = new FabricaApi(_banco.Conexao, bootstrap: true, adminEmail: adminEmail, adminSenha: senhaAdmin);
        var admin = fabrica.CreateClient();
        await using (var escopo = fabrica.Services.CreateAsyncScope())
        {
            await escopo.ServiceProvider.GetRequiredService<BootstrapAdministrador>().ExecutarAsync();
        }

        var entrada = await admin.PostAsJsonAsync("/api/v1/conta/entrar", new { email = adminEmail, senha = senhaAdmin });
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();
        admin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao!.Token);

        var contas = await Ler(await admin.GetAsync("/api/v1/admin/assistentes"));
        var lida = contas.EnumerateArray()
            .SelectMany(conta => conta.GetProperty("membros").EnumerateArray())
            .First(item => item.GetProperty("id").GetGuid() == assistenteId);
        Assert.Equal(email, lida.GetProperty("email").GetString());
        Assert.Equal("Ativa", lida.GetProperty("situacao").GetString());
        Assert.Equal("Membro", lida.GetProperty("tipo").GetString());
        Assert.Equal(JsonValueKind.String, lida.GetProperty("grupo").ValueKind);
        Assert.Contains(contas.EnumerateArray(), conta => conta.GetProperty("emailDaConta").GetString()!.StartsWith("org-", StringComparison.Ordinal));

        Assert.Equal(HttpStatusCode.Forbidden, (await dona.GetAsync("/api/v1/admin/assistentes")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await assistente.GetAsync("/api/v1/admin/assistentes")).StatusCode);
    }

    [Fact]
    public async Task Membro_do_grupo_Assistentes_nao_abre_financeiro_nem_configuracoes()
    {
        var dona = await EntrarOrganizer();
        var (membro, membroId, _) = await ConvidarNoGrupoPadrao(dona);
        var evento = (await CriarEvento(dona, "Festa")).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/eventos/{evento}/assistentes", new { assistentes = new[] { membroId } })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await membro.GetAsync($"/api/v1/eventos/{evento}")).StatusCode);

        // T9: o acesso direto ao Financeiro é recusado com a mensagem do que falta.
        var dinheiro = await membro.GetAsync($"/api/v1/eventos/{evento}/dinheiro");
        Assert.Equal(HttpStatusCode.Forbidden, dinheiro.StatusCode);
        Assert.Contains("ver em Financeiro", await dinheiro.Content.ReadAsStringAsync());
        var area = await Ler(await membro.GetAsync("/api/v1/conta/area"));
        Assert.False(area.GetProperty("podeVerFinanceiro").GetBoolean());
        Assert.Equal("Membro", area.GetProperty("tipo").GetString());

        // O grupo Assistentes não exclui e não vê o Funil.
        Assert.Equal(HttpStatusCode.Forbidden, (await membro.GetAsync("/api/v1/oportunidades")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await membro.DeleteAsync($"/api/v1/eventos/{evento}/imagem")).StatusCode);

        // T14: Configurações (equipe e grupos) só para o Dono.
        Assert.Equal(HttpStatusCode.Forbidden, (await membro.GetAsync("/api/v1/equipe")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await membro.GetAsync("/api/v1/grupos-acesso")).StatusCode);
    }

    [Fact]
    public async Task Ultimo_dono_nao_sai_e_socio_convidado_como_dono_acessa_configuracoes()
    {
        var dona = await EntrarOrganizer();
        var equipe = await Ler(await dona.GetAsync("/api/v1/equipe"));
        var euId = equipe.EnumerateArray().Single().GetProperty("id").GetGuid();
        var eu = equipe.EnumerateArray().Single();

        // T12: o último Dono não sai nem vira Membro.
        var sair = await dona.DeleteAsync($"/api/v1/equipe/{euId}");
        Assert.Equal(HttpStatusCode.Conflict, sair.StatusCode);
        Assert.Contains("pelo menos um dono", await sair.Content.ReadAsStringAsync());
        var rebaixar = await dona.PutAsJsonAsync($"/api/v1/equipe/{euId}", new { nome = "Dona", email = eu.GetProperty("email").GetString(), tipo = "Membro" });
        Assert.Equal(HttpStatusCode.Conflict, rebaixar.StatusCode);

        // T13: o sócio convidado como Dono entra e acessa Configurações.
        var email = $"socio-{Guid.NewGuid():N}@aralu.test";
        Assert.Equal(HttpStatusCode.Created, (await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Sócio", email, tipo = "Dono" })).StatusCode);
        var socio = await AceitarEEntrar(email, "Organizer");
        Assert.Equal(2, (await Ler(await socio.GetAsync("/api/v1/equipe"))).GetArrayLength());
        Assert.Equal(HttpStatusCode.OK, (await socio.GetAsync("/api/v1/perfil")).StatusCode);

        // Com dois Donos, o primeiro já pode virar Membro.
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/equipe/{euId}", new { nome = "Dona", email = eu.GetProperty("email").GetString(), tipo = "Membro" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await dona.GetAsync("/api/v1/equipe")).StatusCode);
    }

    [Fact]
    public async Task Grupo_com_membros_nao_e_apagado()
    {
        var dona = await EntrarOrganizer();
        await ConvidarNoGrupoPadrao(dona);
        var grupos = await Ler(await dona.GetAsync("/api/v1/grupos-acesso"));
        var assistentes = grupos.EnumerateArray().Single(item => item.GetProperty("nome").GetString() == "Assistentes");
        Assert.Equal(1, assistentes.GetProperty("membros").GetInt32());

        var apagar = await dona.DeleteAsync($"/api/v1/grupos-acesso/{assistentes.GetProperty("id").GetGuid()}");
        Assert.Equal(HttpStatusCode.Conflict, apagar.StatusCode);
        Assert.Contains("Mova o membro", await apagar.Content.ReadAsStringAsync());

        var organizadores = grupos.EnumerateArray().Single(item => item.GetProperty("nome").GetString() == "Organizadores");
        Assert.Equal(HttpStatusCode.NoContent, (await dona.DeleteAsync($"/api/v1/grupos-acesso/{organizadores.GetProperty("id").GetGuid()}")).StatusCode);

        var invalido = await dona.PostAsJsonAsync("/api/v1/grupos-acesso", new { nome = "X", permissoes = new[] { new { modulo = "Financeiro", ver = false, editar = true, excluir = false } } });
        Assert.Equal(HttpStatusCode.BadRequest, invalido.StatusCode);
    }

    private static object PedidoGrupo(string nome, bool financeiro, bool todos) => new
    {
        nome,
        veTodosEventos = todos,
        permissoes = new[] { "Clientes", "Eventos", "Convidados", "Tarefas", "Agenda", "Funil", "OrcamentosContratos", "Financeiro", "Fornecedores", "Modelos" }
            .Select(modulo => new { modulo, ver = modulo != "Financeiro" || financeiro, editar = modulo != "Financeiro" || financeiro, excluir = modulo != "Financeiro" || financeiro })
            .ToArray(),
    };

    private async Task<(HttpClient Cliente, Guid Id, string Email)> ConvidarNoGrupoPadrao(HttpClient dona)
    {
        var email = $"ass-{Guid.NewGuid():N}@aralu.test";
        var convite = await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Ana Assistente", email }));
        Assert.Equal("Assistentes", convite.GetProperty("grupo").GetString());
        return (await AceitarEEntrar(email, "Assistant"), convite.GetProperty("id").GetGuid(), email);
    }

    private async Task<HttpClient> AceitarEEntrar(string email, string papel)
    {
        var (usuarioId, token) = LinkDoConvite(email);
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/aceitar-convite", new { usuarioId, token, senha = Senha, confirmacao = Senha })).StatusCode);
        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();
        Assert.Contains(papel, sessao!.Papeis);
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);
        return cliente;
    }

    private async Task<(HttpClient Cliente, Guid Id, string Email)> ConvidarSemAtivar(HttpClient dona)
    {
        var email = $"pend-{Guid.NewGuid():N}@aralu.test";
        var convite = await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Pendente", email }));
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
        var email = $"ass-{Guid.NewGuid():N}@aralu.test";
        var grupo = await Ler(await dona.PostAsJsonAsync("/api/v1/grupos-acesso", PedidoGrupo($"Grupo {Guid.NewGuid():N}"[..20], financeiro, todos: !somenteDela)));
        var convite = await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new
        {
            nome = "Ana Assistente",
            email,
            tipo = "Membro",
            grupoId = grupo.GetProperty("id").GetGuid(),
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

    /// <summary>Cria serviço, fornecedor e contrata (valor 4000 em 2 parcelas): gera o contrato do fornecedor com parcelas.</summary>
    private static async Task ContratarFornecedorComParcelas(HttpClient dona, Guid eventoId)
    {
        var servicoConta = await Ler(await dona.PostAsJsonAsync("/api/v1/servicos-conta", new { nome = $"Serviço {Guid.NewGuid():N}" }));
        var fornecedor = await Ler(await dona.PostAsJsonAsync("/api/v1/fornecedores", new
        {
            nome = "Fornecedor Teste",
            servicoContaIds = new[] { servicoConta.GetProperty("id").GetGuid() },
            emails = new[] { new { endereco = "forn@exemplo.com" } },
            telefones = new[] { new { numero = "11999990000", movel = true } },
        }));
        var fornecedorId = fornecedor.GetProperty("id").GetGuid();
        var comServico = await Ler(await dona.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/servicos", new { nome = "Banda" }));
        var servicoId = comServico.GetProperty("servicos").EnumerateArray()
            .Single(item => item.GetProperty("nome").GetString() == "Banda")
            .GetProperty("id").GetGuid();
        var comFornecedor = await Ler(await dona.PostAsJsonAsync(
            $"/api/v1/eventos/{eventoId}/servicos/{servicoId}/fornecedores",
            new { fornecedorId, etapa = "Orcamento" }));
        var vinculoId = comFornecedor.GetProperty("servicos").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() == servicoId)
            .GetProperty("fornecedores").EnumerateArray().Single().GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dona.PostAsJsonAsync(
            $"/api/v1/eventos/{eventoId}/servicos/{servicoId}/fornecedores/{vinculoId}/contratar",
            new { valor = 4000 })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync(
            $"/api/v1/eventos/{eventoId}/dinheiro/pagamentos/{vinculoId}/parcelamento",
            new { quantidadeParcelas = 2, primeiraParcela = "2026-12-10", comEntrada = false })).StatusCode);
    }

    private static async Task<JsonElement> CriarEvento(HttpClient cliente, string nome)
    {
        return await Ler(await cliente.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Aniversario",
            primeiroNome = nome,
        }));
    }

    private async Task<HttpClient> EntrarOrganizer()
    {
        var email = $"org-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
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
