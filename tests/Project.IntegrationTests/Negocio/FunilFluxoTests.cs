using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class FunilFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public FunilFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Agenda_oportunidades_e_painel_isolam_por_conta()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var compromisso = await Ler(await dono.PostAsJsonAsync("/api/v1/agenda", new
        {
            descricao = "Reunião comercial",
            data = "2030-05-10",
        }));
        Assert.Equal("Reunião comercial", compromisso.GetProperty("descricao").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/agenda", new { descricao = " ", data = "2030-05-11" })).StatusCode);
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/agenda?de=2030-05-01&ate=2030-05-31"))).EnumerateArray());

        var servico = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-servicos-funil", new
        {
            nome = "Assessoria completa",
            descricao = "Pacote",
            valor = 12000,
        }));
        var servicoId = servico.GetProperty("id").GetGuid();

        var oportunidade = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Ana",
            estagio = "Contato inicial",
            valorProposta = 15000,
            modeloServicoFunilId = servicoId,
            contatos = new[] { new { nome = "Ana", telefone = "11999999999", email = "ana@ex.com" } },
        }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Sem contato",
            estagio = "Contato inicial",
            contatos = Array.Empty<object>(),
        })).StatusCode);

        await Ler(await dono.PostAsJsonAsync($"/api/v1/oportunidades/{oportunidadeId}/mover", new
        {
            estagio = "Descartado",
            motivoDescarte = "Preço",
        }));
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"/api/v1/oportunidades/{oportunidadeId}/mover", new
        {
            estagio = "Descartado",
        })).StatusCode);

        var painel = await Ler(await dono.GetAsync("/api/v1/painel"));
        var funil = painel.GetProperty("funil").EnumerateArray().ToArray();
        Assert.Equal(4, funil.Length);
        Assert.Contains(funil, item => item.GetProperty("estagio").GetString() == "Descartado" && item.GetProperty("quantidade").GetInt32() == 1);
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/oportunidades"))).EnumerateArray());

        var modeloOrcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-orcamento-funil", new
        {
            nome = "Padrão",
            texto = "Proposta para #nome_oportunidade",
        }));
        var modeloContrato = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-contrato-funil", new
        {
            nome = "Cláusulas",
            texto = "Contrato de #nome_oportunidade",
        }));

        await Ler(await dono.PostAsJsonAsync($"/api/v1/oportunidades/{oportunidadeId}/mover", new { estagio = "Contato inicial" }));

        var orcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new
        {
            oportunidadeId,
            modeloId = modeloOrcamento.GetProperty("id").GetGuid(),
        }));
        Assert.Contains("Casamento Ana", orcamento.GetProperty("conteudo").GetString());

        var contrato = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos-funil", new
        {
            oportunidadeId,
            modeloId = modeloContrato.GetProperty("id").GetGuid(),
        }));
        Assert.Contains("Casamento Ana", contrato.GetProperty("conteudo").GetString());

        var tarefa = await Ler(await dono.PostAsJsonAsync("/api/v1/tarefas-funil", new
        {
            titulo = "Ligar para Ana",
            oportunidadeId,
            tipo = "Ligacao",
            responsavel = "Organizer",
            prazo = "2030-05-20",
        }));
        await Ler(await dono.PostAsJsonAsync($"/api/v1/tarefas-funil/{tarefa.GetProperty("id").GetGuid()}/concluir", new { }));

        var relatorio = await Ler(await dono.GetAsync("/api/v1/relatorios-funil?inicio=2030-01-01&fim=2030-12-31"));
        Assert.True(relatorio.GetProperty("fechadosPerdidos").GetArrayLength() >= 2);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/oportunidades/{oportunidadeId}")).StatusCode);

        var contaId = ContaId(dono);
        var publico = _banco.Fabrica.CreateClient();
        var lead = await Ler(await publico.PostAsJsonAsync($"/api/v1/public/leads/{contaId}", new
        {
            nome = "Lead site",
            contatoNome = "Bruno",
            telefone = "11988887777",
            email = "bruno@ex.com",
        }));
        Assert.Equal("Contato inicial", lead.GetProperty("estagio").GetString());
        Assert.Equal("Lead site", lead.GetProperty("nome").GetString());
    }

    [Fact]
    public async Task Lead_vira_cliente_e_vai_para_contratado()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var lead = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Carla",
            estagio = "Orçamento enviado",
            valorProposta = 9000,
            contatos = new[] { new { nome = "Carla", telefone = "11977776666", email = "carla@ex.com" } },
        }));
        var leadId = lead.GetProperty("id").GetGuid();
        Assert.Equal(JsonValueKind.Null, lead.GetProperty("clienteId").ValueKind);

        var cliente = await Ler(await dono.PostAsJsonAsync("/api/v1/clientes", new
        {
            nome = "Carla",
            papel = "Noiva",
            email = $"carla-{Guid.NewGuid():N}@gevents.test",
            ddi = "+55",
            celular = "11977776666",
        }));
        var clienteId = cliente.GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"/api/v1/oportunidades/{leadId}/cliente", new { })).StatusCode);
        Assert.NotEqual(HttpStatusCode.OK, (await outra.PostAsJsonAsync($"/api/v1/oportunidades/{leadId}/cliente", new { clienteId })).StatusCode);

        var fechado = await Ler(await dono.PostAsJsonAsync($"/api/v1/oportunidades/{leadId}/cliente", new { clienteId }));
        Assert.Equal("Contratado", fechado.GetProperty("estagio").GetString());
        Assert.Equal(clienteId, fechado.GetProperty("clienteId").GetGuid());

        var lista = (await Ler(await dono.GetAsync("/api/v1/oportunidades"))).EnumerateArray().ToArray();
        Assert.Contains(lista, item => item.GetProperty("id").GetGuid() == leadId && item.GetProperty("clienteId").GetGuid() == clienteId);
    }

    [Fact]
    public async Task Dona_configura_estagios_e_leads_acompanham()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var padrao = (await Ler(await dono.GetAsync("/api/v1/estagios-funil"))).EnumerateArray().ToArray();
        Assert.Equal(["Contato inicial", "Orçamento enviado", "Contratado", "Descartado"], padrao.Select(e => e.GetProperty("nome").GetString()));
        Assert.Equal(["Aberto", "Aberto", "Contratado", "Descartado"], padrao.Select(e => e.GetProperty("tipo").GetString()));
        var contatoId = padrao[0].GetProperty("id").GetGuid();
        var orcamentoId = padrao[1].GetProperty("id").GetGuid();

        var lead = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Duda",
            estagio = orcamentoId.ToString(),
            valorProposta = 5000,
            contatos = new[] { new { nome = "Duda" } },
        }));
        var leadId = lead.GetProperty("id").GetGuid();
        Assert.Equal("Orçamento enviado", lead.GetProperty("estagio").GetString());
        Assert.Equal(orcamentoId, lead.GetProperty("estagioId").GetGuid());

        // Outra conta não usa estágio desta.
        Assert.Equal(HttpStatusCode.BadRequest, (await outra.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Intrusa",
            estagio = orcamentoId.ToString(),
            contatos = new[] { new { nome = "X" } },
        })).StatusCode);

        var novosAbertos = new object[]
        {
            new { id = contatoId, nome = "Primeiro contato", cor = "info" },
            new { id = (Guid?)null, nome = "Reunião marcada", cor = "primary" },
        };

        // Excluir estágio com lead sem dizer o destino não grava.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync("/api/v1/estagios-funil", new { abertos = novosAbertos })).StatusCode);
        // Nome repetido com estágio fixo, cor fora da paleta e mais de oito abertos não gravam.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync("/api/v1/estagios-funil", new
        {
            abertos = new[] { new { nome = "Contratado", cor = "info" } },
            exclusoes = new[] { new { id = orcamentoId, destinoId = contatoId } },
        })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync("/api/v1/estagios-funil", new
        {
            abertos = new[] { new { nome = "Novo", cor = "#123456" } },
        })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync("/api/v1/estagios-funil", new
        {
            abertos = Enumerable.Range(1, 9).Select(i => new { nome = $"Etapa {i}", cor = "info" }).ToArray(),
        })).StatusCode);

        var salvos = (await Ler(await dono.PutAsJsonAsync("/api/v1/estagios-funil", new
        {
            abertos = novosAbertos,
            corContratado = "secondary",
            exclusoes = new[] { new { id = orcamentoId, destinoId = contatoId } },
        }))).EnumerateArray().ToArray();
        Assert.Equal(["Primeiro contato", "Reunião marcada", "Contratado", "Descartado"], salvos.Select(e => e.GetProperty("nome").GetString()));
        Assert.Equal("secondary", salvos[2].GetProperty("cor").GetString());
        Assert.Equal(1, salvos[0].GetProperty("quantidade").GetInt32());

        var movido = await Ler(await dono.GetAsync($"/api/v1/oportunidades/{leadId}"));
        Assert.Equal("Primeiro contato", movido.GetProperty("estagio").GetString());

        // Mover pelo id do estágio novo, e o painel da Hoje usa os estágios da conta.
        var reuniaoId = salvos[1].GetProperty("id").GetGuid();
        var naReuniao = await Ler(await dono.PostAsJsonAsync($"/api/v1/oportunidades/{leadId}/mover", new { estagio = reuniaoId.ToString() }));
        Assert.Equal("Reunião marcada", naReuniao.GetProperty("estagio").GetString());

        var funil = (await Ler(await dono.GetAsync("/api/v1/painel"))).GetProperty("funil").EnumerateArray().ToArray();
        Assert.Equal(["Primeiro contato", "Reunião marcada", "Contratado", "Descartado"], funil.Select(e => e.GetProperty("estagio").GetString()));
        Assert.Contains(funil, e => e.GetProperty("estagio").GetString() == "Reunião marcada" && e.GetProperty("valor").GetDecimal() == 5000);

        // A outra conta continua com os padrões.
        var daOutra = (await Ler(await outra.GetAsync("/api/v1/estagios-funil"))).EnumerateArray().ToArray();
        Assert.Equal("Contato inicial", daOutra[0].GetProperty("nome").GetString());
    }

    [Fact]
    public async Task Retorno_origem_e_contato_repetido()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);

        // Origem fora da lista e "Outro" sem texto não gravam.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Lead TikTok",
            estagio = "Contato inicial",
            fonte = "TikTok",
            contatos = new[] { new { nome = "Bia" } },
        })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Lead TikTok",
            estagio = "Contato inicial",
            fonte = "Outro",
            contatos = new[] { new { nome = "Bia" } },
        })).StatusCode);

        var atrasado = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Bia",
            estagio = "Contato inicial",
            fonte = "outro",
            fonteOutro = "TikTok",
            retornarEm = hoje.AddDays(-2).ToString("yyyy-MM-dd"),
            contatos = new[] { new { nome = "Bia", telefone = "(11) 98888-7777", email = "Bia@Ex.com" } },
        }));
        Assert.Equal("Outro", atrasado.GetProperty("fonte").GetString());
        Assert.Equal("TikTok", atrasado.GetProperty("fonteOutro").GetString());
        var atrasadoId = atrasado.GetProperty("id").GetGuid();

        var deHoje = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "15 anos Duda",
            estagio = "Contato inicial",
            fonte = "Instagram",
            contatos = new[] { new { nome = "Duda" } },
        }));
        var deHojeId = deHoje.GetProperty("id").GetGuid();
        var marcado = await Ler(await dono.PostAsJsonAsync($"/api/v1/oportunidades/{deHojeId}/retorno", new
        {
            data = hoje.ToString("yyyy-MM-dd"),
            hora = "14:30",
        }));
        Assert.Equal("14:30:00", marcado.GetProperty("retornarHora").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"/api/v1/oportunidades/{deHojeId}/retorno", new { hora = "10:00" })).StatusCode);
        Assert.NotEqual(HttpStatusCode.OK, (await outra.PostAsJsonAsync($"/api/v1/oportunidades/{deHojeId}/retorno", new { data = hoje.ToString("yyyy-MM-dd") })).StatusCode);

        // Futuro e descartado não entram no card da Hoje.
        await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Futuro",
            estagio = "Contato inicial",
            retornarEm = hoje.AddDays(3).ToString("yyyy-MM-dd"),
            contatos = new[] { new { nome = "F" } },
        }));
        await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Já descartado",
            estagio = "Descartado",
            motivoDescarte = "Preço",
            retornarEm = hoje.AddDays(-1).ToString("yyyy-MM-dd"),
            contatos = new[] { new { nome = "D" } },
        }));

        var retornos = (await Ler(await dono.GetAsync("/api/v1/hoje"))).GetProperty("retornosFunil").EnumerateArray().ToArray();
        Assert.Equal(["Casamento Bia", "15 anos Duda"], retornos.Select(r => r.GetProperty("nome").GetString()));
        Assert.True(retornos[0].GetProperty("atrasado").GetBoolean());
        Assert.False(retornos[1].GetProperty("atrasado").GetBoolean());
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/hoje"))).GetProperty("retornosFunil").EnumerateArray());

        // "Retornei" sem próximo retorno limpa a data.
        await Ler(await dono.PostAsJsonAsync($"/api/v1/oportunidades/{deHojeId}/retorno", new { data = (string?)null }));
        Assert.Single((await Ler(await dono.GetAsync("/api/v1/hoje"))).GetProperty("retornosFunil").EnumerateArray());

        // Contato repetido: telefone com outra máscara ou e-mail com maiúsculas, só na própria conta.
        var repetidos = (await Ler(await dono.GetAsync("/api/v1/oportunidades/contato-repetido?telefone=%2B55%2011988887777"))).EnumerateArray().ToArray();
        Assert.Single(repetidos);
        Assert.Equal(atrasadoId, repetidos[0].GetProperty("id").GetGuid());
        Assert.Equal("Contato inicial", repetidos[0].GetProperty("estagio").GetString());
        Assert.Single((await Ler(await dono.GetAsync("/api/v1/oportunidades/contato-repetido?email=bia@ex.com"))).EnumerateArray());
        Assert.Empty((await Ler(await dono.GetAsync($"/api/v1/oportunidades/contato-repetido?email=bia@ex.com&ignorar={atrasadoId}"))).EnumerateArray());
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/oportunidades/contato-repetido?email=bia@ex.com"))).EnumerateArray());

        // Cliente da conta também conta como contato repetido.
        await Ler(await dono.PostAsJsonAsync("/api/v1/clientes", new
        {
            nome = "Carlos",
            papel = "Noivo",
            email = $"carlos-{Guid.NewGuid():N}@gevents.test",
            ddi = "+55",
            celular = "21955554444",
        }));
        var cliente = (await Ler(await dono.GetAsync("/api/v1/oportunidades/contato-repetido?telefone=(21)95555-4444"))).EnumerateArray().Single();
        Assert.Equal("cliente", cliente.GetProperty("tipo").GetString());

        // Lead do formulário público com contato repetido ganha o selo; origem automática.
        var anonimo = _banco.Fabrica.CreateClient();
        var publico = await Ler(await anonimo.PostAsJsonAsync($"/api/v1/public/leads/{ContaId(dono)}", new
        {
            nome = "Bia de novo",
            contatoNome = "Bia",
            telefone = "11988887777",
        }));
        Assert.True(publico.GetProperty("contatoRepetido").GetBoolean());
        Assert.Equal("Formulário do site", publico.GetProperty("fonte").GetString());
        var novo = await Ler(await anonimo.PostAsJsonAsync($"/api/v1/public/leads/{ContaId(dono)}", new
        {
            nome = "Gente nova",
            contatoNome = "Nova",
            telefone = "11911112222",
        }));
        Assert.False(novo.GetProperty("contatoRepetido").GetBoolean());
    }

    private static string ContaId(HttpClient cliente)
    {
        var token = cliente.DefaultRequestHeaders.Authorization!.Parameter!;
        var payload = token.Split('.')[1];
        var padded = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
        var json = JsonDocument.Parse(Convert.FromBase64String(padded.Replace('-', '+').Replace('_', '/')));
        return json.RootElement.GetProperty("sub").GetString()!;
    }

    [Fact]
    public async Task Horarios_do_lead_ficam_em_quatro_campos_e_o_texto_antigo_e_convertido()
    {
        var dono = await Entrar();
        var lead = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Bia",
            estagio = "Contato inicial",
            horaConvite = "15:30",
            horaCerimonia = "16:00",
            horaRecepcao = "18:00",
            horaFesta = "20:30",
            contatos = new[] { new { nome = "Bia", telefone = "11988880001", email = "bia@ex.com" } },
        }));
        Assert.Equal("15:30:00", lead.GetProperty("horaConvite").GetString());
        Assert.Equal("20:30:00", lead.GetProperty("horaFesta").GetString());

        // Lead antigo: só o texto livre. A leitura converte nos quatro campos; ao salvar, o texto some.
        var antigo = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Carla",
            estagio = "Contato inicial",
            horarios = "Cerimônia 17h, recepção 19h30",
            contatos = new[] { new { nome = "Carla", telefone = "11988880002", email = "carla@ex.com" } },
        }));
        Assert.Equal("17:00:00", antigo.GetProperty("horaCerimonia").GetString());
        Assert.Equal("19:30:00", antigo.GetProperty("horaRecepcao").GetString());
        Assert.Equal(JsonValueKind.Null, antigo.GetProperty("horaFesta").ValueKind);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"funil-{Guid.NewGuid():N}@gevents.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha })).StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = query["usuarioId"].ToString(), token = query["token"].ToString() })).StatusCode);
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
