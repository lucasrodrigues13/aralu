using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Project.Domain.Assinaturas;
using Project.Infrastructure.Assinaturas;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062 R11 e §7: controle diário (situação, avisos sem repetição, fim do desconto) e aceite de termos.</summary>
[Collection(ColecaoApi.Nome)]
public class ControleDiarioTests
{
    private const string Senha = "ceu-de-junho-42";
    private readonly BancoFixture _banco;

    public ControleDiarioTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Cadastro_exige_aceite_dos_termos_e_grava_a_versao()
    {
        var cliente = _banco.Fabrica.CreateClient();
        var sem = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email = $"t-{Guid.NewGuid():N}@aralu.test", senha = Senha, confirmacao = Senha });
        Assert.Equal(HttpStatusCode.BadRequest, sem.StatusCode);
        Assert.Contains("Aceite os termos", await sem.Content.ReadAsStringAsync());

        var (_, contaId, _) = await EntrarDono();
        await using var banco = Banco();
        var conta = await banco.Contas.SingleAsync(item => item.Id == contaId);
        Assert.NotNull(conta.AceiteTermosEm);
        Assert.Equal(Project.Infrastructure.Conta.CadastroDeConta.VersaoTermos, conta.VersaoTermos);
    }

    [Fact]
    public async Task Trial_avisa_nos_dias_11_13_e_14_sem_repetir_e_expira_no_15o()
    {
        var (_, contaId, email) = await EntrarDono();
        int Avisos() => _banco.Fabrica.Email.Mensagens.Count(item => item.Email == email && item.Assunto is { } a && a.Contains("teste na Aralu"));

        await IniciouHa(contaId, dias: 10); // 11º dia
        await Rodar();
        await Rodar();
        Assert.Equal(1, Avisos());

        await IniciouHa(contaId, dias: 12); // 13º dia
        await Rodar();
        Assert.Equal(2, Avisos());

        await IniciouHa(contaId, dias: 13); // 14º dia
        await Rodar();
        Assert.Equal(3, Avisos());
        Assert.Contains(_banco.Fabrica.Email.Mensagens, item => item.Email == email && item.Assunto == "Hoje é o último dia do seu teste na Aralu");

        await IniciouHa(contaId, dias: 14); // 15º dia
        await Rodar();
        Assert.Equal(SituacaoAssinatura.Expirada, (await Assinatura(contaId)).Situacao);
        Assert.Equal(3, Avisos());
    }

    [Fact]
    public async Task Atraso_avisa_no_1o_e_no_4o_dia_e_bloqueia_no_6o()
    {
        var (_, contaId, email) = await EntrarDono();
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        int Avisos() => _banco.Fabrica.Email.Mensagens.Count(item => item.Email == email && item.Assunto == "Pagamento da Aralu em aberto");

        await Mudar(contaId, item => { item.Situacao = SituacaoAssinatura.EmAtraso; item.ProximoVencimento = hoje.AddDays(-1); });
        await Rodar();
        Assert.Equal(1, Avisos());

        await Mudar(contaId, item => item.ProximoVencimento = hoje.AddDays(-4));
        await Rodar();
        await Rodar();
        Assert.Equal(1, Avisos() - 1);

        await Mudar(contaId, item => item.ProximoVencimento = hoje.AddDays(-6));
        await Rodar();
        Assert.Equal(SituacaoAssinatura.Bloqueada, (await Assinatura(contaId)).Situacao);
    }

    [Fact]
    public async Task Desconto_avisa_7_dias_antes_e_o_valor_cheio_vai_ao_asaas_depois_do_fim()
    {
        var (dona, contaId, email) = await EntrarDono();
        await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = "11144477735", nomeCobranca = "X", formaPagamento = "pix" }));
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var assinaturaId = (await Assinatura(contaId)).AsaasSubscriptionId!;
        await Mudar(contaId, item =>
        {
            item.Situacao = SituacaoAssinatura.Ativa;
            item.DescontoPercentual = 30m;
            item.DescontoAte = hoje.AddDays(5);
            item.ProximoVencimento = hoje.AddDays(3);
            item.Valor = 125.30m;
        });

        await Rodar();
        Assert.Single(_banco.Fabrica.Email.Mensagens, item => item.Email == email && item.Assunto == "Seu desconto na Aralu termina em 7 dias");
        Assert.Equal(125.30m, (await Assinatura(contaId)).Valor);

        // T18: a primeira cobrança depois do fim volta a R$ 179, e o Asaas recebe o valor cheio.
        await Mudar(contaId, item => item.ProximoVencimento = hoje.AddDays(33));
        await Rodar();
        Assert.Equal(179m, (await Assinatura(contaId)).Valor);
        Assert.Equal(179m, _banco.Fabrica.Asaas.ValoresAtualizados[assinaturaId]);
    }

    [Fact]
    public async Task Pagamento_confirmado_manda_um_e_mail_so()
    {
        var (dona, contaId, email) = await EntrarDono();
        var resposta = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = "52998224725", nomeCobranca = "X", formaPagamento = "cartao" }));
        var vencimento = resposta.GetProperty("vencimento").GetString()!;
        var assinaturaId = (await Assinatura(contaId)).AsaasSubscriptionId!;
        var http = _banco.Fabrica.CreateClient();
        http.DefaultRequestHeaders.Add("asaas-access-token", AsaasDeTeste.TokenWebhook);
        foreach (var evento in new[] { "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED" })
        {
            var aviso = JsonSerializer.Serialize(new
            {
                id = $"evt_{Guid.NewGuid():N}",
                @event = evento,
                payment = new { id = AsaasDeTeste.PagamentoDe(assinaturaId), subscription = assinaturaId, value = 179m, dueDate = vencimento, status = "CONFIRMED", billingType = "CREDIT_CARD" },
            });
            Assert.Equal(HttpStatusCode.OK, (await http.PostAsync("/api/v1/webhooks/asaas", new StringContent(aviso, Encoding.UTF8, "application/json"))).StatusCode);
        }

        // Confirmado e recebido são do mesmo pagamento: um e-mail só.
        Assert.Single(_banco.Fabrica.Email.Mensagens, item => item.Email == email && item.Assunto == "Pagamento confirmado na Aralu");
    }

    private async Task Rodar()
    {
        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        await escopo.ServiceProvider.GetRequiredService<AvisosAssinaturaServico>().RodarAsync(DateTimeOffset.UtcNow, CancellationToken.None);
    }

    /// <summary>Move o trial para ter começado há N dias (o dia de hoje é o N+1º).</summary>
    private Task IniciouHa(Guid contaId, int dias) => Mudar(contaId, item =>
    {
        item.TrialIniciaEm = DateTimeOffset.UtcNow.AddDays(-dias).AddMinutes(-1);
        item.TrialTerminaEm = item.TrialIniciaEm.AddDays(Project.Domain.Assinaturas.Assinatura.DiasDeTrial);
    });

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

    private async Task<(HttpClient Cliente, Guid ContaId, string Email)> EntrarDono()
    {
        var email = $"org-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        var usuarioId = query["usuarioId"].ToString();
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId, token = query["token"].ToString() })).StatusCode);
        var sessao = await Ler(await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha }));
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.GetProperty("token").GetString());
        return (cliente, Guid.Parse(usuarioId), email);
    }

    private static async Task<JsonElement> Ler(HttpResponseMessage resposta)
    {
        var texto = await resposta.Content.ReadAsStringAsync();
        Assert.True(resposta.IsSuccessStatusCode, texto);
        using var documento = JsonDocument.Parse(texto);
        return documento.RootElement.Clone();
    }
}
