using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class ModelosBibliotecaFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public ModelosBibliotecaFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Importa_briefing_por_planilha_tudo_ou_nada()
    {
        var dono = await Entrar();
        Assert.Equal(HttpStatusCode.OK, (await dono.GetAsync("/api/v1/modelos-briefing/planilha")).StatusCode);

        static MultipartFormDataContent Arquivo(string nome, params string[][] linhas)
        {
            using var livro = new ClosedXML.Excel.XLWorkbook();
            var aba = livro.AddWorksheet("Briefing");
            aba.Cell(1, 1).Value = "Seção *";
            aba.Cell(1, 2).Value = "Pergunta *";
            for (var i = 0; i < linhas.Length; i++)
            {
                aba.Cell(i + 2, 1).Value = linhas[i][0];
                aba.Cell(i + 2, 2).Value = linhas[i][1];
            }

            var memoria = new MemoryStream();
            livro.SaveAs(memoria);
            return new MultipartFormDataContent
            {
                { new StringContent(nome), "nome" },
                { new ByteArrayContent(memoria.ToArray()), "arquivo", "briefing.xlsx" },
            };
        }

        var comErro = await Ler(await dono.PostAsync("/api/v1/modelos-briefing/importar", Arquivo("Ruim", ["Noiva", "Nome"], ["Noiva", ""])));
        Assert.Equal("Linha 3: informe a pergunta.", comErro.GetProperty("erros").EnumerateArray().Single().GetString());
        Assert.DoesNotContain((await Ler(await dono.GetAsync("/api/v1/modelos-briefing"))).EnumerateArray(), item => item.GetProperty("nome").GetString() == "Ruim");

        var importado = await Ler(await dono.PostAsync("/api/v1/modelos-briefing/importar",
            Arquivo("Casamento importado", ["Noiva", "Nome"], ["Noivo", "Nome"], ["noiva", "Idade"])));
        Assert.Equal(2, importado.GetProperty("secoes").GetInt32());
        Assert.Equal(3, importado.GetProperty("perguntas").GetInt32());
        var detalhe = await Ler(await dono.GetAsync($"/api/v1/modelos-briefing/{importado.GetProperty("id").GetGuid()}"));
        Assert.Equal("Casamento importado", detalhe.GetProperty("nome").GetString());
        var secoes = detalhe.GetProperty("secoes").EnumerateArray().ToList();
        Assert.Equal("Noiva", secoes[0].GetProperty("titulo").GetString());
        Assert.Equal(["Nome", "Idade"], secoes[0].GetProperty("perguntas").EnumerateArray().Select(p => p.GetProperty("enunciado").GetString()));
    }

    [Fact]
    public async Task Importa_roteiro_por_planilha_tudo_ou_nada()
    {
        var dono = await Entrar();
        Assert.Equal(HttpStatusCode.OK, (await dono.GetAsync("/api/v1/modelos-roteiro/planilha")).StatusCode);

        static MultipartFormDataContent Arquivo(string nome, params string[][] linhas)
        {
            using var livro = new ClosedXML.Excel.XLWorkbook();
            var aba = livro.AddWorksheet("Roteiro");
            string[] cabecalho = ["Momento *", "Horário", "Música", "Item"];
            for (var c = 0; c < cabecalho.Length; c++)
            {
                aba.Cell(1, c + 1).Value = cabecalho[c];
            }

            for (var i = 0; i < linhas.Length; i++)
            {
                for (var c = 0; c < linhas[i].Length; c++)
                {
                    aba.Cell(i + 2, c + 1).SetValue(linhas[i][c]);
                }
            }

            var memoria = new MemoryStream();
            livro.SaveAs(memoria);
            return new MultipartFormDataContent
            {
                { new StringContent(nome), "nome" },
                { new ByteArrayContent(memoria.ToArray()), "arquivo", "roteiro.xlsx" },
            };
        }

        var comErro = await Ler(await dono.PostAsync("/api/v1/modelos-roteiro/importar", Arquivo("Ruim", ["Chegada", "tarde", "", "Item"])));
        Assert.Equal("Linha 2: horário inválido. Use o formato 15:30.", comErro.GetProperty("erros").EnumerateArray().Single().GetString());

        var importado = await Ler(await dono.PostAsync("/api/v1/modelos-roteiro/importar",
            Arquivo("Cerimônia importada", ["Chegada", "15:30", "", "Checar alianças"], ["Saída", "", "Marcha", ""], ["chegada", "", "", "Checar microfone"])));
        Assert.Equal(2, importado.GetProperty("momentos").GetInt32());
        Assert.Equal(2, importado.GetProperty("itens").GetInt32());
        var detalhe = await Ler(await dono.GetAsync($"/api/v1/modelos-roteiro/{importado.GetProperty("id").GetGuid()}"));
        var secoes = detalhe.GetProperty("secoes").EnumerateArray().ToList();
        Assert.StartsWith("15:30", secoes[0].GetProperty("horario").GetString());
        Assert.Equal(["Checar alianças", "Checar microfone"], secoes[0].GetProperty("itens").EnumerateArray().Select(i => i.GetProperty("texto").GetString()));
        Assert.Equal("Marcha", secoes[1].GetProperty("musica").GetString());
    }

    [Fact]
    public async Task Importa_cronograma_por_planilha_com_descricao_e_papel()
    {
        var dono = await Entrar();
        Assert.Equal(HttpStatusCode.OK, (await dono.GetAsync("/api/v1/modelos-cronograma/planilha")).StatusCode);

        static MultipartFormDataContent Arquivo(string titulo, params string[][] linhas)
        {
            using var livro = new ClosedXML.Excel.XLWorkbook();
            var aba = livro.AddWorksheet("Cronograma");
            string[] cabecalho = ["Item *", "Descrição", "Data", "Hora", "Responsável", "Recado aos fornecedores"];
            for (var c = 0; c < cabecalho.Length; c++)
            {
                aba.Cell(1, c + 1).Value = cabecalho[c];
            }

            for (var i = 0; i < linhas.Length; i++)
            {
                for (var c = 0; c < linhas[i].Length; c++)
                {
                    aba.Cell(i + 2, c + 1).SetValue(linhas[i][c]);
                }
            }

            var memoria = new MemoryStream();
            livro.SaveAs(memoria);
            return new MultipartFormDataContent
            {
                { new StringContent(titulo), "nome" },
                { new ByteArrayContent(memoria.ToArray()), "arquivo", "cronograma.xlsx" },
            };
        }

        var comErro = await Ler(await dono.PostAsync("/api/v1/modelos-cronograma/importar", Arquivo("Ruim", ["Flores", "", "", "", "Fotógrafo", ""])));
        Assert.Equal("Linha 2: responsável deve ser Organizador, Assistente ou Cliente.", comErro.GetProperty("erros").EnumerateArray().Single().GetString());

        var importado = await Ler(await dono.PostAsync("/api/v1/modelos-cronograma/importar",
            Arquivo("Montagem", ["Entrega das flores", "Quais flores?", "", "08:00", "Organizador", "Entrada lateral"], ["Chegada do buffet", "", "", "", "", ""])));
        Assert.Equal(2, importado.GetProperty("itens").GetInt32());
        var detalhe = await Ler(await dono.GetAsync($"/api/v1/modelos-cronograma/{importado.GetProperty("id").GetGuid()}"));
        Assert.Equal("Montagem", detalhe.GetProperty("titulo").GetString());
        var primeiro = detalhe.GetProperty("itens").EnumerateArray().First();
        Assert.Equal("Quais flores?", primeiro.GetProperty("descricao").GetString());
        Assert.Equal("Organizer", primeiro.GetProperty("responsavel").GetString());
        Assert.Equal("Entrada lateral", primeiro.GetProperty("recadoFornecedores").GetString());
    }

    [Fact]
    public async Task Bibliotecas_criam_clonam_excluem_e_isolam()
    {
        var dono = await Entrar();
        var outra = await Entrar();

        var briefing = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-briefing", new
        {
            nome = "Briefing casamento",
            secoes = new[]
            {
                new
                {
                    titulo = "Geral",
                    descricao = "Sobre o cliente",
                    perguntas = new[] { new { enunciado = "Quantos convidados?", tipo = "TextoCurto" } },
                },
            },
        }));
        Assert.False(briefing.GetProperty("padrao").GetBoolean());
        var briefingId = briefing.GetProperty("id").GetGuid();
        var briefingClone = await Ler(await dono.PostAsJsonAsync($"/api/v1/modelos-briefing/{briefingId}/clonar", new { }));
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/modelos-briefing/{briefingClone.GetProperty("id").GetGuid()}")).StatusCode);
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/modelos-briefing"))).EnumerateArray());

        var roteiro = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-roteiro", new
        {
            nome = "Cerimônia",
            secoes = new[] { new { titulo = "Entrada", horario = "16:00:00", musica = "Marcha", itens = new[] { new { texto = "Padrinhos" } } } },
        }));
        var roteiroClone = await Ler(await dono.PostAsJsonAsync($"/api/v1/modelos-roteiro/{roteiro.GetProperty("id").GetGuid()}/clonar", new { }));
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/modelos-roteiro/{roteiroClone.GetProperty("id").GetGuid()}")).StatusCode);

        var cronograma = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-cronograma", new
        {
            titulo = "Semana do evento",
            descricao = "Checklist",
            itens = new[] { new { rotulo = "Ensaio", responsavel = "Equipe" } },
        }));
        var cronogramaClone = await Ler(await dono.PostAsJsonAsync($"/api/v1/modelos-cronograma/{cronograma.GetProperty("id").GetGuid()}/clonar", new { }));
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/modelos-cronograma/{cronogramaClone.GetProperty("id").GetGuid()}")).StatusCode);

        var inspiracao = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-inspiracoes", new { nome = "Decoração" }));
        var inspiracaoId = inspiracao.GetProperty("id").GetGuid();
        var editadaUmaVez = await dono.PutAsJsonAsync($"/api/v1/modelos-inspiracoes/{inspiracaoId}", new { nome = "Decoração", itens = new[] { new { url = "https://exemplo.com/a.jpg", arquivoId = (Guid?)null } } });
        Assert.Equal(HttpStatusCode.OK, editadaUmaVez.StatusCode);
        var editadaDuasVezes = await Ler(await dono.PutAsJsonAsync($"/api/v1/modelos-inspiracoes/{inspiracaoId}", new { nome = "Decoração", itens = new[] { new { url = "https://exemplo.com/b.jpg", arquivoId = (Guid?)null }, new { url = "https://exemplo.com/c.jpg", arquivoId = (Guid?)null } } }));
        Assert.Equal(2, editadaDuasVezes.GetProperty("itens").GetArrayLength());
        var inspiracaoClone =await Ler(await dono.PostAsJsonAsync($"/api/v1/modelos-inspiracoes/{inspiracao.GetProperty("id").GetGuid()}/clonar", new { }));
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/modelos-inspiracoes/{inspiracaoClone.GetProperty("id").GetGuid()}")).StatusCode);

        var mensagem = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-mensagens", new
        {
            nome = "RSVP",
            texto = "Olá, confirme presença em {{nome_evento}}",
        }));
        Assert.Contains(mensagem.GetProperty("parametros").EnumerateArray(), item => item.GetString() == "{{nome_evento}}");
        Assert.Contains(mensagem.GetProperty("parametros").EnumerateArray(), item => item.GetString() == "{{nome_contratante}}");
        Assert.Contains(mensagem.GetProperty("parametros").EnumerateArray(), item => item.GetString() == "{{valor}}");
        var paraLead = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos-mensagens", new
        {
            nome = "Orçamento",
            texto = "Olá! {{nome_oportunidade}}: {{valor}} até {{validade}}. Veja: {{link_proposta}}{{mesa_dos_convidados}} {{tag_desconhecida}}",
        }));
        var lead = (await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Ana e Pedro",
            estagio = "Contato inicial",
            contatos = new[] { new { nome = "Ana", telefone = "11977770009", email = "ana9@ex.com" } },
            contratante = ContratanteDeTeste.Completo,
        }))).GetProperty("id").GetGuid();
        var orcamento = (await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId = lead, conteudo = "Proposta", valor = 8500m })))
            .GetProperty("id").GetGuid();
        var aplicada = (await Ler(await dono.GetAsync(
            $"/api/v1/orcamentos-funil/{orcamento}/mensagem?modeloId={paraLead.GetProperty("id").GetGuid()}&link=https://x.com/p/1")))
            .GetProperty("texto").GetString()!;
        Assert.StartsWith("Olá! Ana e Pedro: R$", aplicada);
        Assert.Contains("8.500,00", aplicada);
        Assert.EndsWith("Veja: https://x.com/p/1 {{tag_desconhecida}}", aplicada);
        Assert.DoesNotContain("{{validade}}", aplicada);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync(
            $"/api/v1/orcamentos-funil/{orcamento}/mensagem?modeloId={paraLead.GetProperty("id").GetGuid()}")).StatusCode);

        var mensagemClone = await Ler(await dono.PostAsJsonAsync($"/api/v1/modelos-mensagens/{mensagem.GetProperty("id").GetGuid()}/clonar", new { }));
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/modelos-mensagens/{mensagemClone.GetProperty("id").GetGuid()}")).StatusCode);
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/modelos-mensagens"))).EnumerateArray());

        var modelo = await Ler(await dono.PostAsJsonAsync("/api/v1/modelos", new { nome = "Casamento completo", tipo = "Casamento" }));
        var modeloId = modelo.GetProperty("id").GetGuid();
        await Ler(await dono.PutAsJsonAsync($"/api/v1/modelos/{modeloId}", new
        {
            nome = "Casamento completo",
            tipo = "Casamento",
            permissoes = new { gerais = true, planejamento = true, tarefas = true, servicosFornecedores = true, convites = true },
            servicos = new[]
            {
                new
                {
                    nome = "Buffet",
                    valorEstimado = 5000,
                    itens = new[] { new { tipo = "Tarefa", texto = "Prova do menu" } },
                },
            },
            tarefas = new[] { new { titulo = "Contratar banda", diasAntes = 30 } },
            vinculos = Array.Empty<object>(),
        }));
        var clone = await Ler(await dono.PostAsJsonAsync($"/api/v1/modelos/{modeloId}/clonar", new { }));
        Assert.Contains("cópia", clone.GetProperty("nome").GetString(), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/modelos/{modeloId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"/api/v1/modelos/{clone.GetProperty("id").GetGuid()}")).StatusCode);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"bib-{Guid.NewGuid():N}@aralu.test";
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
