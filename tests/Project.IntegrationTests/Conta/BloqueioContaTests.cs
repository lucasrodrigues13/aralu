using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Project.Domain.Assinaturas;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062 parte A e §7: trial no cadastro, bloqueio para todos, link do cliente segue, nada se apaga.</summary>
[Collection(ColecaoApi.Nome)]
public class BloqueioContaTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public BloqueioContaTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Cadastro_abre_trial_de_14_dias_no_plano_padrao()
    {
        var (dona, _) = await EntrarDono();

        var situacao = await Ler(await dona.GetAsync("/api/v1/assinatura"));

        Assert.Equal("Trial", situacao.GetProperty("situacao").GetString());
        Assert.True(situacao.GetProperty("liberada").GetBoolean());
        Assert.Equal(14, situacao.GetProperty("diasRestantesTrial").GetInt32());
        Assert.Equal("Pro", situacao.GetProperty("plano").GetString());
        Assert.Equal(179m, situacao.GetProperty("valor").GetDecimal());
    }

    [Fact]
    public async Task Trial_vencido_bloqueia_dono_e_membro_mas_o_link_do_cliente_segue_e_nada_se_apaga()
    {
        var (dona, contaId) = await EntrarDono();
        var email = $"ass-{Guid.NewGuid():N}@aralu.test";
        await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Ana", email }));
        var membro = await AceitarEEntrar(email);
        var evento = (await Ler(await dona.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Aniversario", primeiroNome = "Festa" }))).GetProperty("id").GetGuid();
        var token = (await Ler(await dona.PostAsync($"/api/v1/eventos/{evento}/link-cliente", null))).GetProperty("token").GetString();

        // T2: 15º dia sem assinatura.
        await MudarAssinatura(contaId, item => item.TrialTerminaEm = DateTimeOffset.UtcNow.AddMinutes(-1));

        var donaBloqueada = await dona.GetAsync("/api/v1/eventos");
        Assert.Equal(HttpStatusCode.PaymentRequired, donaBloqueada.StatusCode);
        Assert.Contains("Assine para continuar", await donaBloqueada.Content.ReadAsStringAsync());
        var membroBloqueado = await membro.GetAsync("/api/v1/eventos");
        Assert.Equal(HttpStatusCode.PaymentRequired, membroBloqueado.StatusCode);
        Assert.Contains("Fale com o responsável", await membroBloqueado.Content.ReadAsStringAsync());

        // A sessão e a situação continuam abrindo, para a tela de bloqueio.
        Assert.Equal(HttpStatusCode.OK, (await dona.GetAsync("/api/v1/conta/area")).StatusCode);
        var situacao = await Ler(await dona.GetAsync("/api/v1/assinatura"));
        Assert.Equal("Expirada", situacao.GetProperty("situacao").GetString());
        Assert.False(situacao.GetProperty("liberada").GetBoolean());

        // T8: o cliente abre o link normalmente.
        Assert.Equal(HttpStatusCode.OK, (await _banco.Fabrica.CreateClient().GetAsync($"/api/v1/publico/cliente/{token}")).StatusCode);

        // T6: pagamento confirmado devolve tudo.
        await MudarAssinatura(contaId, item => item.Situacao = SituacaoAssinatura.Ativa);
        var eventos = await Ler(await dona.GetAsync("/api/v1/eventos"));
        Assert.Contains(eventos.EnumerateArray(), item => item.GetProperty("id").GetGuid() == evento);
    }

    [Fact]
    public async Task Atraso_libera_5_dias_e_cancelada_libera_ate_o_periodo_pago()
    {
        var (dona, contaId) = await EntrarDono();
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);

        // T5
        await MudarAssinatura(contaId, item => { item.Situacao = SituacaoAssinatura.EmAtraso; item.ProximoVencimento = hoje.AddDays(-5); });
        Assert.Equal(HttpStatusCode.OK, (await dona.GetAsync("/api/v1/eventos")).StatusCode);
        await MudarAssinatura(contaId, item => item.ProximoVencimento = hoje.AddDays(-6));
        Assert.Equal(HttpStatusCode.PaymentRequired, (await dona.GetAsync("/api/v1/eventos")).StatusCode);

        // T7
        await MudarAssinatura(contaId, item => { item.Situacao = SituacaoAssinatura.Cancelada; item.PagoAte = hoje.AddDays(10); });
        Assert.Equal(HttpStatusCode.OK, (await dona.GetAsync("/api/v1/eventos")).StatusCode);
        await MudarAssinatura(contaId, item => item.PagoAte = hoje.AddDays(-1));
        Assert.Equal(HttpStatusCode.PaymentRequired, (await dona.GetAsync("/api/v1/eventos")).StatusCode);
    }

    private async Task MudarAssinatura(Guid contaId, Action<Assinatura> mudar)
    {
        await using var banco = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options);
        var assinatura = await banco.Assinaturas.IgnoreQueryFilters().SingleAsync(item => item.ContaId == contaId);
        mudar(assinatura);
        await banco.SaveChangesAsync();
    }

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
