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
    public async Task Contrato_vai_do_modelo_ao_evento_e_o_casal_le_pelo_link()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/contratos", new { nome = "Sem texto", texto = " " })).StatusCode);
        var contrato = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos", new
        {
            nome = "Prestação de serviços",
            texto = "Contratante: {{contratante_nome}} ({{contratante_documento}}). Evento {{evento_nome}}. Valor {{contrato_valor}}.",
        }));
        var contratoId = contrato.GetProperty("id").GetGuid();
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/contratos"))).EnumerateArray());

        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Casamento clássico", tipo = "Casamento" }));
        var modeloId = modelo.GetProperty("id").GetGuid();
        await Ler(await dono.PutAsJsonAsync($"/api/v1/modelos/{modeloId}/contratos", new { contratoIds = new[] { contratoId } }));
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync($"/api/v1/modelos/{modeloId}/contratos", new { contratoIds = new[] { contratoId } })).StatusCode);

        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { modeloId, tipo = "Casamento", primeiroNome = "Lia", segundoNome = "Caio" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var doEvento = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/contratos"));
        Assert.Equal(contratoId, doEvento.GetProperty("contratos")[0].GetProperty("id").GetGuid());

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/contratos/{contratoId}/enviar", new { })).StatusCode);

        var cliente = await Ler(await dono.PostAsJsonAsync("/api/v1/clientes", new { nome = "Lia Souza", papel = "Noiva", email = "lia@exemplo.com", ddi = "+55", celular = "11988887777", cpf = "12345678900" }));
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/clientes", new { clienteId = cliente.GetProperty("id").GetGuid() }));
        await Ler(await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/contrato", new { valor = 5000, quantidadeParcelas = 1, primeiraParcela = "2027-01-10" }));

        var texto = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/contratos/{contratoId}/texto"));
        var preenchido = texto.GetProperty("texto").GetString()!;
        Assert.Contains("Lia Souza", preenchido);
        Assert.Contains("5.000,00", preenchido);
        Assert.DoesNotContain("{{", preenchido);

        var envio = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/contratos/{contratoId}/enviar", new { }));
        Assert.Equal("lia@exemplo.com", envio.GetProperty("email").GetString());
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == "lia@exemplo.com" && item.Tipo == "texto");
        var token = mensagem.Corpo.Split("/contrato/")[1].Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0].Trim();

        var anonimo = _banco.Fabrica.CreateClient();
        var publico = await Ler(await anonimo.GetAsync($"/api/v1/publico/contratos/{token}"));
        Assert.Contains("Lia Souza", publico.GetProperty("texto").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync("/api/v1/publico/contratos/token-invalido")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}/contratos/{contratoId}/texto")).StatusCode);

        var removido = await Ler(await dono.DeleteAsync($"/api/v1/eventos/{eventoId}/contratos/{contratoId}"));
        Assert.Empty(removido.GetProperty("contratos").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/eventos/{eventoId}/contratos/{contratoId}/texto")).StatusCode);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"pessoa-{Guid.NewGuid():N}@gevents.test";
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
