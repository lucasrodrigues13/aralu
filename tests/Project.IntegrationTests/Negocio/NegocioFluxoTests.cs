using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class NegocioFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public NegocioFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Evento_segue_modelo_conta_assessoria_e_cep()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var semModelo = await dono.PostAsJsonAsync("/api/v1/eventos", new { primeiroNome = "Ana", segundoNome = "Bruno" });
        Assert.Equal(HttpStatusCode.BadRequest, semModelo.StatusCode);

        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new
        {
            nome = "Checklist de Casamento",
            tipo = "Casamento",
            servicos = new[] { "Buffet" },
            tarefas = new[] { "Prova do menu" },
        }));
        var modeloId = modelo.GetProperty("id").GetGuid();

        var criado = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            modeloId,
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2027-06-20",
            hora = "16:00:00",
            orcamentoEstimado = 150000,
            convidadosEstimados = 150,
            tags = new[] { "Assessoria completa" },
            cerimonia = new { nome = "Igreja" },
            recepcao = new { nome = "Espaço" },
        }));
        Assert.Equal("Ana & Bruno", criado.GetProperty("nome").GetString());
        Assert.Equal("EmAndamento", criado.GetProperty("situacao").GetString());
        Assert.Contains(criado.GetProperty("servicos").EnumerateArray(), servico => servico.GetProperty("nome").GetString() == "Buffet");
        var eventoId = criado.GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}")).StatusCode);

        var assessoria = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/assessoria", new
        {
            valorTotal = 15000,
            quantidadeParcelas = 4,
            primeiraParcela = "2026-12-10",
            comEntrada = true,
            baseEntrada = "Valor",
            valorEntrada = 3000,
            dataEntrada = "2026-11-10",
        }));
        var servicoAssessoria = assessoria.GetProperty("servicos").EnumerateArray()
            .Single(servico => servico.GetProperty("nome").GetString() == "Assessoria e Organização");
        Assert.True(servicoAssessoria.GetProperty("contratado").GetBoolean());
        Assert.Equal(5, servicoAssessoria.GetProperty("parcelas").GetArrayLength());

        var editado = await Ler(await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}", new
        {
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2027-07-01",
            tags = new[] { "Assessoria completa" },
            cerimonia = new { nome = "Igreja", cep = "01001-000" },
            recepcao = new { nome = "Espaço" },
        }));
        Assert.Equal("Brasil", editado.GetProperty("cerimonia").GetProperty("pais").GetString());
        Assert.Equal("Praça da Sé", editado.GetProperty("cerimonia").GetProperty("endereco").GetString());
        Assert.Equal("SP", editado.GetProperty("cerimonia").GetProperty("estado").GetString());
        Assert.Equal("São Paulo", editado.GetProperty("cerimonia").GetProperty("cidade").GetString());
        Assert.Equal("Sé", editado.GetProperty("cerimonia").GetProperty("bairro").GetString());

        var tarefas = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"));
        Assert.Contains(tarefas.EnumerateArray(), tarefa => tarefa.GetProperty("titulo").GetString() == "Prova do menu");
        var tarefaId = tarefas.EnumerateArray().First().GetProperty("id").GetGuid();
        await dono.PutAsJsonAsync($"/api/v1/tarefas/{tarefaId}", new { titulo = "Prova do menu", prazo = "2027-05-01", situacao = "Concluida" });
        await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}", new
        {
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2028-01-01",
            tags = new[] { "Assessoria completa" },
        });
        var relida = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"));
        Assert.Equal("2027-05-01", relida.EnumerateArray().First().GetProperty("prazo").GetString());

        var lista = await Ler(await dono.GetAsync("/api/v1/eventos?situacao=EmAndamento&nome=Ana&tipo=Casamento&tag=Assessoria%20completa&de=2027-01-01&ate=2028-12-31"));
        Assert.Contains(lista.EnumerateArray(), evento => evento.GetProperty("id").GetGuid() == eventoId);
        var outraLista = await Ler(await outra.GetAsync("/api/v1/eventos?nome=Ana"));
        Assert.Empty(outraLista.EnumerateArray());
    }

    [Fact]
    public async Task Criacao_curta_sem_modelo_com_cliente_novo_e_resumo()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var semTipo = await dono.PostAsJsonAsync("/api/v1/eventos", new { primeiroNome = "Ana", segundoNome = "Bruno" });
        Assert.Equal(HttpStatusCode.BadRequest, semTipo.StatusCode);

        var whatsappRuim = await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Aniversario",
            primeiroNome = "Helena",
            clienteNovo = new { nome = "Marta", whatsApp = "9999" },
        });
        Assert.Equal(HttpStatusCode.BadRequest, whatsappRuim.StatusCode);

        var criado = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2027-06-20",
            local = "Espaço Jardim",
            clienteNovo = new { nome = "Ana Souza", whatsApp = "31999990001" },
        }));
        var eventoId = criado.GetProperty("id").GetGuid();
        Assert.Equal("Ana & Bruno", criado.GetProperty("nome").GetString());
        Assert.Equal("Espaço Jardim", criado.GetProperty("recepcao").GetProperty("nome").GetString());
        Assert.Empty(criado.GetProperty("servicos").EnumerateArray());
        Assert.True(criado.GetProperty("salvarNaAgenda").GetBoolean());

        var agenda = await Ler(await dono.GetAsync("/api/v1/agenda?de=2027-06-01&ate=2027-06-30"));
        Assert.Contains(agenda.EnumerateArray(), item => item.GetProperty("eventoId").GetGuid() == eventoId);

        var resumo = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/resumo"));
        Assert.Equal("Ana Souza", resumo.GetProperty("cliente").GetProperty("nome").GetString());
        Assert.Equal("(31) 99999-0001", resumo.GetProperty("cliente").GetProperty("celular").GetString());
        Assert.Equal(0, resumo.GetProperty("tarefas").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}/resumo")).StatusCode);

        var semData = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Formatura", primeiroNome = "Turma 2027" }));
        var resumoSemData = await Ler(await dono.GetAsync($"/api/v1/eventos/{semData.GetProperty("id").GetGuid()}/resumo"));
        Assert.Equal("sem-data", resumoSemData.GetProperty("alertas")[0].GetProperty("codigo").GetString());
        Assert.False(semData.GetProperty("salvarNaAgenda").GetBoolean());
    }

    [Fact]
    public async Task Perfil_clientes_e_tarefas_ficam_na_conta()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync("/api/v1/perfil", new { nascimento = "2030-01-01" })).StatusCode);
        var perfil = await Ler(await dono.PutAsJsonAsync("/api/v1/perfil", new { nomeEmpresa = "Casa Norte", endereco = "Rua 1" }));
        Assert.Contains("@", perfil.GetProperty("email").GetString());
        Assert.Equal("Casa Norte", perfil.GetProperty("nomeEmpresa").GetString());
        var perfilAlheio = await Ler(await outra.GetAsync("/api/v1/perfil"));
        Assert.NotEqual("Casa Norte", perfilAlheio.GetProperty("nomeEmpresa").GetString());

        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Aniversário", tipo = "Aniversario" }));
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { modeloId = modelo.GetProperty("id").GetGuid(), primeiroNome = "Helena" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var semNome = await dono.PostAsJsonAsync("/api/v1/clientes", new { papel = "Noiva", email = "ana@exemplo.com", celular = "11999999999" });
        Assert.Equal(HttpStatusCode.BadRequest, semNome.StatusCode);
        var cliente = await Ler(await dono.PostAsJsonAsync("/api/v1/clientes", new
        {
            nome = "Ana Cliente",
            papel = "Noiva",
            email = "ana.cliente@exemplo.com",
            ddi = "+55",
            celular = "11988887777",
            cep = "01001000",
        }));
        Assert.Equal("Brasil", cliente.GetProperty("pais").GetString());
        Assert.Equal("Praça da Sé", cliente.GetProperty("endereco").GetString());
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/clientes", new { clienteId = cliente.GetProperty("id").GetGuid() })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/clientes", new { clienteId = cliente.GetProperty("id").GetGuid() })).StatusCode);
        var doEvento = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/clientes"));
        Assert.Single(doEvento.EnumerateArray());
        var buscaAlheia = await Ler(await outra.GetAsync("/api/v1/clientes?nome=Ana"));
        Assert.Empty(buscaAlheia.EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/clientes", new { clienteId = cliente.GetProperty("id").GetGuid() })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/eventos/{eventoId}/clientes/{cliente.GetProperty("id").GetGuid()}")).StatusCode);
        Assert.Empty((await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/clientes"))).EnumerateArray());

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = " " })).StatusCode);
        var tarefa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Enviar convite", prazo = "2027-01-02" }));
        Assert.Equal("Pendente", tarefa.GetProperty("situacao").GetString());
        await dono.PutAsJsonAsync($"/api/v1/tarefas/{tarefa.GetProperty("id").GetGuid()}", new { titulo = "Enviar convite", situacao = "Atrasada" });
        var gerais = await Ler(await dono.GetAsync("/api/v1/tarefas"));
        Assert.Contains(gerais.EnumerateArray(), item => item.GetProperty("evento").GetString() == "Helena");
        var geraisOutra = await Ler(await outra.GetAsync("/api/v1/tarefas"));
        Assert.DoesNotContain(geraisOutra.EnumerateArray(), item => item.GetProperty("evento").GetString() == "Helena");
    }

    [Fact]
    public async Task Tarefa_em_linha_agrupa_prioridade_e_dois_responsaveis()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Lia", segundoNome = "Caio" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");

        var criada = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Ligar para o buffet" }));
        Assert.Equal("Pendente", criada.GetProperty("situacao").GetString());
        Assert.Equal("Media", criada.GetProperty("prioridade").GetString());
        Assert.Equal("SemPrazo", criada.GetProperty("grupoPrazo").GetString());

        var daSemana = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Esta semana", prazo = hoje }));
        Assert.Equal("EstaSemana", daSemana.GetProperty("grupoPrazo").GetString());

        var atualizada = await Ler(await dono.PutAsJsonAsync($"/api/v1/tarefas/{criada.GetProperty("id").GetGuid()}", new
        {
            titulo = "Ligar para o buffet",
            situacao = "Concluida",
            prioridade = "Alta",
            responsaveis = new[] { new { papel = "Organizer" }, new { papel = "Casal" } },
        }));
        Assert.Equal("Feitas", atualizada.GetProperty("grupoPrazo").GetString());
        Assert.Equal("Alta", atualizada.GetProperty("prioridade").GetString());
        Assert.Equal(2, atualizada.GetProperty("responsaveis").GetArrayLength());

        var alheias = await Ler(await outra.GetAsync("/api/v1/tarefas"));
        Assert.DoesNotContain(alheias.EnumerateArray(), item => item.GetProperty("titulo").GetString() == "Ligar para o buffet");
    }

    [Fact]
    public async Task Item_da_checklist_e_marcado_feito_cancelado_ou_pendente()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Rui", segundoNome = "Eva" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var tarefa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new
        {
            titulo = "Montar lista",
            checklist = new[] { new { texto = "Padrinhos", feito = false }, new { texto = "Pajens", feito = false } },
        }));
        var tarefaId = tarefa.GetProperty("id").GetGuid();
        var itens = tarefa.GetProperty("checklist");
        var primeiro = itens[0].GetProperty("id").GetGuid();
        var segundo = itens[1].GetProperty("id").GetGuid();

        var feito = await Ler(await dono.PutAsJsonAsync($"/api/v1/tarefas/{tarefaId}/checklist/{primeiro}", new { feito = true, cancelado = false }));
        Assert.True(feito.GetProperty("checklist")[0].GetProperty("feito").GetBoolean());

        var cancelado = await Ler(await dono.PutAsJsonAsync($"/api/v1/tarefas/{tarefaId}/checklist/{segundo}", new { feito = false, cancelado = true }));
        Assert.True(cancelado.GetProperty("checklist")[1].GetProperty("cancelado").GetBoolean());
        Assert.True(cancelado.GetProperty("checklist")[0].GetProperty("feito").GetBoolean());

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"/api/v1/tarefas/{tarefaId}/checklist/{segundo}", new { feito = true, cancelado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync($"/api/v1/tarefas/{tarefaId}/checklist/{segundo}", new { feito = true, cancelado = false })).StatusCode);

        var pendente = await Ler(await dono.PutAsJsonAsync($"/api/v1/tarefas/{tarefaId}/checklist/{segundo}", new { feito = false, cancelado = false }));
        Assert.False(pendente.GetProperty("checklist")[1].GetProperty("cancelado").GetBoolean());
    }

    [Fact]
    public async Task Item_da_checklist_guarda_prazo_e_responsavel_e_recusa_assistente_alheia()
    {
        var dono = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Leo", segundoNome = "Mia" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var tarefa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new
        {
            titulo = "Montar lista",
            checklist = new object[]
            {
                new { texto = "Padrinhos", feito = false, prazo = "2027-05-01", responsavel = new { papel = "Casal" } },
                new { texto = "Pajens", feito = false, prazo = "2027-05-10", responsavel = new { papel = "Organizer" } },
                new { texto = "Mesas", feito = false },
            },
        }));
        var itens = tarefa.GetProperty("checklist");
        Assert.Equal("2027-05-01", itens[0].GetProperty("prazo").GetString());
        Assert.Equal("Casal", itens[0].GetProperty("responsavel").GetProperty("papel").GetString());
        Assert.Equal("2027-05-10", itens[1].GetProperty("prazo").GetString());
        Assert.Equal("Organizer", itens[1].GetProperty("responsavel").GetProperty("papel").GetString());
        Assert.Equal(JsonValueKind.Null, itens[2].GetProperty("prazo").ValueKind);
        Assert.Equal(JsonValueKind.Null, itens[2].GetProperty("responsavel").ValueKind);

        var alheia = await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new
        {
            titulo = "Outra",
            checklist = new object[] { new { texto = "Item", feito = false, responsavel = new { papel = "Assistente", referenciaId = Guid.NewGuid().ToString() } } },
        });
        Assert.Equal(HttpStatusCode.BadRequest, alheia.StatusCode);
    }

    [Fact]
    public async Task Mudar_a_data_move_so_prazos_de_itens_abertos_de_tarefas_nao_concluidas()
    {
        var dono = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Teo",
            segundoNome = "Bia",
            data = "2027-06-20",
        }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var aberta = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new
        {
            titulo = "Aberta",
            checklist = new object[]
            {
                new { texto = "Aberto", feito = false, prazo = "2027-05-01" },
                new { texto = "Feito", feito = true, prazo = "2027-05-02" },
                new { texto = "Cancelado", feito = false, cancelado = true, prazo = "2027-05-03" },
                new { texto = "Sem prazo", feito = false },
            },
        }));
        var concluida = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new
        {
            titulo = "Concluida",
            checklist = new object[] { new { texto = "Aberto", feito = false, prazo = "2027-05-04" } },
        }));
        Assert.True((await dono.PutAsJsonAsync($"/api/v1/tarefas/{concluida.GetProperty("id").GetGuid()}", new
        {
            titulo = "Concluida",
            situacao = "Concluida",
            checklist = new object[] { new { texto = "Aberto", feito = false, prazo = "2027-05-04" } },
        })).IsSuccessStatusCode);

        Assert.True((await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}", new
        {
            primeiroNome = "Teo",
            segundoNome = "Bia",
            data = "2027-06-30",
            moverPrazos = true,
        })).IsSuccessStatusCode);

        var tarefas = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"));
        var porTitulo = tarefas.EnumerateArray().ToDictionary(item => item.GetProperty("titulo").GetString()!);
        var itens = porTitulo["Aberta"].GetProperty("checklist");
        Assert.Equal("2027-05-11", itens[0].GetProperty("prazo").GetString());
        Assert.Equal("2027-05-02", itens[1].GetProperty("prazo").GetString());
        Assert.Equal("2027-05-03", itens[2].GetProperty("prazo").GetString());
        Assert.Equal(JsonValueKind.Null, itens[3].GetProperty("prazo").ValueKind);
        Assert.Equal("2027-05-04", porTitulo["Concluida"].GetProperty("checklist")[0].GetProperty("prazo").GetString());
    }

    [Fact]
    public async Task Anexo_da_tarefa_aceita_pdf_recusa_outro_tipo_e_remove()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Ivo", segundoNome = "Lu" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var tarefa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Contratar buffet" }));
        var tarefaId = tarefa.GetProperty("id").GetGuid();

        using var texto = new MultipartFormDataContent { { new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("oi")), "arquivo", "nota.txt" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"/api/v1/tarefas/{tarefaId}/anexos", texto)).StatusCode);

        using var pdf = new MultipartFormDataContent { { new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n%%EOF")), "arquivo", "orcamento.pdf" } };
        var comAnexo = await Ler(await dono.PostAsync($"/api/v1/tarefas/{tarefaId}/anexos", pdf));
        var anexo = comAnexo.GetProperty("anexos")[0];
        Assert.Equal("orcamento.pdf", anexo.GetProperty("nome").GetString());

        using var alheio = new MultipartFormDataContent { { new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n%%EOF")), "arquivo", "x.pdf" } };
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsync($"/api/v1/tarefas/{tarefaId}/anexos", alheio)).StatusCode);

        var lista = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"));
        Assert.Equal(1, lista[0].GetProperty("anexos").GetArrayLength());

        var semAnexo = await Ler(await dono.DeleteAsync($"/api/v1/tarefas/{tarefaId}/anexos/{anexo.GetProperty("id").GetGuid()}"));
        Assert.Empty(semAnexo.GetProperty("anexos").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/arquivos/{anexo.GetProperty("arquivoId").GetGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Convite_rsvp_transfer_e_planilha()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Formatura", tipo = "Formatura" }));
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { modeloId = modelo.GetProperty("id").GetGuid(), primeiroNome = "Turma" }));
        var eventoId = evento.GetProperty("id").GetGuid();

        var grupo = await Ler(await dono.PostAsJsonAsync("/api/v1/grupos", new { nome = "Amigos" }));
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/convites", new { nome = "Mesa 1" })).StatusCode);
        var convite = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/convites", new
        {
            nome = "Família",
            grupoId = grupo.GetProperty("id").GetGuid(),
            convidados = new object[]
            {
                new { nome = "Lia", ddi = "+55", celular = "11911112222" },
                new { nome = "Caio", ddi = (string?)null, celular = (string?)null },
            },
            principal = 0,
        }));
        Assert.Equal("+55 11911112222", convite.GetProperty("telefone").GetString());
        Assert.True(convite.GetProperty("convidados").EnumerateArray().First().GetProperty("principal").GetBoolean());
        var token = convite.GetProperty("token").GetString()!;
        var conviteId = convite.GetProperty("id").GetGuid();

        var transfer = await Ler(await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}/transfer", new { ativo = true, locais = new[] { "Hotel" } }));
        Assert.True(transfer.GetProperty("transferAtivo").GetBoolean());
        var comTransfer = await Ler(await dono.PutAsJsonAsync($"/api/v1/convites/{conviteId}", new
        {
            nome = "Família",
            grupoId = grupo.GetProperty("id").GetGuid(),
            usaTransfer = true,
            localOrigem = "Hotel",
        }));
        Assert.True(comTransfer.GetProperty("usaTransfer").GetBoolean());
        Assert.Equal("Hotel", comTransfer.GetProperty("localOrigem").GetString());
        Assert.Equal(token, comTransfer.GetProperty("token").GetString());

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}/convites")).StatusCode);
        var anonimo = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync("/api/v1/rsvp/token-invalido")).StatusCode);
        var publico = await Ler(await anonimo.GetAsync($"/api/v1/rsvp/{token}"));
        Assert.Equal(2, publico.GetProperty("convidados").GetArrayLength());
        Assert.False(publico.GetProperty("convidados")[0].TryGetProperty("celular", out _));
        var respostas = publico.GetProperty("convidados").EnumerateArray().Select((pessoa, indice) => new
        {
            convidadoId = pessoa.GetProperty("id").GetGuid(),
            situacao = indice == 0 ? "Confirmado" : "NaoComparecera",
        });
        var respondido = await Ler(await anonimo.PostAsJsonAsync($"/api/v1/rsvp/{token}", new { respostas }));
        Assert.Contains(respondido.GetProperty("convidados").EnumerateArray(), pessoa => pessoa.GetProperty("situacao").GetString() == "Confirmado");
        var totais = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/convites"));
        Assert.Contains(totais.GetProperty("porSituacao").EnumerateArray(), item => item.GetProperty("rotulo").GetString() == "Confirmado" && item.GetProperty("quantidade").GetInt32() == 1);

        var planilha = await dono.GetAsync($"/api/v1/eventos/{eventoId}/convites/planilha");
        Assert.Equal(HttpStatusCode.OK, planilha.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", planilha.Content.Headers.ContentType?.MediaType);
        var whats = await Ler(await dono.GetAsync($"/api/v1/convites/{conviteId}/whatsapp"));
        Assert.Contains("wa.me/5511911112222", whats.GetProperty("url").GetString(), StringComparison.Ordinal);
        var qr = await dono.GetAsync($"/api/v1/convites/{conviteId}/qr");
        var png = await qr.Content.ReadAsByteArrayAsync();
        Assert.Equal(0x89, png[0]);
    }

    [Fact]
    public async Task Painel_conta_os_eventos_e_imagem_respeita_o_arquivo()
    {
        var dono = await Entrar();
        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Corporativo", tipo = "Corporativo" }));
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { modeloId = modelo.GetProperty("id").GetGuid(), primeiroNome = "Empresa" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var painel = await Ler(await dono.GetAsync("/api/v1/painel"));
        Assert.True(painel.GetProperty("emAndamento").GetInt32() >= 1);
        Assert.Equal(4, painel.GetProperty("funil").GetArrayLength());
        Assert.All(painel.GetProperty("funil").EnumerateArray(), estagio => Assert.Equal(0, estagio.GetProperty("quantidade").GetInt32()));
        Assert.DoesNotContain(painel.GetProperty("funil").EnumerateArray(), estagio => estagio.GetProperty("estagio").GetString()!.Contains("contrato", StringComparison.OrdinalIgnoreCase));

        using var jpeg = Imagem("foto.jpg", [0xFF, 0xD8, 0xFF, 0xD9]);
        var gravada = await dono.PostAsync($"/api/v1/eventos/{eventoId}/imagem", jpeg);
        Assert.Equal(HttpStatusCode.OK, gravada.StatusCode);
        var corpo = await gravada.Content.ReadAsStringAsync();
        Assert.DoesNotContain("..", corpo, StringComparison.Ordinal);
        using var imagemJson = JsonDocument.Parse(corpo);
        var imagemId = imagemJson.RootElement.GetProperty("imagemId").GetGuid();
        var arquivo = await dono.GetAsync($"/api/v1/arquivos/{imagemId}");
        Assert.Equal(HttpStatusCode.OK, arquivo.StatusCode);
        Assert.Equal("nosniff", arquivo.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.DoesNotContain("storage", arquivo.Content.Headers.ContentDisposition?.FileName ?? "", StringComparison.OrdinalIgnoreCase);

        var grande = new byte[(5 * 1024 * 1024) + 1];
        grande[0] = 0xFF;
        grande[1] = 0xD8;
        grande[2] = 0xFF;
        var rejeitada = await dono.PostAsync($"/api/v1/eventos/{eventoId}/imagem", ConteudoJpeg(grande, "grande.jpg"));
        Assert.Equal(HttpStatusCode.BadRequest, rejeitada.StatusCode);
        var ainda = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}"));
        Assert.Equal(imagemId, ainda.GetProperty("imagemId").GetGuid());

        var falsa = ConteudoJpeg([0xFF, 0xD8, 0xFF, 0xD9], "..\\..\\segredo.png");
        var assinatura = await dono.PostAsync($"/api/v1/eventos/{eventoId}/imagem", falsa);
        Assert.Equal(HttpStatusCode.BadRequest, assinatura.StatusCode);
        Assert.DoesNotContain("..", await assinatura.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        var removida = await dono.DeleteAsync($"/api/v1/eventos/{eventoId}/imagem");
        Assert.Equal(HttpStatusCode.OK, removida.StatusCode);
        var semFoto = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}"));
        Assert.True(!semFoto.TryGetProperty("imagemId", out var imagemRestante) || imagemRestante.ValueKind == JsonValueKind.Null);

        await dono.PostAsync($"/api/v1/eventos/{eventoId}/concluir", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
        var painelDepois = await Ler(await dono.GetAsync("/api/v1/painel"));
        Assert.True(painelDepois.GetProperty("concluidos").GetInt32() >= 1);
    }

    private static MultipartFormDataContent ConteudoJpeg(byte[] bytes, string nome)
    {
        var conteudo = new MultipartFormDataContent();
        var arquivo = new ByteArrayContent(bytes);
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        conteudo.Add(arquivo, "arquivo", nome);
        return conteudo;
    }

    private static MultipartFormDataContent Imagem(string nome, byte[] bytes) => ConteudoJpeg(bytes, nome);

    private async Task<HttpClient> Entrar()
    {
        var email = $"pessoa-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        var cadastro = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha });
        Assert.Equal(HttpStatusCode.Created, cadastro.StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        var confirmacao = await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = query["usuarioId"].ToString(), token = query["token"].ToString() });
        Assert.Equal(HttpStatusCode.OK, confirmacao.StatusCode);
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
