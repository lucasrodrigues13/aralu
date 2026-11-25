using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class FornecedoresFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public FornecedoresFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Fornecedor_negociacao_budget_e_isolamento()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var servicoConta = await Ler(await dono.PostAsJsonAsync("/api/v1/servicos-conta", new { nome = "Banda" }));
        var servicoContaId = servicoConta.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/fornecedores", new { nome = "Sem serviço" })).StatusCode);

        var fornecedor = await Ler(await dono.PostAsJsonAsync("/api/v1/fornecedores", new
        {
            nome = "Banda Teste",
            servicoContaIds = new[] { servicoContaId },
            emails = new[] { new { endereco = "banda@exemplo.com" } },
            telefones = new[] { new { numero = "11999990000", movel = true } },
        }));
        var fornecedorId = fornecedor.GetProperty("id").GetGuid();
        Assert.True(fornecedor.GetProperty("completo").GetBoolean());
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/fornecedores"))).EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/fornecedores/{fornecedorId}")).StatusCode);
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new
        {
            tipo = "Aniversario",
            primeiroNome = "Helena",
            orcamentoEstimado = 20000,
            convidadosEstimados = 100,
        }));
        var eventoId = evento.GetProperty("id").GetGuid();

        var comServico = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/servicos", new { nome = "Banda" }));
        var servicoId = comServico.GetProperty("servicos").EnumerateArray()
            .Single(item => item.GetProperty("nome").GetString() == "Banda")
            .GetProperty("id").GetGuid();

        var comFornecedor = await Ler(await dono.PostAsJsonAsync(
            $"/api/v1/eventos/{eventoId}/servicos/{servicoId}/fornecedores",
            new { fornecedorId, etapa = "Orcamento" }));
        var vinculoId = comFornecedor.GetProperty("servicos").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() == servicoId)
            .GetProperty("fornecedores").EnumerateArray().Single().GetProperty("id").GetGuid();

        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/servicos/{servicoId}/fornecedores/{vinculoId}/avancar", new { }));
        var voltou = await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/servicos/{servicoId}/fornecedores/{vinculoId}/voltar", new { }));
        Assert.Equal("Orcamento", voltou.GetProperty("servicos").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() == servicoId)
            .GetProperty("fornecedores")[0].GetProperty("etapa").GetString());
        var contratado = await Ler(await dono.PostAsJsonAsync(
            $"/api/v1/eventos/{eventoId}/servicos/{servicoId}/fornecedores/{vinculoId}/contratar",
            new { valor = 5000 }));
        var servicoContratado = contratado.GetProperty("servicos").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() == servicoId);
        Assert.True(servicoContratado.GetProperty("contratado").GetBoolean());
        Assert.Equal(0, servicoContratado.GetProperty("parcelas").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, servicoContratado.GetProperty("fornecedores")[0].GetProperty("contratoAssinado").ValueKind);
        Assert.Equal("Contratado", servicoContratado.GetProperty("fornecedores")[0].GetProperty("etapa").GetString());

        var comSubitem = await Ler(await dono.PutAsJsonAsync(
            $"/api/v1/eventos/{eventoId}/servicos/{servicoId}/estimado",
            new
            {
                subitens = new[]
                {
                    new { descricao = "Show", quantidade = 1, valorUnitario = 3000 },
                    new { descricao = "Som extra", quantidade = 2, valorUnitario = 250 },
                },
            }));
        Assert.Equal(3500, comSubitem.GetProperty("servicos").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() == servicoId)
            .GetProperty("valorEstimado").GetDecimal());

        var budget = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/budget"));
        Assert.Equal(20000, budget.GetProperty("budget").GetDecimal());
        Assert.Equal(3500, budget.GetProperty("estimado").GetDecimal());
        Assert.Equal(5000, budget.GetProperty("contratado").GetDecimal());
        Assert.Equal(8500, budget.GetProperty("provaReal").GetDecimal());
        Assert.Equal(85, budget.GetProperty("custoPorConvidado").GetDecimal());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}/budget")).StatusCode);
    }

    [Fact]
    public async Task Servicos_em_massa_pela_lista_separada_por_virgula()
    {
        var dono = await Entrar();
        var existente = await Ler(await dono.PostAsJsonAsync("/api/v1/servicos-conta", new { nome = "Banda" }));

        var criados = await Ler(await dono.PostAsJsonAsync("/api/v1/servicos-conta/em-massa", new { nomes = " Fotografia ,banda,, Buffet , fotografia" }));
        var nomes = criados.EnumerateArray().Select(item => item.GetProperty("nome").GetString()!).ToArray();
        Assert.Equal(["Fotografia", "Banda", "Buffet"], nomes);
        Assert.Equal(existente.GetProperty("id").GetGuid(), criados[1].GetProperty("id").GetGuid());

        var catalogo = await Ler(await dono.GetAsync("/api/v1/servicos-conta"));
        foreach (var nome in nomes)
        {
            Assert.Single(catalogo.EnumerateArray(), item => item.GetProperty("nome").GetString() == nome);
        }

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/servicos-conta/em-massa", new { nomes = " , ," })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/servicos-conta/em-massa", new { nomes = $"Ok, {new string('x', 201)}" })).StatusCode);
    }

    [Fact]
    public async Task Importa_fornecedores_por_planilha_tudo_ou_nada()
    {
        var dono = await Entrar();
        var modelo = await dono.GetAsync("/api/v1/fornecedores/planilha");
        Assert.Equal(HttpStatusCode.OK, modelo.StatusCode);

        static MultipartFormDataContent Arquivo(Action<ClosedXML.Excel.XLWorkbook> preencher)
        {
            using var livro = new ClosedXML.Excel.XLWorkbook();
            preencher(livro);
            var memoria = new MemoryStream();
            livro.SaveAs(memoria);
            var conteudo = new ByteArrayContent(memoria.ToArray());
            return new MultipartFormDataContent { { conteudo, "arquivo", "fornecedores.xlsx" } };
        }

        var comErro = await Ler(await dono.PostAsync("/api/v1/fornecedores/importar", Arquivo(livro =>
        {
            var aba = livro.AddWorksheet("Fornecedores");
            aba.Cell(1, 1).Value = "Nome *";
            aba.Cell(1, 2).Value = "Serviços *";
            aba.Cell(1, 3).Value = "E-mail";
            aba.Cell(2, 1).Value = "Ok";
            aba.Cell(2, 2).Value = "Bolo";
            aba.Cell(3, 1).Value = "Ruim";
            aba.Cell(3, 2).Value = "Bolo";
            aba.Cell(3, 3).Value = "sem-arroba";
        })));
        Assert.Equal(0, comErro.GetProperty("criados").GetInt32());
        Assert.Equal("Linha 3: Informe um e-mail válido.", comErro.GetProperty("erros").EnumerateArray().Single().GetString());
        Assert.Empty((await Ler(await dono.GetAsync("/api/v1/fornecedores"))).EnumerateArray());

        var importado = await Ler(await dono.PostAsync("/api/v1/fornecedores/importar", Arquivo(livro =>
        {
            var aba = livro.AddWorksheet("Fornecedores");
            aba.Cell(1, 1).Value = "Nome *";
            aba.Cell(1, 2).Value = "Serviços *";
            aba.Cell(2, 1).Value = "Doce Mel";
            aba.Cell(2, 2).Value = "Bolo, Doces";
            aba.Cell(3, 1).Value = "Bolo Bom";
            aba.Cell(3, 2).Value = "bolo";
            var bancos = livro.AddWorksheet("Dados bancários");
            bancos.Cell(1, 1).Value = "Fornecedor *";
            bancos.Cell(1, 2).Value = "Tipo de Pix";
            bancos.Cell(1, 3).Value = "Chave Pix";
            bancos.Cell(2, 1).Value = "Doce Mel";
            bancos.Cell(2, 2).Value = "Chave aleatória";
            bancos.Cell(2, 3).Value = "abc-123";
        })));
        Assert.Equal(2, importado.GetProperty("criados").GetInt32());
        Assert.Equal(2, importado.GetProperty("servicosCriados").GetInt32());
        var lista = (await Ler(await dono.GetAsync("/api/v1/fornecedores"))).EnumerateArray().ToList();
        var doce = lista.Single(item => item.GetProperty("nome").GetString() == "Doce Mel");
        var detalhe = await Ler(await dono.GetAsync($"/api/v1/fornecedores/{doce.GetProperty("id").GetGuid()}"));
        Assert.Equal("Aleatoria", detalhe.GetProperty("pixTipo").GetString());

        var repetido = await Ler(await dono.PostAsync("/api/v1/fornecedores/importar", Arquivo(livro =>
        {
            var aba = livro.AddWorksheet("Fornecedores");
            aba.Cell(1, 1).Value = "Nome";
            aba.Cell(1, 2).Value = "Serviços";
            aba.Cell(2, 1).Value = "doce mel";
            aba.Cell(2, 2).Value = "Bolo";
        })));
        Assert.Contains("já está cadastrado", repetido.GetProperty("erros")[0].GetString());
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"forn-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha })).StatusCode);
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
