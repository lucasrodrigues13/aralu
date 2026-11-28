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
    private const string Senha = "ceu-de-junho-42";
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
        var marcas = campos.GetProperty("campos").EnumerateArray().Select(item => item.GetProperty("marca").GetString()).ToArray();
        Assert.Contains("evento_data", marcas);
        Assert.Contains("contrato_valor", marcas);
        Assert.Contains("contrato_parcelas", marcas);

        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Casamento clássico", tipo = "Casamento" }));
        var modeloId = modelo.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/modelos/{modeloId}/contratos")).StatusCode);

        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Lia", segundoNome = "Caio" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/eventos/{eventoId}/contratos")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _banco.Fabrica.CreateClient().GetAsync("/api/v1/publico/contratos/qualquer")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/contratos/{contratoId}")).StatusCode);
    }

    [Fact]
    public async Task Logo_e_fundo_do_modelo_sao_da_conta_e_aceitam_so_imagem()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos", new { nome = "Com imagens", texto = "Texto" }));
        var id = modelo.GetProperty("id").GetGuid();
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0 };

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"/api/v1/contratos/{id}/logo", Formulario(new byte[] { 1, 2, 3, 4 }, "logo.png"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsync($"/api/v1/contratos/{id}/logo", Formulario(png, "logo.png"))).StatusCode);

        var logo = await Ler(await dono.PostAsync($"/api/v1/contratos/{id}/logo", Formulario(png, "logo.png")));
        var fundo = await Ler(await dono.PostAsync($"/api/v1/contratos/{id}/fundo", Formulario(png, "fundo.png")));
        var lido = await Ler(await dono.GetAsync($"/api/v1/contratos/{id}"));
        Assert.Equal(logo.GetProperty("arquivoId").GetGuid(), lido.GetProperty("logoArquivoId").GetGuid());
        Assert.Equal(fundo.GetProperty("arquivoId").GetGuid(), lido.GetProperty("fundoArquivoId").GetGuid());

        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/contratos/{id}/logo")).StatusCode);
        lido = await Ler(await dono.GetAsync($"/api/v1/contratos/{id}"));
        Assert.Equal(JsonValueKind.Null, lido.GetProperty("logoArquivoId").ValueKind);
        Assert.NotEqual(JsonValueKind.Null, lido.GetProperty("fundoArquivoId").ValueKind);
    }

    private static MultipartFormDataContent Formulario(byte[] conteudo, string nome)
    {
        var parte = new ByteArrayContent(conteudo);
        parte.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        return new MultipartFormDataContent { { parte, "arquivo", nome } };
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"pessoa-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        var cadastro = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });
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
