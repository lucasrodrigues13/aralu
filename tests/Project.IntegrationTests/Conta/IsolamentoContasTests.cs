using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>
/// Matriz de isolamento entre contas (SPEC-062 T15 / Fase 1).
/// Conta B não lê nem lista registros da conta A: 404 no detalhe, lista vazia na listagem.
/// </summary>
[Collection(ColecaoApi.Nome)]
public class IsolamentoContasTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public IsolamentoContasTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Conta_B_nao_ve_registros_da_conta_A()
    {
        var a = await Entrar();
        var b = await Entrar();

        await Ler(await a.PutAsJsonAsync("/api/v1/perfil", new { nomeEmpresa = "Assessoria A", cep = "01001000", numero = "1" }));

        var modelo = await Ler(await a.PostAsJsonAsync("/api/v1/modelos", new { nome = "Modelo A", tipo = "Casamento" }));
        var modeloId = modelo.GetProperty("id").GetGuid();

        var evento = await Ler(await a.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Ana",
            segundoNome = "Bruno",
            data = "2027-06-20",
        }));
        var eventoId = evento.GetProperty("id").GetGuid();

        var cliente = await Ler(await a.PostAsJsonAsync("/api/v1/clientes", new
        {
            nome = "Cliente A",
            papel = "Noiva",
            email = $"cliente-a-{Guid.NewGuid():N}@aralu.test",
            celular = "11988887777",
        }));
        var clienteId = cliente.GetProperty("id").GetGuid();

        var servicoConta = await Ler(await a.PostAsJsonAsync("/api/v1/servicos-conta", new { nome = "Buffet A" }));
        var servicoContaId = servicoConta.GetProperty("id").GetGuid();

        var fornecedor = await Ler(await a.PostAsJsonAsync("/api/v1/fornecedores", new
        {
            nome = "Fornecedor A",
            servicoContaIds = new[] { servicoContaId },
        }));
        var fornecedorId = fornecedor.GetProperty("id").GetGuid();

        var contrato = await Ler(await a.PostAsJsonAsync("/api/v1/contratos", new
        {
            nome = "Contrato A",
            texto = "Texto da conta A",
        }));
        var contratoId = contrato.GetProperty("id").GetGuid();

        var modeloServicoFunil = await Ler(await a.PostAsJsonAsync("/api/v1/modelos-servicos-funil", new
        {
            nome = "Pacote A",
            valor = 10000,
        }));
        var modeloServicoFunilId = modeloServicoFunil.GetProperty("id").GetGuid();

        var oportunidade = await Ler(await a.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Oportunidade A",
            estagio = "Contato inicial",
            valorProposta = 10000,
            modeloServicoFunilId,
            contatos = new[] { new { nome = "Lead A", telefone = "11977776666", email = $"lead-a-{Guid.NewGuid():N}@aralu.test" } },
        }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();

        await Ler(await a.PostAsJsonAsync("/api/v1/agenda", new
        {
            descricao = "Compromisso A",
            data = "2031-05-10",
        }));

        var linkCliente = await Ler(await a.PostAsync($"/api/v1/eventos/{eventoId}/link-cliente", null));
        Assert.False(string.IsNullOrWhiteSpace(linkCliente.GetProperty("token").GetString()));

        var linkPortaria = await Ler(await a.PostAsync($"/api/v1/eventos/{eventoId}/link-portaria", null));
        Assert.False(string.IsNullOrWhiteSpace(linkPortaria.GetProperty("token").GetString()));

        // Perfil: cada conta vê o próprio, não o nome da outra.
        var perfilB = await Ler(await b.GetAsync("/api/v1/perfil"));
        Assert.NotEqual("Assessoria A", perfilB.GetProperty("nomeEmpresa").GetString());

        // Listas vazias / sem o item da conta A.
        Assert.Empty((await Ler(await b.GetAsync("/api/v1/eventos?nome=Ana"))).EnumerateArray());
        Assert.Empty((await Ler(await b.GetAsync("/api/v1/clientes?nome=Cliente"))).EnumerateArray());
        Assert.Empty((await Ler(await b.GetAsync("/api/v1/fornecedores"))).EnumerateArray());
        Assert.Empty((await Ler(await b.GetAsync("/api/v1/contratos"))).EnumerateArray());
        Assert.Empty((await Ler(await b.GetAsync("/api/v1/oportunidades"))).EnumerateArray());
        Assert.Empty((await Ler(await b.GetAsync("/api/v1/agenda?de=2031-05-01&ate=2031-05-31"))).EnumerateArray());
        Assert.Empty((await Ler(await b.GetAsync("/api/v1/assistentes"))).EnumerateArray());
        Assert.DoesNotContain(
            (await Ler(await b.GetAsync("/api/v1/modelos"))).EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == modeloId);

        // Detalhes: 404 (inexistente para a conta B) — T15.
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/eventos/{eventoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/eventos/{eventoId}/tarefas")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/eventos/{eventoId}/budget")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/eventos/{eventoId}/link-cliente")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/eventos/{eventoId}/link-portaria")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/modelos/{modeloId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/fornecedores/{fornecedorId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/contratos/{contratoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/oportunidades/{oportunidadeId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/clientes", new { clienteId })).StatusCode);

        // A conta A ainda vê os próprios dados.
        Assert.Equal(HttpStatusCode.OK, (await a.GetAsync($"/api/v1/eventos/{eventoId}")).StatusCode);
        Assert.Contains(
            (await Ler(await a.GetAsync("/api/v1/eventos?nome=Ana"))).EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == eventoId);
    }

    /// <summary>
    /// SPEC-062, lote 2.4: o filtro global por conta não pode quebrar link público.
    /// Quem está logado em outra conta e abre o link do cliente da conta A continua vendo a página.
    /// </summary>
    [Fact]
    public async Task Logado_na_conta_B_abre_o_link_publico_do_cliente_da_conta_A()
    {
        var a = await Entrar();
        var b = await Entrar();
        var evento = await Ler(await a.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Casamento",
            primeiroNome = "Carla",
            segundoNome = "Diego",
            data = "2027-08-15",
        }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var link = await Ler(await a.PostAsync($"/api/v1/eventos/{eventoId}/link-cliente", null));
        var token = link.GetProperty("token").GetString();

        var comLoginDeOutraConta = await b.GetAsync($"/api/v1/publico/cliente/{token}");
        var semLogin = await _banco.Fabrica.CreateClient().GetAsync($"/api/v1/publico/cliente/{token}");

        Assert.Equal(HttpStatusCode.OK, comLoginDeOutraConta.StatusCode);
        Assert.Equal(HttpStatusCode.OK, semLogin.StatusCode);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"pessoa-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        var cadastro = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha });
        Assert.Equal(HttpStatusCode.Created, cadastro.StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        var confirmacao = await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new
        {
            usuarioId = query["usuarioId"].ToString(),
            token = query["token"].ToString(),
        });
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
