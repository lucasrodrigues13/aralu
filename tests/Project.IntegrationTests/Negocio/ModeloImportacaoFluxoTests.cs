using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class ModeloImportacaoFluxoTests
{
    private const string Senha = "ceu-de-junho-42";
    private readonly BancoFixture _banco;

    public ModeloImportacaoFluxoTests(BancoFixture banco) => _banco = banco;

    /// <summary>SPEC-012 v3: leitura em massa, modelo com serviços e tarefas, aplicar duas vezes, prazo relativo, salvar como modelo.</summary>
    [Fact]
    public async Task Serviços_e_tarefas_do_modelo_aplicar_prazo_relativo_salvar_como_modelo_e_isolar()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        // Leitura em massa: só lê, não grava.
        var lido = await Ler(await dono.PostAsJsonAsync("/api/v1/tarefas/em-massa/leitura?paraModelo=true", new
        {
            texto = """
                Buffet:
                - Pedir orçamentos (6 semanas)
                - Degustação (30 dias)
                - Pedir depoimento (2 semanas depois)
                """,
        }));
        Assert.Equal(3, lido.GetProperty("tarefas").GetArrayLength());
        Assert.Equal(-42, lido.GetProperty("tarefas")[0].GetProperty("prazoRelativo").GetInt32());
        Assert.Equal("Buffet", lido.GetProperty("tarefas")[0].GetProperty("servico").GetString());

        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Pacote", tipo = "Casamento" }));
        var modeloId = modelo.GetProperty("id").GetGuid();
        var salvo = await Ler(await dono.PutAsJsonAsync($"/api/v1/modelos/{modeloId}", new
        {
            nome = "Pacote",
            tipo = "Casamento",
            servicos = new[] { new { chave = "s1", nome = "Buffet", valorEstimado = 25000m } },
            tarefas = new object[]
            {
                new { servicoChave = "s1", titulo = "Pedir orçamentos", prazoRelativo = -42, responsaveis = new[] { "Organizer", "Cliente" }, checklist = new[] { new { texto = "Comparar cardápios", prazoRelativo = -35, responsavelPapel = "Assistente" } } },
                new { servicoChave = "s1", titulo = "Pedir depoimento", prazoRelativo = 14, responsaveis = new[] { "Assistente" } },
                new { servicoChave = (string?)null, titulo = "Enviar save the date", prazoRelativo = (int?)null, responsaveis = Array.Empty<string>() },
            },
        }));
        Assert.Equal(1, salvo.GetProperty("servicos").GetArrayLength());
        var servicoModelo = salvo.GetProperty("servicos")[0];
        Assert.True(servicoModelo.GetProperty("noCadastro").GetBoolean());
        Assert.Equal(3, salvo.GetProperty("tarefas").GetArrayLength());
        Assert.Equal(servicoModelo.GetProperty("id").GetGuid(), salvo.GetProperty("tarefas")[0].GetProperty("servicoModeloId").GetGuid());
        Assert.Equal("Organizer", salvo.GetProperty("tarefas")[2].GetProperty("responsaveis")[0].GetString());
        var cadastro = await Ler(await dono.GetAsync("/api/v1/servicos-conta"));
        Assert.Contains(cadastro.EnumerateArray(), servico => servico.GetProperty("nome").GetString() == "Buffet");

        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2027-06-20",
        }));
        var eventoId = evento.GetProperty("id").GetGuid();

        var previa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/aplicar-modelo/previa", new { modeloId }));
        Assert.Equal(3, previa.GetProperty("tarefasNovas").GetInt32());
        Assert.Equal(1, previa.GetProperty("servicosNovos").GetInt32());
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/aplicar-modelo", new { modeloId }));
        var tarefas = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"));
        Assert.Equal(3, tarefas.GetArrayLength());
        var orcamentos = tarefas.EnumerateArray().Single(t => t.GetProperty("titulo").GetString() == "Pedir orçamentos");
        Assert.Equal(-42, orcamentos.GetProperty("prazoRelativo").GetInt32());
        Assert.Equal("2027-05-09", orcamentos.GetProperty("prazo").GetString());
        Assert.Equal("Buffet", orcamentos.GetProperty("servico").GetString());
        Assert.Equal("2027-05-16", orcamentos.GetProperty("checklist")[0].GetProperty("prazo").GetString());
        var depoimento = tarefas.EnumerateArray().Single(t => t.GetProperty("titulo").GetString() == "Pedir depoimento");
        Assert.Equal("2027-07-04", depoimento.GetProperty("prazo").GetString());
        Assert.Equal(JsonValueKind.Null, depoimento.GetProperty("responsaveis")[0].GetProperty("referenciaId").ValueKind);

        // Aplicar de novo não muda nada.
        var segunda = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/aplicar-modelo/previa", new { modeloId }));
        Assert.Equal(0, segunda.GetProperty("tarefasNovas").GetInt32());
        Assert.Equal(0, segunda.GetProperty("servicosNovos").GetInt32());
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/aplicar-modelo", new { modeloId }));
        Assert.Equal(3, (await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"))).GetArrayLength());

        // Data exata numa tarefa nova; a relativa acompanha a data do evento sem perguntar.
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Pagar sinal", prazo = "2027-03-01" }));
        await Ler(await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}", new
        {
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2027-06-30",
            moverPrazos = false,
        }));
        var depois = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"));
        Assert.Equal("2027-05-19", depois.EnumerateArray().Single(t => t.GetProperty("titulo").GetString() == "Pedir orçamentos").GetProperty("prazo").GetString());
        Assert.Equal("2027-03-01", depois.EnumerateArray().Single(t => t.GetProperty("titulo").GetString() == "Pagar sinal").GetProperty("prazo").GetString());

        // Em massa no evento: serviço novo é cadastrado; repetida (mesmo serviço e título) fica de fora.
        var emMassa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas/em-massa", new
        {
            linhas = new object[]
            {
                new { titulo = "Escolher fotógrafo", servicoNome = "Fotografia", prazoRelativo = -60 },
                new { titulo = "Pedir orçamentos", servicoNome = "Buffet" },
                new { titulo = "Comprar alianças", prazo = "2027-04-10", responsaveis = new[] { new { papel = "Cliente" } } },
            },
        }));
        Assert.Equal(2, emMassa.GetProperty("adicionadas").GetInt32());
        Assert.Equal(1, emMassa.GetProperty("repetidas").GetInt32());
        Assert.Equal(1, emMassa.GetProperty("servicosNovos").GetInt32());

        // Evento sem data: a relativa fica sem data até o evento ter data.
        var semData = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Eva", segundoNome = "Fábio" }));
        var semDataId = semData.GetProperty("id").GetGuid();
        Assert.True((await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{semDataId}/aplicar-modelo/previa", new { modeloId }))).GetProperty("eventoSemData").GetBoolean());
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{semDataId}/aplicar-modelo", new { modeloId }));
        var tarefasSemData = await Ler(await dono.GetAsync($"/api/v1/eventos/{semDataId}/tarefas"));
        Assert.All(tarefasSemData.EnumerateArray(), t => Assert.Equal(JsonValueKind.Null, t.GetProperty("prazo").ValueKind));
        await Ler(await dono.PutAsJsonAsync($"/api/v1/eventos/{semDataId}", new { primeiroNome = "Eva", segundoNome = "Fábio", data = "2027-08-01" }));
        var comData = await Ler(await dono.GetAsync($"/api/v1/eventos/{semDataId}/tarefas"));
        Assert.Equal("2027-06-20", comData.EnumerateArray().Single(t => t.GetProperty("titulo").GetString() == "Pedir orçamentos").GetProperty("prazo").GetString());

        // Salvar como modelo: data exata vira relativa (antes ou depois), serviço vai junto.
        var previaSalvar = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/salvar-como-modelo/previa", new { nome = (string?)null }));
        Assert.Contains("Modelo —", previaSalvar.GetProperty("nomeSugerido").GetString());
        var novoModelo = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/salvar-como-modelo", new { nome = "Modelo Ana & Bruno" }));
        Assert.Equal(2, novoModelo.GetProperty("servicos").GetArrayLength());
        var sinal = novoModelo.GetProperty("tarefas").EnumerateArray().Single(t => t.GetProperty("titulo").GetString() == "Pagar sinal");
        Assert.Equal(-121, sinal.GetProperty("prazoRelativo").GetInt32());
        var alianca = novoModelo.GetProperty("tarefas").EnumerateArray().Single(t => t.GetProperty("titulo").GetString() == "Comprar alianças");
        Assert.Equal("Cliente", alianca.GetProperty("responsaveis")[0].GetString());

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/modelos/{modeloId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await outra.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/aplicar-modelo", new { modeloId })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await outra.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/salvar-como-modelo", new { nome = "X" })).StatusCode);
        Assert.NotEqual(HttpStatusCode.OK,
            (await outra.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas/em-massa", new { linhas = new[] { new { titulo = "X" } } })).StatusCode);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"imp-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
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

    private sealed record Sessao(string Token);
}
