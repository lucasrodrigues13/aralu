using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

/// <summary>Equipe do evento (SPEC-067): cadastro pela dona, link individual com código e só os itens liberados.</summary>
[Collection(ColecaoApi.Nome)]
public class EquipeEventoFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public EquipeEventoFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Pessoa_da_equipe_entra_com_codigo_e_ve_so_o_que_recebe()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var eventoId = (await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Aniversario", primeiroNome = "Festa", data = DateTime.UtcNow.AddDays(10).ToString("yyyy-MM-dd") }))).GetProperty("id").GetGuid();
        var cronograma = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-cronograma", new
        {
            titulo = "Dia da festa",
            itens = new[] { new { rotulo = "Montagem", recadoFornecedores = "Chegar pela entrada de serviço" } },
        }));
        var equipe = $"/api/v1/eventos/{eventoId}/equipe";

        // Validação: e-mail e ao menos um item.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync(equipe, new { nome = "Sem e-mail", email = "", recebePortaria = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync(equipe, new { nome = "Nada", email = "nada@ex.com" })).StatusCode);

        await Ler(await dono.PutAsJsonAsync(equipe + "/modelos", new { cronogramaId = cronograma.GetProperty("id").GetGuid() }));
        var email = $"buffet-{Guid.NewGuid():N}@ex.com";
        var pessoa = await Ler(await dono.PostAsJsonAsync(equipe, new { nome = "Marta", email, funcao = "Buffet", recebeCronograma = true }));
        var pessoaId = pessoa.GetProperty("id").GetGuid();
        var token = pessoa.GetProperty("token").GetString()!;
        Assert.Equal("NaoEnviado", pessoa.GetProperty("situacao").GetString());

        // Outra conta não vê nem mexe.
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync(equipe)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsync($"{equipe}/{pessoaId}/liberacao", null)).StatusCode);

        var publico = $"/api/v1/publico/equipe/{token}";
        var anonimo = _banco.Fabrica.CreateClient();

        // Antes de liberar, o link não abre.
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync(publico + "/acesso")).StatusCode);
        var liberada = await Ler(await dono.PostAsync($"{equipe}/{pessoaId}/liberacao", null));
        Assert.Equal("Enviado", liberada.GetProperty("situacao").GetString());

        // Sem sessão, nada sai além do cabeçalho com o e-mail mascarado.
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync(publico)).StatusCode);
        var acesso = await Ler(await anonimo.GetAsync(publico + "/acesso"));
        Assert.DoesNotContain("buffet-", acesso.GetProperty("email").GetProperty("email").GetString());

        (await anonimo.PostAsync(publico + "/acesso/codigo", null)).EnsureSuccessStatusCode();
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email);
        var codigo = System.Text.RegularExpressions.Regex.Match(mensagem.Corpo, @"\b\d{6}\b").Value;
        (await anonimo.PostAsJsonAsync(publico + "/acesso/confirmar", new { codigo })).EnsureSuccessStatusCode();

        var painel = await Ler(await anonimo.GetAsync(publico));
        Assert.Equal("Marta", painel.GetProperty("nome").GetString());
        Assert.True(painel.GetProperty("cronograma").GetBoolean());
        Assert.False(painel.GetProperty("portaria").GetBoolean());
        var itens = (await Ler(await anonimo.GetAsync(publico + "/cronograma"))).GetProperty("itens");
        Assert.Equal("Chegar pela entrada de serviço", itens[0].GetProperty("recadoFornecedores").GetString());

        // Itens não marcados ficam fechados.
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync(publico + "/portaria")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync(publico + "/roteiro")).StatusCode);

        // Marcar a portaria abre na hora, sem novo código.
        await Ler(await dono.PutAsJsonAsync($"{equipe}/{pessoaId}", new { nome = "Marta", email, funcao = "Buffet", recebeCronograma = true, recebePortaria = true }));
        var portaria = await Ler(await anonimo.GetAsync(publico + "/portaria"));
        Assert.Equal(0, portaria.GetProperty("confirmados").GetInt32());

        // Encerrar derruba a sessão e fecha o link.
        var encerrada = await Ler(await dono.DeleteAsync($"{equipe}/{pessoaId}/liberacao"));
        Assert.Equal("Encerrado", encerrada.GetProperty("situacao").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync(publico)).StatusCode);

        // Reabrir pede código de novo.
        await Ler(await dono.PostAsync($"{equipe}/{pessoaId}/liberacao", null));
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonimo.GetAsync(publico)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await dono.DeleteAsync($"{equipe}/{pessoaId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync(publico + "/acesso")).StatusCode);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"equipe-{Guid.NewGuid():N}@aralu.test";
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
