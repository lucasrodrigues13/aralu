using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Project.Domain.Assinaturas;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062 parte B com o Asaas simulado: vencimento da primeira cobrança, avisos idempotentes, cancelamento.</summary>
[Collection(ColecaoApi.Nome)]
public class AssinaturaAsaasTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public AssinaturaAsaasTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Assinar_no_5o_dia_vence_no_14o_e_o_pagamento_confirmado_ativa_uma_vez_so()
    {
        var (dona, contaId) = await EntrarDono();
        // T3: cadastro há 4 dias = hoje é o 5º dia do trial.
        var cadastro = DateTimeOffset.UtcNow.AddDays(-4);
        await Mudar(contaId, item => { item.TrialIniciaEm = cadastro; item.TrialTerminaEm = cadastro.AddDays(14); });

        var resposta = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = CpfNovo(), nomeCobranca = "Assessoria Teste", formaPagamento = "pix" }));

        var esperado = DateOnly.FromDateTime(cadastro.AddDays(13).UtcDateTime);
        Assert.Equal(esperado, DateOnly.Parse(resposta.GetProperty("vencimento").GetString()!));
        Assert.Equal(179m, resposta.GetProperty("valor").GetDecimal());
        Assert.StartsWith("https://sandbox.asaas.com/i/", resposta.GetProperty("linkPagamento").GetString());
        // Diagnóstico no navegador (staging): o passo a passo das chamadas ao Asaas.
        var passos = resposta.GetProperty("diagnostico").EnumerateArray().Select(item => item.GetProperty("passo").GetString()).ToArray();
        Assert.Equal(["Criar cliente", "Criar assinatura", "Listar cobranças da assinatura"], passos);
        var situacao = await Ler(await dona.GetAsync("/api/v1/assinatura"));
        Assert.Equal("Trial", situacao.GetProperty("situacao").GetString());
        Assert.True(situacao.GetProperty("assinada").GetBoolean());

        // T16: o mesmo aviso chega duas vezes; a conta muda uma vez só.
        var assinaturaId = (await Assinatura(contaId)).AsaasSubscriptionId!;
        var aviso = Aviso("PAYMENT_CONFIRMED", assinaturaId, esperado);
        var primeiro = await Ler(await Avisar(aviso));
        var segundo = await Ler(await Avisar(aviso));
        Assert.False(primeiro.GetProperty("repetido").GetBoolean());
        Assert.True(segundo.GetProperty("repetido").GetBoolean());

        var ativa = await Assinatura(contaId);
        Assert.Equal(SituacaoAssinatura.Ativa, ativa.Situacao);
        Assert.Equal(esperado.AddMonths(1).AddDays(-1), ativa.PagoAte);
        Assert.Equal(esperado.AddMonths(1), ativa.ProximoVencimento);
        var faturas = await Ler(await dona.GetAsync("/api/v1/assinatura/faturas"));
        Assert.Single(faturas.EnumerateArray());
        Assert.Equal("CONFIRMED", faturas[0].GetProperty("status").GetString());
        var eventos = await Ler(await dona.GetAsync("/api/v1/assinatura/diagnostico"));
        Assert.Single(eventos.EnumerateArray());
    }

    [Fact]
    public async Task Documento_que_ja_assinou_em_outra_conta_vence_no_dia()
    {
        var documento = CpfNovo();
        var (primeira, _) = await EntrarDono();
        await Ler(await primeira.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento, nomeCobranca = "Primeira", formaPagamento = "cartao" }));

        var (segunda, _) = await EntrarDono();
        var resposta = await Ler(await segunda.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento, nomeCobranca = "Segunda", formaPagamento = "pix" }));

        // T4
        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.Parse(resposta.GetProperty("vencimento").GetString()!));
    }

    [Fact]
    public async Task Documento_invalido_e_membro_nao_assinam_e_aviso_sem_token_e_recusado()
    {
        var (dona, _) = await EntrarDono();
        var invalido = await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = "111.111.111-11", nomeCobranca = "X", formaPagamento = "pix" });
        Assert.Equal(HttpStatusCode.BadRequest, invalido.StatusCode);
        Assert.Contains("Confira o CPF ou CNPJ", await invalido.Content.ReadAsStringAsync());

        var email = $"ass-{Guid.NewGuid():N}@aralu.test";
        await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Ana", email }));
        var membro = await AceitarEEntrar(email);
        Assert.Equal(HttpStatusCode.Forbidden, (await membro.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = CpfNovo(), nomeCobranca = "X", formaPagamento = "pix" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await membro.GetAsync("/api/v1/assinatura")).StatusCode);

        var semToken = await _banco.Fabrica.CreateClient().PostAsync("/api/v1/webhooks/asaas", new StringContent("{}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Unauthorized, semToken.StatusCode);
    }

    [Fact]
    public async Task Cancelar_depois_de_pago_libera_ate_o_fim_do_periodo_e_estorno_bloqueia()
    {
        var (dona, contaId) = await EntrarDono();
        var resposta = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = CpfNovo(), nomeCobranca = "Assessoria", formaPagamento = "cartao" }));
        var vencimento = DateOnly.Parse(resposta.GetProperty("vencimento").GetString()!);
        var assinaturaId = (await Assinatura(contaId)).AsaasSubscriptionId!;
        await Ler(await Avisar(Aviso("PAYMENT_RECEIVED", assinaturaId, vencimento)));

        Assert.Equal(HttpStatusCode.OK, (await dona.PostAsync("/api/v1/assinatura/cancelar", null)).StatusCode);
        Assert.Contains(assinaturaId, _banco.Fabrica.Asaas.Canceladas);
        var cancelada = await Assinatura(contaId);
        Assert.Equal(SituacaoAssinatura.Cancelada, cancelada.Situacao);
        Assert.Equal(HttpStatusCode.OK, (await dona.GetAsync("/api/v1/eventos")).StatusCode);

        await Ler(await Avisar(Aviso("PAYMENT_REFUNDED", assinaturaId, vencimento)));
        Assert.Equal(HttpStatusCode.PaymentRequired, (await dona.GetAsync("/api/v1/eventos")).StatusCode);
    }

    [Fact]
    public async Task Reativar_no_periodo_pago_volta_a_ativa_sem_cobrar_agora()
    {
        var (dona, contaId) = await EntrarDono();
        var resposta = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = CpfNovo(), nomeCobranca = "Assessoria", formaPagamento = "cartao" }));
        var vencimento = DateOnly.Parse(resposta.GetProperty("vencimento").GetString()!);
        var primeira = (await Assinatura(contaId)).AsaasSubscriptionId!;
        await Ler(await Avisar(Aviso("PAYMENT_CONFIRMED", primeira, vencimento)));
        Assert.Equal(HttpStatusCode.OK, (await dona.PostAsync("/api/v1/assinatura/cancelar", null)).StatusCode);
        var pagoAte = (await Assinatura(contaId)).PagoAte!.Value;

        var reativada = await Ler(await dona.PostAsync("/api/v1/assinatura/reativar", null));

        var depois = await Assinatura(contaId);
        Assert.Equal(SituacaoAssinatura.Ativa, depois.Situacao);
        Assert.NotEqual(primeira, depois.AsaasSubscriptionId);
        Assert.Null(depois.CanceladaEm);
        Assert.Equal(pagoAte.AddDays(1), DateOnly.Parse(reativada.GetProperty("vencimento").GetString()!));
        Assert.Equal(pagoAte.AddDays(1), _banco.Fabrica.Asaas.Assinaturas[depois.AsaasSubscriptionId!].Vencimento);

        // Já ativa: reativar de novo é recusado e assinar não cria uma segunda assinatura.
        Assert.Equal(HttpStatusCode.BadRequest, (await dona.PostAsync("/api/v1/assinatura/reativar", null)).StatusCode);
        await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = CpfNovo(), nomeCobranca = "Assessoria", formaPagamento = "pix" }));
        Assert.Equal(depois.AsaasSubscriptionId, (await Assinatura(contaId)).AsaasSubscriptionId);
    }

    [Fact]
    public async Task Assinar_de_novo_no_periodo_pago_nao_cobra_agora_e_fica_ativa()
    {
        var (dona, contaId) = await EntrarDono();
        var documento = CpfNovo();
        var resposta = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento, nomeCobranca = "Assessoria", formaPagamento = "cartao" }));
        var vencimento = DateOnly.Parse(resposta.GetProperty("vencimento").GetString()!);
        await Ler(await Avisar(Aviso("PAYMENT_CONFIRMED", (await Assinatura(contaId)).AsaasSubscriptionId!, vencimento)));
        Assert.Equal(HttpStatusCode.OK, (await dona.PostAsync("/api/v1/assinatura/cancelar", null)).StatusCode);
        var pagoAte = (await Assinatura(contaId)).PagoAte!.Value;

        var novamente = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento, nomeCobranca = "Assessoria", formaPagamento = "pix" }));

        Assert.Equal(pagoAte.AddDays(1), DateOnly.Parse(novamente.GetProperty("vencimento").GetString()!));
        Assert.Equal(SituacaoAssinatura.Ativa, (await Assinatura(contaId)).Situacao);
    }

    [Fact]
    public async Task Pagamento_de_assinatura_nova_depois_do_periodo_ativa_a_conta()
    {
        var (dona, contaId) = await EntrarDono();
        var documento = CpfNovo();
        var resposta = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento, nomeCobranca = "Assessoria", formaPagamento = "cartao" }));
        var vencimento = DateOnly.Parse(resposta.GetProperty("vencimento").GetString()!);
        await Ler(await Avisar(Aviso("PAYMENT_CONFIRMED", (await Assinatura(contaId)).AsaasSubscriptionId!, vencimento)));
        Assert.Equal(HttpStatusCode.OK, (await dona.PostAsync("/api/v1/assinatura/cancelar", null)).StatusCode);
        await Mudar(contaId, item => item.PagoAte = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1));
        Assert.Equal(HttpStatusCode.BadRequest, (await dona.PostAsync("/api/v1/assinatura/reativar", null)).StatusCode);

        var nova = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento, nomeCobranca = "Assessoria", formaPagamento = "pix" }));
        var novoVencimento = DateOnly.Parse(nova.GetProperty("vencimento").GetString()!);
        Assert.Equal(SituacaoAssinatura.Bloqueada, (await Assinatura(contaId)).Situacao);

        await Ler(await Avisar(Aviso("PAYMENT_RECEIVED", (await Assinatura(contaId)).AsaasSubscriptionId!, novoVencimento)));
        Assert.Equal(SituacaoAssinatura.Ativa, (await Assinatura(contaId)).Situacao);
    }

    private Task<HttpResponseMessage> Avisar(string corpo)
    {
        var http = _banco.Fabrica.CreateClient();
        http.DefaultRequestHeaders.Add("asaas-access-token", AsaasDeTeste.TokenWebhook);
        return http.PostAsync("/api/v1/webhooks/asaas", new StringContent(corpo, Encoding.UTF8, "application/json"));
    }

    private static string Aviso(string evento, string assinaturaId, DateOnly vencimento) => JsonSerializer.Serialize(new
    {
        id = $"evt_{Guid.NewGuid():N}",
        @event = evento,
        payment = new
        {
            id = AsaasDeTeste.PagamentoDe(assinaturaId),
            subscription = assinaturaId,
            value = 179m,
            dueDate = vencimento.ToString("yyyy-MM-dd"),
            status = evento == "PAYMENT_REFUNDED" ? "REFUNDED" : "CONFIRMED",
            billingType = "PIX",
            invoiceUrl = $"https://sandbox.asaas.com/i/{assinaturaId}",
        },
    });

    /// <summary>CPF válido e diferente a cada teste (o banco de testes guarda os documentos que já assinaram).</summary>
    private static string CpfNovo()
    {
        var digitos = Enumerable.Range(0, 9).Select(_ => Random.Shared.Next(10)).ToList();
        if (digitos.Distinct().Count() == 1)
        {
            digitos[0] = (digitos[0] + 1) % 10;
        }

        for (var tamanho = 9; tamanho <= 10; tamanho++)
        {
            var soma = 0;
            for (var i = 0; i < tamanho; i++)
            {
                soma += digitos[i] * (tamanho + 1 - i);
            }

            var resto = soma % 11;
            digitos.Add(resto < 2 ? 0 : 11 - resto);
        }

        return string.Concat(digitos);
    }

    private async Task Mudar(Guid contaId, Action<Assinatura> mudar)
    {
        await using var banco = Banco();
        var assinatura = await banco.Assinaturas.IgnoreQueryFilters().SingleAsync(item => item.ContaId == contaId);
        mudar(assinatura);
        await banco.SaveChangesAsync();
    }

    private async Task<Assinatura> Assinatura(Guid contaId)
    {
        await using var banco = Banco();
        return await banco.Assinaturas.IgnoreQueryFilters().AsNoTracking().SingleAsync(item => item.ContaId == contaId);
    }

    private AppDbContext Banco() => new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options);

    private async Task<(HttpClient Cliente, Guid ContaId)> EntrarDono()
    {
        var email = $"org-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        var usuarioId = query["usuarioId"].ToString();
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId, token = query["token"].ToString() })).StatusCode);
        return (await Entrar(cliente, email), Guid.Parse(usuarioId));
    }

    private async Task<HttpClient> AceitarEEntrar(string email)
    {
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "texto");
        var link = mensagem.Corpo[mensagem.Corpo.IndexOf("http", StringComparison.Ordinal)..].Trim();
        var query = QueryHelpers.ParseQuery(new Uri(link).Query);
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/aceitar-convite", new { usuarioId = query["usuarioId"].ToString(), token = query["token"].ToString(), senha = Senha, confirmacao = Senha })).StatusCode);
        return await Entrar(cliente, email);
    }

    private static async Task<HttpClient> Entrar(HttpClient cliente, string email)
    {
        var sessao = await Ler(await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha }));
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.GetProperty("token").GetString());
        return cliente;
    }

    private static async Task<JsonElement> Ler(HttpResponseMessage resposta)
    {
        var texto = await resposta.Content.ReadAsStringAsync();
        Assert.True(resposta.IsSuccessStatusCode, texto);
        using var documento = JsonDocument.Parse(texto);
        return documento.RootElement.Clone();
    }
}
