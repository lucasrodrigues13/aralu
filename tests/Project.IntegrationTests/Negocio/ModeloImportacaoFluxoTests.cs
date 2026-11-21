using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class ModeloImportacaoFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public ModeloImportacaoFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Importar_aplicar_duas_vezes_salvar_como_modelo_e_isolar()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var previa = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos/importar/previa", new
        {
            texto = """
                Cerimônia:
                - Reservar igreja (6 semanas)
                - Confirmar padrinhos (30 dias)
                """,
        }));
        Assert.Equal(2, previa.GetProperty("total").GetInt32());

        using var formNovo = new MultipartFormDataContent
        {
            { new StringContent("Pacote importado"), "nome" },
            { new StringContent("Casamento"), "tipo" },
            { new StringContent("""
                Cerimônia:
                - Reservar igreja (6 semanas)
                Serviços:
                - Contratar buffet (2 meses)
                """), "texto" },
        };
        var modelo = await Ler(await dono.PostAsync("/api/v1/modelos/importar", formNovo));
        var modeloId = modelo.GetProperty("id").GetGuid();
        Assert.Equal(2, modelo.GetProperty("tarefas").GetArrayLength());

        var modeloAtualizado = await Ler(await dono.PostAsJsonAsync(
            $"/api/v1/modelos/{modeloId}/tarefas/importar",
            new { texto = "- Lista de presentes (10 dias)" }));
        Assert.Equal(3, modeloAtualizado.GetProperty("tarefas").GetArrayLength());

        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2027-06-20",
        }));
        var eventoId = evento.GetProperty("id").GetGuid();
        // A criação não copia mais o modelo (SPEC-037): o evento nasce sem tarefas e o modelo entra por "aplicar modelo".
        Assert.Equal(0, (await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"))).GetArrayLength());
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/aplicar-modelo", new { modeloId }));
        var tarefas1 = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/tarefas"));
        Assert.Equal(3, tarefas1.GetArrayLength());

        var eventoVazio = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Carla",
            segundoNome = "Diego",
            data = "2027-07-10",
        }));
        var eventoVazioId = eventoVazio.GetProperty("id").GetGuid();

        var previaAplicar = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoVazioId}/aplicar-modelo/previa", new { modeloId }));
        Assert.Equal(3, previaAplicar.GetProperty("tarefasNovas").GetInt32());
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoVazioId}/aplicar-modelo", new { modeloId }));
        var tarefasAplicadas = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoVazioId}/tarefas"));
        Assert.Equal(3, tarefasAplicadas.GetArrayLength());

        var previaSegunda = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoVazioId}/aplicar-modelo/previa", new { modeloId }));
        Assert.Equal(0, previaSegunda.GetProperty("tarefasNovas").GetInt32());
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoVazioId}/aplicar-modelo", new { modeloId }));
        Assert.Equal(3, (await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoVazioId}/tarefas"))).GetArrayLength());

        var semData = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Eva",
            segundoNome = "Fábio",
        }));
        var semDataId = semData.GetProperty("id").GetGuid();
        var previaSemData = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{semDataId}/aplicar-modelo/previa", new { modeloId }));
        Assert.True(previaSemData.GetProperty("eventoSemData").GetBoolean());
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{semDataId}/aplicar-modelo", new { modeloId }));
        var tarefasSemData = await Ler(await dono.GetAsync($"/api/v1/eventos/{semDataId}/tarefas"));
        Assert.All(tarefasSemData.EnumerateArray(), t => Assert.Equal(JsonValueKind.Null, t.GetProperty("prazo").ValueKind));

        var previaSalvar = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/salvar-como-modelo/previa", new { nome = (string?)null }));
        Assert.Contains("Modelo —", previaSalvar.GetProperty("nomeSugerido").GetString());
        var salvo = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/salvar-como-modelo", new { nome = "Modelo Ana & Bruno" }));
        Assert.Equal("Modelo Ana & Bruno", salvo.GetProperty("nome").GetString());
        Assert.True(salvo.GetProperty("tarefas").GetArrayLength() >= 3);

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/modelos/{modeloId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await outra.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/aplicar-modelo", new { modeloId })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await outra.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/salvar-como-modelo", new { nome = "X" })).StatusCode);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"imp-{Guid.NewGuid():N}@aralu.test";
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

    private sealed record Sessao(string Token);
}
