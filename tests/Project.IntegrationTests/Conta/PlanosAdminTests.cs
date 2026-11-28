using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Project.Api.Conta;
using Project.Application.Conta;
using Project.Domain.Assinaturas;
using Project.Domain.Equipe;
using Project.Infrastructure.Assinaturas;
using Project.Infrastructure.Conta;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062 parte D: catálogo de planos e enquadramento de contas pelo Admin; plano + grupo (RF-121).</summary>
[Collection(ColecaoApi.Nome)]
public class PlanosAdminTests
{
    private const string Senha = "ceu-de-junho-42";
    private readonly BancoFixture _banco;

    public PlanosAdminTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Plano_nao_publico_atribuido_pelo_admin_e_o_unico_que_o_dono_ve_e_fica_no_historico()
    {
        var admin = await EntrarAdmin();
        var codigo = $"fund-{Guid.NewGuid():N}"[..20];
        var fundadores = await Ler(await admin.PostAsJsonAsync("/api/v1/admin/planos", new { codigo, nome = "Fundadores", valorMensal = 99m, publico = false }));
        var fundadoresId = fundadores.GetProperty("id").GetGuid();
        var (dona, contaId) = await EntrarDono();
        var (outra, _) = await EntrarDono();

        // T17
        var semMotivo = await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/plano", new { planoId = fundadoresId });
        Assert.Equal(HttpStatusCode.BadRequest, semMotivo.StatusCode);
        var conta = await Ler(await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/plano", new { planoId = fundadoresId, motivo = "Cliente da primeira turma" }));
        Assert.Equal("Fundadores", conta.GetProperty("plano").GetString());
        Assert.Equal(99m, conta.GetProperty("valorCobrado").GetDecimal());
        var daDona = (await Ler(await dona.GetAsync("/api/v1/assinatura/planos"))).EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToArray();
        Assert.Equal([fundadoresId], daDona);
        var daOutra = (await Ler(await outra.GetAsync("/api/v1/assinatura/planos"))).EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToArray();
        Assert.DoesNotContain(fundadoresId, daOutra);
        Assert.Contains(Plano.ProId, daOutra);

        // T22: quem, quando, de qual para qual plano e o motivo.
        var historico = conta.GetProperty("historico").EnumerateArray().Single();
        Assert.Equal("Plano", historico.GetProperty("tipo").GetString());
        Assert.Equal("Pro", historico.GetProperty("planoAnterior").GetString());
        Assert.Equal("Fundadores", historico.GetProperty("planoNovo").GetString());
        Assert.Equal("Cliente da primeira turma", historico.GetProperty("motivo").GetString());
        Assert.StartsWith("adm-", historico.GetProperty("feitoPor").GetString());
    }

    [Fact]
    public async Task Desconto_valor_e_trial_e_mudanca_de_preco_nao_afeta_quem_ja_assina()
    {
        var admin = await EntrarAdmin();
        var codigo = $"ouro-{Guid.NewGuid():N}"[..20];
        var plano = await Ler(await admin.PostAsJsonAsync("/api/v1/admin/planos", new { codigo, nome = "Ouro", valorMensal = 179m, publico = true }));
        var planoId = plano.GetProperty("id").GetGuid();
        var (dona, contaId) = await EntrarDono();
        await Ler(await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/plano", new { planoId, motivo = "Teste" }));
        var assinada = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = "52998224725", nomeCobranca = "X", formaPagamento = "pix" }));
        Assert.Equal(179m, assinada.GetProperty("valor").GetDecimal());

