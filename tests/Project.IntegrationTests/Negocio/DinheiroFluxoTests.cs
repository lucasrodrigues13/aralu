using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class DinheiroFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public DinheiroFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Parcelas_do_casal_recebi_desfazer_despesa_e_isolamento()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Ana", segundoNome = "Rui" }));
        var eventoId = evento.GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/contrato", new { valor = 0, quantidadeParcelas = 2, primeiraParcela = "2027-01-10" })).StatusCode);

        var comParcelas = await Ler(await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/contrato", new
        {
            valor = 9000,
            quantidadeParcelas = 3,
            primeiraParcela = "2027-01-10",
            comEntrada = true,
            baseEntrada = "Valor",
            valorEntrada = 3000,
            dataEntrada = "2026-12-01",
        }));
        Assert.Equal(9000m, comParcelas.GetProperty("valorContrato").GetDecimal());
        var parcelas = comParcelas.GetProperty("parcelas");
        Assert.Equal(4, parcelas.GetArrayLength());
        Assert.True(parcelas[0].GetProperty("entrada").GetBoolean());
        Assert.Equal(2000m, parcelas[1].GetProperty("valor").GetDecimal());
        var entradaId = parcelas[0].GetProperty("id").GetGuid();

        var demais = await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/parcelas/{entradaId}/recebimentos", new { valor = 3500, forma = "Pix", data = "2026-12-01" });
        Assert.Equal(HttpStatusCode.BadRequest, demais.StatusCode);

        var parcial = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/parcelas/{entradaId}/recebimentos", new { valor = 1000, forma = "Pix", data = "2026-12-01" }));
        Assert.Equal(1000m, parcial.GetProperty("recebido").GetDecimal());
        Assert.Equal(8000m, parcial.GetProperty("saldo").GetDecimal());
        Assert.Equal("Parcial", parcial.GetProperty("parcelas")[0].GetProperty("situacao").GetString());

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/contrato", new { valor = 5000, quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);

        var desfeito = await Ler(await dono.DeleteAsync($"/api/v1/eventos/{eventoId}/dinheiro/parcelas/{entradaId}/recebimentos/ultimo"));
        Assert.Equal(0m, desfeito.GetProperty("recebido").GetDecimal());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.DeleteAsync($"/api/v1/eventos/{eventoId}/dinheiro/parcelas/{entradaId}/recebimentos/ultimo")).StatusCode);

        var comDespesa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/lancamentos", new { tipo = "Despesa", categoria = "Transporte", valor = 150, data = "2026-11-20" }));
        Assert.Equal(150m, comDespesa.GetProperty("despesas").GetDecimal());

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/parcelas/{entradaId}/recebimentos", new { valor = 10, forma = "Pix", data = "2026-12-01" })).StatusCode);

        var planilha = await dono.GetAsync($"/api/v1/eventos/{eventoId}/budget/planilha");
        Assert.Equal(HttpStatusCode.OK, planilha.StatusCode);
        Assert.Equal(200, (int)(await outra.GetAsync("/api/v1/pagamentos")).StatusCode);
    }

    [Fact]
    public async Task Hoje_conta_tarefas_de_hoje_e_mostra_o_proximo_evento()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Bia", segundoNome = "Leo", data = hoje.AddDays(10).ToString("yyyy-MM-dd") }));
        var eventoId = evento.GetProperty("id").GetGuid();
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Ligar", prazo = hoje.ToString("yyyy-MM-dd") }));
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Atrasada", prazo = hoje.AddDays(-3).ToString("yyyy-MM-dd") }));

        var painel = await Ler(await dono.GetAsync("/api/v1/hoje"));
        Assert.Equal(1, painel.GetProperty("tarefasHoje").GetInt32());
        Assert.Equal(1, painel.GetProperty("tarefasAtrasadas").GetInt32());
        Assert.Equal(10, painel.GetProperty("proximoEvento").GetProperty("dias").GetInt32());

        var alheio = await Ler(await outra.GetAsync("/api/v1/hoje"));
        Assert.Equal(0, alheio.GetProperty("tarefasHoje").GetInt32());
        Assert.Empty(alheio.GetProperty("carteira").EnumerateArray());
    }

    [Fact]
    public async Task Comprovante_aceita_pdf_recusa_outro_tipo_e_exclui()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Gil", segundoNome = "Ana" }));
        var eventoId = evento.GetProperty("id").GetGuid();

        using var texto = new MultipartFormDataContent { { new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("oi")), "arquivo", "nota.txt" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"/api/v1/eventos/{eventoId}/dinheiro/comprovantes", texto)).StatusCode);

        var grande = new byte[5 * 1024 * 1024 + 10];
        System.Text.Encoding.ASCII.GetBytes("%PDF-1.4").CopyTo(grande, 0);
        using var excesso = new MultipartFormDataContent { { new ByteArrayContent(grande), "arquivo", "grande.pdf" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"/api/v1/eventos/{eventoId}/dinheiro/comprovantes", excesso)).StatusCode);

        using var pdf = new MultipartFormDataContent
        {
            { new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n%%EOF")), "arquivo", "recibo.pdf" },
            { new StringContent("Sinal do buffet"), "descricao" },
        };
        var comPdf = await Ler(await dono.PostAsync($"/api/v1/eventos/{eventoId}/dinheiro/comprovantes", pdf));
        var comprovante = comPdf.GetProperty("comprovantes")[0];
        Assert.Equal("recibo.pdf", comprovante.GetProperty("nome").GetString());
        Assert.Equal("application/pdf", comprovante.GetProperty("tipoConteudo").GetString());

        var arquivoId = comprovante.GetProperty("arquivoId").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dono.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);

        var semComprovante = await Ler(await dono.DeleteAsync($"/api/v1/eventos/{eventoId}/dinheiro/comprovantes/{comprovante.GetProperty("id").GetGuid()}"));
        Assert.Empty(semComprovante.GetProperty("comprovantes").EnumerateArray());
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
