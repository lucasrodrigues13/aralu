using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

/// <summary>SPEC-063 (código de acesso do link do cliente) e SPEC-064 (validade da proposta configurável).</summary>
[Collection(ColecaoApi.Nome)]
public class CodigoAcessoLinkTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public CodigoAcessoLinkTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Link_pede_codigo_e_abre_com_o_codigo_certo()
    {
        var dono = await Entrar();
        var (eventoId, token) = await EventoComLink(dono);
        var baseLink = $"/api/v1/publico/cliente/{token}";
        var anonimo = _banco.Fabrica.CreateClient();

        // C11: sem cliente com e-mail, a página avisa e a janela do Dono também.
        Assert.False((await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/link-cliente"))).GetProperty("clienteComEmail").GetBoolean());
        var semEmail = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/codigo", new { clienteId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.BadRequest, semEmail.StatusCode);
        Assert.Contains("Fale com a organizadora do evento.", await semEmail.Content.ReadAsStringAsync());

        var (email, clienteId) = await LinkClienteDeTeste.VincularClienteComEmailAsync(dono, eventoId);
        Assert.True((await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/link-cliente"))).GetProperty("clienteComEmail").GetBoolean());

        // C1: sem sessão, nada do link sai.
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync(baseLink)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync($"{baseLink}/presencas")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.PutAsJsonAsync($"{baseLink}/prazo-rsvp", new { prazo = "2099-01-01" })).StatusCode);

        // C10: o e-mail vem mascarado; o endereço completo não aparece na resposta.
        var acessoTexto = await (await anonimo.GetAsync($"{baseLink}/acesso")).Content.ReadAsStringAsync();
        Assert.DoesNotContain(email, acessoTexto);
        Assert.Contains("cl***@aralu.test", acessoTexto);

        // C3: e-mail fora da lista é recusado e nada é enviado.
        var fora = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/codigo", new { clienteId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.BadRequest, fora.StatusCode);
        Assert.Contains("Escolha um dos e-mails da lista.", await fora.Content.ReadAsStringAsync());
        Assert.DoesNotContain(_banco.Fabrica.Email.Mensagens, item => item.Email == email);

        // C2: código certo abre o link e o navegador recebe a sessão.
        Assert.Equal(HttpStatusCode.OK, (await anonimo.PostAsJsonAsync($"{baseLink}/acesso/codigo", new { clienteId })).StatusCode);
        var codigo = LinkClienteDeTeste.UltimoCodigo(_banco.Fabrica, email);
        Assert.Equal(6, codigo.Length);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync($"{baseLink}/acesso/confirmar", new { codigo = Errado(codigo) })).StatusCode);
        var confirmado = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/confirmar", new { codigo });
        Assert.Equal(HttpStatusCode.OK, confirmado.StatusCode);
        Assert.Contains(confirmado.Headers.GetValues("Set-Cookie"), item => item.Contains("httponly", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(HttpStatusCode.OK, (await anonimo.GetAsync(baseLink)).StatusCode);
        Assert.True((await Ler(await anonimo.GetAsync($"{baseLink}/acesso"))).GetProperty("sessaoValida").GetBoolean());

        // C6: segundo pedido antes de 2 minutos é recusado, sem e-mail.
        var enviados = _banco.Fabrica.Email.Mensagens.Count(item => item.Email == email);
        var rapido = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/codigo", new { clienteId });
        Assert.Equal(HttpStatusCode.BadRequest, rapido.StatusCode);
        Assert.Matches("Aguarde \\d+ segundos para pedir outro código.", await rapido.Content.ReadAsStringAsync());
        Assert.Equal(enviados, _banco.Fabrica.Email.Mensagens.Count(item => item.Email == email));

        // C8: gerar link novo derruba a sessão.
        var novoToken = (await Ler(await dono.PostAsync($"/api/v1/eventos/{eventoId}/link-cliente", null))).GetProperty("token").GetString()!;
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync(baseLink)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync($"/api/v1/publico/cliente/{novoToken}")).StatusCode);
        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var banco = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
        var linkId = await banco.LinksCliente.IgnoreQueryFilters().Where(item => item.Token == novoToken).Select(item => item.Id).SingleAsync();
        Assert.False(await banco.SessoesLinkCliente.IgnoreQueryFilters().AnyAsync(item => item.LinkId == linkId));
    }

    [Fact]
    public async Task Cinco_erros_ou_codigo_vencido_nao_abrem_e_tres_pedidos_esperam_15_minutos()
    {
        var dono = await Entrar();
        var (eventoId, token) = await EventoComLink(dono);
        var (email, clienteId) = await LinkClienteDeTeste.VincularClienteComEmailAsync(dono, eventoId);
        var baseLink = $"/api/v1/publico/cliente/{token}";
        var anonimo = _banco.Fabrica.CreateClient();

        // C4: cinco erros invalidam o código, mesmo que o sexto esteja certo.
        await Pedir(anonimo, baseLink, clienteId);
        var codigo = LinkClienteDeTeste.UltimoCodigo(_banco.Fabrica, email);
        for (var i = 1; i <= 4; i++)
        {
            var errado = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/confirmar", new { codigo = Errado(codigo) });
            Assert.Contains($"Você tem mais {5 - i} tentativas.", await errado.Content.ReadAsStringAsync());
        }

        var quinto = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/confirmar", new { codigo = Errado(codigo) });
        Assert.Contains("Este código não vale mais. Peça um novo.", await quinto.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync($"{baseLink}/acesso/confirmar", new { codigo })).StatusCode);

        // C5: código digitado depois de 10 minutos é recusado como expirado.
        await Recuar(token, TimeSpan.FromMinutes(3));
        await Pedir(anonimo, baseLink, clienteId);
        var segundo = LinkClienteDeTeste.UltimoCodigo(_banco.Fabrica, email);
        await Recuar(token, TimeSpan.FromMinutes(11));
        var vencido = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/confirmar", new { codigo = segundo });
        Assert.Contains("Este código expirou. Peça um novo.", await vencido.Content.ReadAsStringAsync());

        // C7: o terceiro pedido passa; o quarto espera 15 minutos, sem e-mail. (Os anteriores já ficaram para trás.)
        await using (var escopo = _banco.Fabrica.Services.CreateAsyncScope())
        {
            var banco = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
            var linkId = await banco.LinksCliente.IgnoreQueryFilters().Where(item => item.Token == token).Select(item => item.Id).SingleAsync();
            await banco.CodigosAcessoCliente.IgnoreQueryFilters().Where(item => item.LinkId == linkId).ExecuteDeleteAsync();
        }

        await Pedir(anonimo, baseLink, clienteId);
        await Recuar(token, TimeSpan.FromMinutes(2));
        await Pedir(anonimo, baseLink, clienteId);
        await Recuar(token, TimeSpan.FromMinutes(2));
        await Pedir(anonimo, baseLink, clienteId);
        await Recuar(token, TimeSpan.FromMinutes(2));
        var enviados = _banco.Fabrica.Email.Mensagens.Count(item => item.Email == email);
        var quarto = await anonimo.PostAsJsonAsync($"{baseLink}/acesso/codigo", new { clienteId });
        Assert.Equal(HttpStatusCode.BadRequest, quarto.StatusCode);
        Assert.Matches("Você pediu vários códigos. Aguarde \\d+ minutos para pedir outro.", await quarto.Content.ReadAsStringAsync());
        Assert.Equal(enviados, _banco.Fabrica.Email.Mensagens.Count(item => item.Email == email));
    }

    [Fact]
    public async Task Validade_da_proposta_vem_da_conta_e_pode_mudar_no_envio()
    {
        var dono = await Entrar();

        // C1: sem configuração, 30 dias.
        Assert.Equal(30, (await Ler(await dono.GetAsync("/api/v1/configuracoes/propostas"))).GetProperty("validadeDias").GetInt32());
        var (_, primeiro) = await LeadComOrcamento(dono, "Lead padrão");
        var enviado = await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{primeiro}/enviar", new { }));
        Assert.Equal(30, enviado.GetProperty("diasValidade").GetInt32());
        Assert.Equal(UltimoDia(30), UltimoDiaDe(enviado));

        // C6: fora de 1 a 180 é recusado.
        var zero = await dono.PutAsJsonAsync("/api/v1/configuracoes/propostas", new { validadeDias = 0 });
        Assert.Equal(HttpStatusCode.BadRequest, zero.StatusCode);
        Assert.Contains("A validade da proposta vai de 1 a 180 dias.", await zero.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{primeiro}/enviar", new { dias = 181 })).StatusCode);

        // C2 e C5: padrão de 7 dias; a proposta já enviada mantém a data.
        Assert.Equal(7, (await Ler(await dono.PutAsJsonAsync("/api/v1/configuracoes/propostas", new { validadeDias = 7 }))).GetProperty("validadeDias").GetInt32());
        var (_, segundo) = await LeadComOrcamento(dono, "Lead sete dias");
        var comSete = await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{segundo}/enviar", new { }));
        Assert.Equal(UltimoDia(7), UltimoDiaDe(comSete));
        Assert.Equal(enviado.GetProperty("validoAte").GetDateTimeOffset(), (await Ler(await dono.GetAsync($"/api/v1/orcamentos-funil/{primeiro}"))).GetProperty("validoAte").GetDateTimeOffset());

        // C3 e C4: 15 dias só nesta proposta; o reenvio recomeça o prazo com os dias escolhidos.
        var comQuinze = await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{segundo}/enviar", new { dias = 15 }));
        Assert.Equal(15, comQuinze.GetProperty("diasValidade").GetInt32());
        Assert.Equal(UltimoDia(15), UltimoDiaDe(comQuinze));
        Assert.Equal(7, (await Ler(await dono.GetAsync("/api/v1/configuracoes/propostas"))).GetProperty("validadeDias").GetInt32());
    }

    private static DateOnly UltimoDia(int dias) =>
        Domain.Funil.OrcamentoFunil.UltimoDia(DateTimeOffset.UtcNow, dias);

    private static DateOnly UltimoDiaDe(JsonElement orcamento) =>
        Domain.Funil.OrcamentoFunil.UltimoDiaDe(orcamento.GetProperty("validoAte").GetDateTimeOffset());

    private static string Errado(string codigo) => codigo == "000000" ? "111111" : "000000";

    private static async Task Pedir(HttpClient cliente, string baseLink, Guid clienteId)
    {
        var resposta = await cliente.PostAsJsonAsync($"{baseLink}/acesso/codigo", new { clienteId });
        Assert.True(resposta.IsSuccessStatusCode, await resposta.Content.ReadAsStringAsync());
    }

    /// <summary>Faz os códigos do link parecerem pedidos há mais tempo (o relógio do teste é o real).</summary>
    private async Task Recuar(string token, TimeSpan tempo)
    {
        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var banco = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
        var linkId = await banco.LinksCliente.IgnoreQueryFilters().Where(item => item.Token == token).Select(item => item.Id).SingleAsync();
        var codigos = await banco.CodigosAcessoCliente.IgnoreQueryFilters().Where(item => item.LinkId == linkId).ToListAsync();
        foreach (var codigo in codigos)
        {
            codigo.CriadoEm -= tempo;
            codigo.ExpiraEm -= tempo;
        }

        await banco.SaveChangesAsync();
    }

    private static async Task<(Guid EventoId, string Token)> EventoComLink(HttpClient dono)
    {
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Aniversario", primeiroNome = "Festa" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var token = (await Ler(await dono.PostAsync($"/api/v1/eventos/{eventoId}/link-cliente", null))).GetProperty("token").GetString()!;
        return (eventoId, token);
    }

    private static async Task<(Guid OportunidadeId, Guid OrcamentoId)> LeadComOrcamento(HttpClient dono, string nome)
    {
        var oportunidade = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome,
            estagio = "Contato inicial",
            contatos = new[] { new { nome = "Contato", telefone = "11977776666" } },
        }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();
        var orcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId, conteudo = $"Proposta para {nome}", valor = 9000 }));
        return (oportunidadeId, orcamento.GetProperty("id").GetGuid());
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"acesso-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
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

    private sealed record Sessao(string Token, string Email, string[] Papeis);
}
