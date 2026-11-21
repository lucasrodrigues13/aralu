using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class ContratosFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public ContratosFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Contrato_e_so_da_conta_e_nao_tem_vinculo_com_modelo_nem_evento()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/contratos", new { nome = "Sem texto", texto = " " })).StatusCode);
        var contrato = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos", new
        {
            nome = "Prestação de serviços",
            texto = "Contratante: {{contratante_nome}} ({{contratante_documento}}).",
        }));
        var contratoId = contrato.GetProperty("id").GetGuid();
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/contratos"))).EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/contratos/{contratoId}")).StatusCode);

        var campos = await Ler(await dono.GetAsync("/api/v1/contratos/campos"));
        Assert.DoesNotContain(campos.GetProperty("campos").EnumerateArray(), item => item.GetProperty("marca").GetString()!.StartsWith("evento_"));

        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Casamento clássico", tipo = "Casamento" }));
        var modeloId = modelo.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/modelos/{modeloId}/contratos")).StatusCode);

        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Lia", segundoNome = "Caio" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/eventos/{eventoId}/contratos")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _banco.Fabrica.CreateClient().GetAsync("/api/v1/publico/contratos/qualquer")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/contratos/{contratoId}")).StatusCode);
    }

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
