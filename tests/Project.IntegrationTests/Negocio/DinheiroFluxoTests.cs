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
    public async Task Parcelas_nascem_no_orcamento_vao_para_o_contrato_e_o_cliente_paga_ali()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var oportunidade = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Ana e Rui",
            estagio = "Contato inicial",
            contatos = new[] { new { nome = "Ana", telefone = "11977776666" } },
        }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();
        var orcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId, conteudo = "Proposta", valor = 9000 }));
        var orcamentoId = orcamento.GetProperty("id").GetGuid();
        var urlParcelas = $"/api/v1/orcamentos-funil/{orcamentoId}/parcelas";

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(urlParcelas, new { quantidadeParcelas = 0, primeiraParcela = "2027-01-10" })).StatusCode);
        var comParcelas = await Ler(await dono.PutAsJsonAsync(urlParcelas, new
        {
            quantidadeParcelas = 3,
            primeiraParcela = "2027-01-10",
            comEntrada = true,
            baseEntrada = "Valor",
            valorEntrada = 3000,
            dataEntrada = "2026-12-01",
        }));
        var doOrcamento = comParcelas.GetProperty("parcelas");
        Assert.Equal(4, doOrcamento.GetArrayLength());
        Assert.True(doOrcamento[0].GetProperty("entrada").GetBoolean());
        Assert.Equal(2000m, doOrcamento[1].GetProperty("valor").GetDecimal());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync(urlParcelas, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);

        // Contrato gerado sem orçamento aceito: nasce sem parcelas.
        var semAceite = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId, conteudo = "Contrato" }));
        Assert.Empty(semAceite.GetProperty("parcelas").EnumerateArray());

        // Orçamento aceito: o contrato novo copia as parcelas.
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/responder", new { tipo = "Aceitar" })).StatusCode);
        var contrato = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId, conteudo = "Contrato" }));
        var contratoId = contrato.GetProperty("id").GetGuid();
        var parcelas = contrato.GetProperty("parcelas");
        Assert.Equal(4, parcelas.GetArrayLength());
        Assert.Equal(9000m, contrato.GetProperty("valorTotal").GetDecimal());
        var entradaId = parcelas[0].GetProperty("id").GetGuid();
        var urlRecebimento = $"/api/v1/contratos-funil/{contratoId}/parcelas/{entradaId}/recebimentos";

        var demais = await dono.PostAsJsonAsync(urlRecebimento, new { valor = 3500, forma = "Pix", data = "2026-12-01" });
        Assert.Equal(HttpStatusCode.BadRequest, demais.StatusCode);

        var parcial = await Ler(await dono.PostAsJsonAsync(urlRecebimento, new { valor = 1000, forma = "Pix", data = "2026-12-01" }));
        Assert.Equal(1000m, parcial.GetProperty("recebido").GetDecimal());
        Assert.Equal(8000m, parcial.GetProperty("saldo").GetDecimal());
        Assert.Equal("Parcial", parcial.GetProperty("parcelas")[0].GetProperty("situacao").GetString());
        Assert.Equal("11977776666", parcial.GetProperty("oportunidadeTelefone").GetString());

        var desfeito = await Ler(await dono.DeleteAsync($"{urlRecebimento}/ultimo"));
        Assert.Equal(0m, desfeito.GetProperty("recebido").GetDecimal());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.DeleteAsync($"{urlRecebimento}/ultimo")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsJsonAsync(urlRecebimento, new { valor = 10, forma = "Pix", data = "2026-12-01" })).StatusCode);

        // A tela Hoje cobra a entrada, que está vencida desde 01/12/2026 ou dentro da semana, conforme a data de hoje.
        var painel = await Ler(await dono.GetAsync("/api/v1/hoje"));
        Assert.All(painel.GetProperty("cobrancas").EnumerateArray(), item => Assert.Equal(contratoId, item.GetProperty("contratoId").GetGuid()));
    }

    [Fact]
    public async Task Gestao_financeira_define_o_parcelamento_do_contrato_ate_o_primeiro_recebimento()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var oportunidade = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new { nome = "Casamento Bia e Leo", estagio = "Contato inicial" }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();
        var orcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId, conteudo = "Proposta", valor = 6000 }));
        var orcamentoId = orcamento.GetProperty("id").GetGuid();

        // Sem orçamento aceito, não há valor para parcelar.
        var semAceite = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId, conteudo = "Contrato" }));
        var semAceiteUrl = $"/api/v1/contratos-funil/{semAceite.GetProperty("id").GetGuid()}/parcelas";
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(semAceiteUrl, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/responder", new { tipo = "Aceitar" })).StatusCode);
        var url = semAceiteUrl;

        // À vista (uma parcela) e depois em três: a segunda definição substitui a primeira.
        var avista = await Ler(await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" }));
        Assert.Equal(1, avista.GetProperty("parcelas").GetArrayLength());
        Assert.Equal(6000m, avista.GetProperty("valorTotal").GetDecimal());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 0, primeiraParcela = "2027-01-10" })).StatusCode);
        var emTres = await Ler(await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 3, primeiraParcela = "2027-01-10" }));
        var parcelas = emTres.GetProperty("parcelas");
        Assert.Equal(3, parcelas.GetArrayLength());
        Assert.Equal(2000m, parcelas[0].GetProperty("valor").GetDecimal());

        // Com recebimento registrado, não refaz; depois de desfeito, refaz.
        var recebimento = $"{url}/{parcelas[0].GetProperty("id").GetGuid()}/recebimentos";
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync(recebimento, new { valor = 500, forma = "Pix", data = "2027-01-10" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"{recebimento}/ultimo")).StatusCode);
        Assert.Equal(2, (await Ler(await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10" }))).GetProperty("parcelas").GetArrayLength());

        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync(url, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);

        // Cancelado não parcela.
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsync($"/api/v1/contratos-funil/{semAceite.GetProperty("id").GetGuid()}/cancelar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);
    }

    [Fact]
    public async Task Despesa_planilha_de_budget_e_isolamento_do_dinheiro_do_evento()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Ana", segundoNome = "Rui" }));
        var eventoId = evento.GetProperty("id").GetGuid();

        var comDespesa = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/dinheiro/lancamentos", new { tipo = "Despesa", categoria = "Transporte", valor = 150, data = "2026-11-20" }));
        Assert.Equal(150m, comDespesa.GetProperty("despesas").GetDecimal());

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro")).StatusCode);

        var planilha = await dono.GetAsync($"/api/v1/eventos/{eventoId}/budget/planilha");
        Assert.Equal(HttpStatusCode.OK, planilha.StatusCode);
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
