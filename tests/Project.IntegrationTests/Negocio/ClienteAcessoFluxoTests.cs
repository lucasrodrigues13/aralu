using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Project.Application.Conta;
using Project.Infrastructure.Conta;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

/// <summary>
/// O cliente não entra na plataforma: o acesso dele é só o link público com token gerado pelo organizador.
/// </summary>
[Collection(ColecaoApi.Nome)]
public class ClienteAcessoFluxoTests
{
    private const string Senha = "ceu-de-junho-42";
    private const string PapelLegado = "Client";
    private readonly BancoFixture _banco;

    public ClienteAcessoFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Cadastrar_cliente_nao_cria_conta_de_acesso()
    {
        var dono = await EntrarOrganizer();
        var emailCliente = $"client-{Guid.NewGuid():N}@aralu.test";
        var resposta = await dono.PostAsJsonAsync("/api/v1/clientes", new
        {
            nome = "Cliente Sem Acesso",
            papel = "Anfitriao",
            email = emailCliente,
            ddi = "+55",
            celular = "11988887777",
            // Campos antigos são ignorados: não existe mais acesso do cliente à plataforma.
            acessoPlataforma = true,
            permissoes = new { convidados = true, tarefas = true },
        });
        var contato = await Ler(resposta);

        Assert.False(contato.TryGetProperty("acessoPlataforma", out _));
        Assert.False(contato.TryGetProperty("permissoes", out _));
        Assert.False(contato.TryGetProperty("usuarioId", out _));
        Assert.DoesNotContain(_banco.Fabrica.Email.Mensagens, item => item.Email == emailCliente);

        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        Assert.Null(await usuarios.FindByEmailAsync(emailCliente));
    }

    [Fact]
    public async Task Conta_de_cliente_legada_nao_entra_na_plataforma()
    {
        var email = $"legado-{Guid.NewGuid():N}@aralu.test";
        await using (var escopo = _banco.Fabrica.Services.CreateAsyncScope())
        {
            var roles = escopo.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            if (!await roles.RoleExistsAsync(PapelLegado))
            {
                Assert.True((await roles.CreateAsync(new IdentityRole(PapelLegado))).Succeeded);
            }

            var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var organizer = new ApplicationUser { UserName = $"org-{Guid.NewGuid():N}", Email = $"org-{Guid.NewGuid():N}@aralu.test", EmailConfirmed = true };
            Assert.True((await usuarios.CreateAsync(organizer, Senha)).Succeeded);
            Assert.True((await usuarios.AddToRoleAsync(organizer, Papeis.Organizer)).Succeeded);

            var usuario = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
            Assert.True((await usuarios.CreateAsync(usuario, Senha)).Succeeded);
            Assert.True((await usuarios.AddToRoleAsync(usuario, PapelLegado)).Succeeded);
        }

        var http = _banco.Fabrica.CreateClient();
        var entrada = await http.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        Assert.Equal(HttpStatusCode.Unauthorized, entrada.StatusCode);
    }

    [Fact]
    public async Task Token_de_papel_fora_da_equipe_e_recusado_pela_api()
    {
        var http = _banco.Fabrica.CreateClient();
        await using (var escopo = _banco.Fabrica.Services.CreateAsyncScope())
        {
            var emissor = escopo.ServiceProvider.GetRequiredService<IEmissorJwt>();
            var token = emissor.Emitir("legado-1", "legado@aralu.test", [PapelLegado], "organizer-1");
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        // Sem membro na conta (SPEC-062), o token não vale: 401 antes mesmo da checagem de papel.
        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/api/v1/eventos")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/api/v1/clientes")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync("/api/v1/conta/area")).StatusCode);
    }

    [Fact]
    public async Task Cliente_de_um_organizer_nao_aparece_para_outro()
    {
        var dono = await EntrarOrganizer();
        var outro = await EntrarOrganizer();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Aniversario",
            primeiroNome = "Privado",
        }));
        var eventoId = evento.GetProperty("id").GetGuid();

        await Ler(await dono.PostAsJsonAsync("/api/v1/clientes", new
        {
            nome = "Sem Evento",
            papel = "Anfitriao",
            email = $"client-{Guid.NewGuid():N}@aralu.test",
            ddi = "+55",
            celular = "11977776666",
        }));

        var buscaAlheia = await Ler(await outro.GetAsync("/api/v1/clientes?nome=Sem"));
        Assert.Empty(buscaAlheia.EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await outro.GetAsync($"/api/v1/eventos/{eventoId}")).StatusCode);
    }

    private async Task<HttpClient> EntrarOrganizer()
    {
        var email = $"org-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new
        {
            usuarioId = query["usuarioId"].ToString(),
            token = query["token"].ToString(),
        })).StatusCode);
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