        // T18: 30% até uma data futura: R$ 125,30, e o Asaas recebe o novo valor.
        var ate = Project.Domain.Comum.HorarioBrasil.Data(DateTimeOffset.UtcNow).AddMonths(4);
        var comDesconto = await Ler(await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/desconto", new { percentual = 30m, ate, motivo = "Campanha" }));
        Assert.Equal(125.30m, comDesconto.GetProperty("valorCobrado").GetDecimal());
        Assert.Contains(125.30m, _banco.Fabrica.Asaas.ValoresAtualizados.Values);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/desconto", new { percentual = 0m, motivo = "x" })).StatusCode);

        // T19: o Admin sobe o preço do plano; quem já assina segue no valor dela.
        var antes = (await Ler(await admin.GetAsync($"/api/v1/admin/contas/{contaId}/assinatura"))).GetProperty("valorCobrado").GetDecimal();
        await Ler(await admin.PutAsJsonAsync($"/api/v1/admin/planos/{planoId}", new { codigo, nome = "Ouro", valorMensal = 199m, publico = true }));
        var depois = await Ler(await admin.GetAsync($"/api/v1/admin/contas/{contaId}/assinatura"));
        Assert.Equal(199m, depois.GetProperty("valorDoPlano").GetDecimal());
        Assert.Equal(125.30m, antes);
        var registrado = await Ler(await dona.GetAsync("/api/v1/assinatura"));
        Assert.Equal(125.30m, registrado.GetProperty("valor").GetDecimal());

        // Valor personalizado e trial estendido.
        var fixo = await Ler(await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/valor", new { valor = 150m, motivo = "Negociado" }));
        Assert.Equal(150m, fixo.GetProperty("valorCobrado").GetDecimal());
        var novoFim = Project.Domain.Comum.HorarioBrasil.Data(DateTimeOffset.UtcNow).AddDays(30);
        var trial = await Ler(await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/trial", new { trialAte = novoFim, motivo = "Suporte" }));
        Assert.Equal(4, trial.GetProperty("historico").GetArrayLength());
    }

    [Fact]
    public async Task Plano_padrao_nao_e_desativado_e_dono_nao_acessa_o_admin()
    {
        var admin = await EntrarAdmin();
        var recusado = await admin.PutAsJsonAsync($"/api/v1/admin/planos/{Plano.ProId}", new { codigo = "pro", nome = "Pro", valorMensal = 179m, publico = false, padrao = true });
        Assert.Equal(HttpStatusCode.BadRequest, recusado.StatusCode);
        Assert.Contains("Escolha outro plano padrão antes", await recusado.Content.ReadAsStringAsync());

        var (dona, _) = await EntrarDono();
        Assert.Equal(HttpStatusCode.Forbidden, (await dona.GetAsync("/api/v1/admin/planos")).StatusCode);
    }

    [Fact]
    public async Task Recurso_fora_do_plano_e_recusado_mesmo_com_o_grupo_permitindo()
    {
        var admin = await EntrarAdmin();
        var codigo = $"ia-{Guid.NewGuid():N}"[..20];
        var superior = await Ler(await admin.PostAsJsonAsync("/api/v1/admin/planos", new
        {
            codigo,
            nome = "Superior IA",
            valorMensal = 0.01m,
            publico = true,
            recursos = new[] { new { recurso = "LigacoesIa", limite = (int?)300 } },
        }));
        var (_, contaId) = await EntrarDono();

        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var servico = escopo.ServiceProvider.GetRequiredService<AssinaturaServico>();
        var dono = Pessoa(contaId, Papeis.Organizer);

        // T20/T21: o Dono pode tudo no grupo, mas o Pro não libera ligações com IA.
        var falta = await AssinaturaEndpoints.FaltaRecursoAsync(dono, servico, RecursoPlano.LigacoesIa, Modulo.Funil, AcaoModulo.Editar, CancellationToken.None);
        Assert.StartsWith("Este recurso está disponível no plano", falta);

        await Ler(await admin.PostAsJsonAsync($"/api/v1/admin/contas/{contaId}/assinatura/plano", new { planoId = superior.GetProperty("id").GetGuid(), motivo = "Upgrade" }));
        Assert.Null(await AssinaturaEndpoints.FaltaRecursoAsync(dono, servico, RecursoPlano.LigacoesIa, Modulo.Funil, AcaoModulo.Editar, CancellationToken.None));

        // Com o plano liberando, o Membro sem a permissão do grupo continua recusado.
        var membro = Pessoa(contaId, Papeis.Assistant);
        var semGrupo = await AssinaturaEndpoints.FaltaRecursoAsync(membro, servico, RecursoPlano.LigacoesIa, Modulo.Funil, AcaoModulo.Editar, CancellationToken.None);
        Assert.StartsWith("Você não tem permissão para editar em Funil", semGrupo);
    }

    private static ClaimsPrincipal Pessoa(Guid contaId, string papel) => new(new ClaimsIdentity(
        [new Claim(ClaimTypes.Role, papel), new Claim(ContaClaims.ContaId, contaId.ToString())], "teste"));

    private async Task<HttpClient> EntrarAdmin()
    {
        var adminEmail = $"adm-{Guid.NewGuid():N}@aralu.test";
        const string senhaAdmin = "administrador-de-teste";
        var fabrica = new FabricaApi(_banco.Conexao, bootstrap: true, adminEmail: adminEmail, adminSenha: senhaAdmin);
        await using (var escopo = fabrica.Services.CreateAsyncScope())
        {
            await escopo.ServiceProvider.GetRequiredService<BootstrapAdministrador>().ExecutarAsync();
        }

        var cliente = _banco.Fabrica.CreateClient();
        var sessao = await Ler(await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email = adminEmail, senha = senhaAdmin }));
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.GetProperty("token").GetString());
        return cliente;
    }

    [Fact]
    public async Task Admin_entra_na_conta_pelo_id_que_a_lista_devolve()
    {
        var admin = await EntrarAdmin();
        var (dona, contaId) = await EntrarDono();
        var evento = (await Ler(await dona.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Aniversario", primeiroNome = "Festa do admin" }))).GetProperty("id").GetGuid();

        var lista = (await Ler(await admin.GetAsync("/api/v1/admin/usuarios"))).EnumerateArray().Select(item => item.GetProperty("id").GetString()).ToArray();
        Assert.Contains(contaId.ToString(), lista);

        using var naConta = new HttpRequestMessage(HttpMethod.Get, "/api/v1/eventos");
        naConta.Headers.Add(AdminEndpoints.CabecalhoConta, contaId.ToString());
        var eventos = await Ler(await admin.SendAsync(naConta));
        Assert.Contains(eventos.EnumerateArray(), item => item.GetProperty("id").GetGuid() == evento);

        using var inexistente = new HttpRequestMessage(HttpMethod.Get, "/api/v1/eventos");
        inexistente.Headers.Add(AdminEndpoints.CabecalhoConta, Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.SendAsync(inexistente)).StatusCode);
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
        var sessao = await Ler(await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha }));
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.GetProperty("token").GetString());
        return (cliente, Guid.Parse(usuarioId));
    }

    private static async Task<JsonElement> Ler(HttpResponseMessage resposta)
    {
        var texto = await resposta.Content.ReadAsStringAsync();
        Assert.True(resposta.IsSuccessStatusCode, texto);
        using var documento = JsonDocument.Parse(texto);
        return documento.RootElement.Clone();
    }
}
