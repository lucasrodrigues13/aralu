using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Project.Domain.Eventos;
using Project.Domain.Modelos;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062 Fase 3, lote 3.3: exclusão barrada por FK vira 409, responsável e autor ligados ao membro, vínculo sem FK sai junto.</summary>
[Collection(ColecaoApi.Nome)]
public class IntegridadeFase3Tests
{
    private const string Senha = "ceu-de-junho-42";
    private readonly BancoFixture _banco;

    public IntegridadeFase3Tests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Fornecedor_em_servico_de_evento_nao_e_excluido_e_volta_409()
    {
        var dona = await EntrarDono();
        var servicoConta = await Ler(await dona.PostAsJsonAsync("/api/v1/servicos-conta", new { nome = $"Serviço {Guid.NewGuid():N}" }));
        var fornecedor = await Ler(await dona.PostAsJsonAsync("/api/v1/fornecedores", new
        {
            nome = "Buffet Teste",
            servicoContaIds = new[] { servicoConta.GetProperty("id").GetGuid() },
            emails = new[] { new { endereco = "buffet@exemplo.com" } },
            telefones = new[] { new { numero = "11999990000", movel = true } },
        }));
        var fornecedorId = fornecedor.GetProperty("id").GetGuid();
        var evento = (await Ler(await dona.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Aniversario", primeiroNome = "Festa" }))).GetProperty("id").GetGuid();
        var comServico = await Ler(await dona.PostAsJsonAsync($"/api/v1/eventos/{evento}/servicos", new { nome = "Buffet" }));
        var servicoId = comServico.GetProperty("servicos").EnumerateArray().Single().GetProperty("id").GetGuid();
        await Ler(await dona.PostAsJsonAsync($"/api/v1/eventos/{evento}/servicos/{servicoId}/fornecedores", new { fornecedorId, etapa = "Orcamento" }));

        var excluir = await dona.DeleteAsync($"/api/v1/fornecedores/{fornecedorId}");

        Assert.Equal(HttpStatusCode.Conflict, excluir.StatusCode);
        Assert.Contains("fornecedor está em serviços de eventos", await excluir.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, (await dona.GetAsync($"/api/v1/fornecedores/{fornecedorId}")).StatusCode);
    }

    [Fact]
    public async Task Responsavel_da_equipe_e_autor_do_comentario_ficam_ligados_ao_membro()
    {
        var dona = await EntrarDono();
        var email = $"ass-{Guid.NewGuid():N}@aralu.test";
        var membroId = (await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Ana", email }))).GetProperty("id").GetGuid();
        var membro = await AceitarEEntrar(email);
        var evento = (await Ler(await dona.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Aniversario", primeiroNome = "Festa" }))).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dona.PutAsJsonAsync($"/api/v1/eventos/{evento}/assistentes", new { assistentes = new[] { membroId } })).StatusCode);

        var tarefa = await Ler(await dona.PostAsJsonAsync($"/api/v1/eventos/{evento}/tarefas", new
        {
            titulo = "Confirmar buffet",
            responsaveis = new object[] { new { papel = "Organizer" }, new { papel = "Assistente", referenciaId = membroId.ToString() } },
        }));
        var tarefaId = tarefa.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await membro.PostAsJsonAsync($"/api/v1/tarefas/{tarefaId}/comentarios", new { texto = "Liguei para o buffet." })).StatusCode);

        await using var banco = Banco();
        var responsaveis = await banco.Set<Project.Domain.Tarefas.ResponsavelTarefa>().IgnoreQueryFilters()
            .Where(item => item.TarefaId == tarefaId).ToListAsync();
        Assert.Contains(responsaveis, item => item.MembroId == membroId);
        Assert.Contains(responsaveis, item => item.Papel == Project.Domain.Tarefas.PapelResponsavel.Organizer && item.MembroId == null);
        var comentario = await banco.Set<Project.Domain.Tarefas.ComentarioTarefa>().IgnoreQueryFilters().SingleAsync(item => item.TarefaId == tarefaId);
        Assert.Equal(membroId, comentario.AutorMembroId);
    }

    [Fact]
    public async Task Apagar_modelo_de_briefing_tira_o_vinculo_dos_modelos_de_evento()
    {
        var dona = await EntrarDono();
        var briefing = (await Ler(await dona.PostAsJsonAsync("/api/v1/modelos-briefing", new
        {
            nome = $"Briefing {Guid.NewGuid():N}"[..20],
            secoes = new[] { new { titulo = "Geral", descricao = "", perguntas = new[] { new { enunciado = "Quantos convidados?", tipo = "TextoCurto" } } } },
        }))).GetProperty("id").GetGuid();
        Guid modeloId;
        await using (var banco = Banco())
        {
            var conta = await banco.Set<ModeloBriefing>().IgnoreQueryFilters().Where(item => item.Id == briefing).Select(item => item.ContaId).SingleAsync();
            var modelo = new ModeloEvento { Id = Guid.NewGuid(), ContaId = conta, Nome = "Casamento", Tipo = TipoEvento.Aniversario };
            modelo.Vinculos.Add(new VinculoModeloEvento { Id = Guid.NewGuid(), ContaId = conta, ModeloId = modelo.Id, Tipo = TipoVinculoModelo.Briefing, BibliotecaId = briefing });
            banco.Modelos.Add(modelo);
            await banco.SaveChangesAsync();
            modeloId = modelo.Id;
        }

        Assert.True((await dona.DeleteAsync($"/api/v1/modelos-briefing/{briefing}")).IsSuccessStatusCode);

        await using var depois = Banco();
        Assert.False(await depois.Set<VinculoModeloEvento>().IgnoreQueryFilters().AnyAsync(item => item.ModeloId == modeloId));
    }

    private AppDbContext Banco() => new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options);

    private async Task<HttpClient> EntrarDono()
    {
        var email = $"org-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = query["usuarioId"].ToString(), token = query["token"].ToString() })).StatusCode);
        return await Entrar(cliente, email);
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
        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var sessao = await Ler(entrada);
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
