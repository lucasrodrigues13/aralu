using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

/// <summary>Proposta por link (SPEC-031 parte C, §6.6 e cenários da §15).</summary>
[Collection(ColecaoApi.Nome)]
public class PropostaFluxoTests
{
    private const string Senha = "ceu-de-junho-42";
    private readonly BancoFixture _banco;

    public PropostaFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Enviar_gera_link_e_move_para_orcamento_enviado()
    {
        var dono = await Entrar();
        var (oportunidadeId, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Carla");

        var enviado = await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/enviar", new { }));
        var token = enviado.GetProperty("tokenLink").GetString()!;
        Assert.True(token.Length >= 40);
        Assert.DoesNotContain(orcamentoId.ToString(), token);
        Assert.Equal("NaoAberta", enviado.GetProperty("situacaoProposta").GetString());
        var validoAte = enviado.GetProperty("validoAte").GetDateTimeOffset();
        Assert.InRange(validoAte, DateTimeOffset.UtcNow.AddDays(29), DateTimeOffset.UtcNow.AddDays(31));

        var lead = await Ler(await dono.GetAsync($"/api/v1/oportunidades/{oportunidadeId}"));
        Assert.Equal("Orçamento enviado", lead.GetProperty("estagio").GetString());
        Assert.Equal("NaoAberta", lead.GetProperty("proposta").GetProperty("situacao").GetString());

        // Reenviar mantém o mesmo link.
        var reenviado = await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/enviar", new { }));
        Assert.Equal(token, reenviado.GetProperty("tokenLink").GetString());
    }

    [Fact]
    public async Task Abertura_pela_dona_nao_conta_e_pelo_lead_conta()
    {
        var dono = await Entrar();
        var (oportunidadeId, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Duda");
        var token = await Enviar(dono, orcamentoId);

        var pelaDona = await Ler(await dono.GetAsync($"/api/v1/publico/propostas/{token}"));
        Assert.Equal("Disponivel", pelaDona.GetProperty("estado").GetString());
        Assert.Equal("NaoAberta", (await Lead(dono, oportunidadeId)).GetProperty("proposta").GetProperty("situacao").GetString());

        var anonimo = _banco.Fabrica.CreateClient();
        var pagina = await Ler(await anonimo.GetAsync($"/api/v1/publico/propostas/{token}"));
        Assert.Equal("Casamento Duda", pagina.GetProperty("titulo").GetString());
        Assert.Equal(9000m, pagina.GetProperty("valor").GetDecimal());
        Assert.Contains("Proposta para Casamento Duda", pagina.GetProperty("conteudo").GetString());

        var proposta = (await Lead(dono, oportunidadeId)).GetProperty("proposta");
        Assert.Equal("Aberta", proposta.GetProperty("situacao").GetString());
        var primeira = proposta.GetProperty("abertaEm").GetDateTimeOffset();

        await Ler(await anonimo.GetAsync($"/api/v1/publico/propostas/{token}"));
        Assert.Equal(primeira, (await Lead(dono, oportunidadeId)).GetProperty("proposta").GetProperty("abertaEm").GetDateTimeOffset());

        Assert.Equal(HttpStatusCode.NotFound, (await anonimo.GetAsync("/api/v1/publico/propostas/nao-existe")).StatusCode);
    }

    [Fact]
    public async Task Dona_em_outra_aba_marcada_pelo_cabecalho_nao_conta_e_nao_responde()
    {
        var dono = await Entrar();
        var contaId = (await Ler(await dono.GetAsync("/api/v1/conta/area"))).GetProperty("usuarioId").GetString()!;
        var (oportunidadeId, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Fabi");
        var token = await Enviar(dono, orcamentoId);

        // Outra aba: sem o login, só com a marca do navegador.
        var outraAba = _banco.Fabrica.CreateClient();
        outraAba.DefaultRequestHeaders.Add("X-Aralu-Visitante", contaId);

        var pagina = await Ler(await outraAba.GetAsync($"/api/v1/publico/propostas/{token}"));
        Assert.True(pagina.GetProperty("daPropriaConta").GetBoolean());
        Assert.Equal("NaoAberta", (await Lead(dono, oportunidadeId)).GetProperty("proposta").GetProperty("situacao").GetString());
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await outraAba.PostAsJsonAsync($"/api/v1/publico/propostas/{token}/resposta", new { tipo = "Aceitar" })).StatusCode);

        // Marca de outra conta não vale como a dona.
        var outraConta = _banco.Fabrica.CreateClient();
        outraConta.DefaultRequestHeaders.Add("X-Aralu-Visitante", Guid.NewGuid().ToString());
        Assert.False((await Ler(await outraConta.GetAsync($"/api/v1/publico/propostas/{token}"))).GetProperty("daPropriaConta").GetBoolean());
    }

    [Fact]
    public async Task Assessoria_registra_a_resposta_do_cliente_por_fora_do_link()
    {
        var dono = await Entrar();
        var (oportunidadeId, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Gabi");
        await Enviar(dono, orcamentoId);
        var url = $"/api/v1/orcamentos-funil/{orcamentoId}/responder";

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync(url, new { tipo = "Talvez" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync(url, new { tipo = "Duvidas", mensagem = " " })).StatusCode);

        // Dúvida: segue em andamento e aparece no cartão, sem contar como abertura do link.
        var duvida = await Ler(await dono.PostAsJsonAsync(url, new { tipo = "Duvidas", mensagem = "Aceita parcelar?" }));
        Assert.Equal("EmAndamento", duvida.GetProperty("situacao").GetString());
        var proposta = (await Lead(dono, oportunidadeId)).GetProperty("proposta");
        Assert.Equal("Duvidas", proposta.GetProperty("situacao").GetString());
        Assert.Equal("Aceita parcelar?", proposta.GetProperty("mensagem").GetString());
        Assert.Equal(JsonValueKind.Null, proposta.GetProperty("abertaEm").ValueKind);

        // Aceite: vai para Respondidos e não aceita outra resposta.
        var aceite = await Ler(await dono.PostAsJsonAsync(url, new { tipo = "Aceitar" }));
        Assert.Equal("Respondido", aceite.GetProperty("situacao").GetString());
        Assert.Equal("Aceita", (await Lead(dono, oportunidadeId)).GetProperty("proposta").GetProperty("situacao").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync(url, new { tipo = "Recusar" })).StatusCode);

        // Sem corpo, como a tela antiga fazia, só marca como respondido.
        var (_, outro) = await CriarLeadComOrcamento(dono, "Casamento Hugo");
        var antigo = await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{outro}/responder", new { }));
        Assert.Equal("Respondido", antigo.GetProperty("situacao").GetString());
    }

    [Fact]
    public async Task Tres_respostas_e_vale_a_ultima()
    {
        var dono = await Entrar();
        var (oportunidadeId, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Eva");
        var token = await Enviar(dono, orcamentoId);
        var anonimo = _banco.Fabrica.CreateClient();
        var resposta = $"/api/v1/publico/propostas/{token}/resposta";

        // A dona logada não responde pelo lead.
        Assert.Equal(HttpStatusCode.Forbidden, (await dono.PostAsJsonAsync(resposta, new { tipo = "Aceitar" })).StatusCode);

        // Dúvida exige mensagem e marca o retorno para hoje.
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync(resposta, new { tipo = "Duvidas", mensagem = " " })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync(resposta, new { tipo = "Duvidas", mensagem = new string('a', 1001) })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync(resposta, new { tipo = "Talvez" })).StatusCode);
        var duvida = await Ler(await anonimo.PostAsJsonAsync(resposta, new { tipo = "Duvidas", mensagem = "Inclui o ensaio?" }));
        Assert.Equal("Duvidas", duvida.GetProperty("resposta").GetString());
        var lead = await Lead(dono, oportunidadeId);
        Assert.Equal("Duvidas", lead.GetProperty("proposta").GetProperty("situacao").GetString());
        Assert.Equal("Inclui o ensaio?", lead.GetProperty("proposta").GetProperty("mensagem").GetString());
        Assert.Equal(DateTime.UtcNow.ToString("yyyy-MM-dd"), lead.GetProperty("retornarEm").GetString());

        // Recusar com motivo: o lead não é descartado sozinho.
        await Ler(await anonimo.PostAsJsonAsync(resposta, new { tipo = "Recusar", mensagem = "Achei caro" }));
        lead = await Lead(dono, oportunidadeId);
        Assert.Equal("Recusada", lead.GetProperty("proposta").GetProperty("situacao").GetString());
        Assert.Equal("Achei caro", lead.GetProperty("proposta").GetProperty("mensagem").GetString());
        Assert.Equal("Orçamento enviado", lead.GetProperty("estagio").GetString());

        // Aceitar: vale a última resposta e o lead não vai sozinho para Contratado.
        // O aceite pede os dados do contratante (SPEC-049): sem eles, não grava.
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync(resposta, new { tipo = "Aceitar" })).StatusCode);
        Assert.Equal("Recusada", (await Lead(dono, oportunidadeId)).GetProperty("proposta").GetProperty("situacao").GetString());
        await Ler(await anonimo.PostAsJsonAsync(resposta, new
        {
            tipo = "Aceitar",
            contratante = new
            {
                nome = "Maria da Silva",
                documento = "529.982.247-25",
                estadoCivil = "Solteiro(a)",
                nacionalidade = "Brasileira",
                email = "maria@exemplo.com",
                celular = "11977776666",
                cep = "01001-000",
                endereco = "Praça da Sé",
                numero = "1",
                bairro = "Sé",
                cidade = "São Paulo",
                estado = "SP",
            },
        }));
        lead = await Lead(dono, oportunidadeId);
        Assert.Equal("52998224725", lead.GetProperty("contratante").GetProperty("documento").GetString());
        Assert.True(lead.GetProperty("dadosContratoCompletos").GetBoolean());
        Assert.Equal("Aceita", lead.GetProperty("proposta").GetProperty("situacao").GetString());
        Assert.Equal("Orçamento enviado", lead.GetProperty("estagio").GetString());
        var orcamento = await Ler(await dono.GetAsync($"/api/v1/orcamentos-funil/{orcamentoId}"));
        Assert.Equal("Respondido", orcamento.GetProperty("situacao").GetString());

        var opcoes = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options;
        await using var banco = new AppDbContext(opcoes);
        Assert.Equal(3, await banco.RespostasPropostaFunil.CountAsync(item => item.OrcamentoFunilId == orcamentoId));

        // Descartar apaga CPF/CNPJ, nascimento e endereço do contratante (SPEC-049 §8).
        var descartado = await Ler(await dono.PostAsJsonAsync(
            $"/api/v1/oportunidades/{oportunidadeId}/mover",
            new { estagio = "Descartado", motivoDescarte = "Desistiu" }));
        var contratante = descartado.GetProperty("contratante");
        Assert.Equal(JsonValueKind.Null, contratante.GetProperty("documento").ValueKind);
        Assert.Equal(JsonValueKind.Null, contratante.GetProperty("cep").ValueKind);
        Assert.Equal("Maria da Silva", contratante.GetProperty("nome").GetString());
    }

    [Fact]
    public async Task Editar_depois_de_enviar_mantem_link_e_volta_para_nao_aberta()
    {
        var dono = await Entrar();
        var (oportunidadeId, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Fê");
        var token = await Enviar(dono, orcamentoId);
        var anonimo = _banco.Fabrica.CreateClient();
        await Ler(await anonimo.PostAsJsonAsync($"/api/v1/publico/propostas/{token}/resposta", new { tipo = "Duvidas", mensagem = "Parcela?" }));

        // Mesmo conteúdo: nada muda.
        var igual = await Ler(await dono.PutAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}", new { conteudo = "Proposta para Casamento Fê", valor = 9000 }));
        Assert.Equal("Duvidas", igual.GetProperty("situacaoProposta").GetString());

        var editado = await Ler(await dono.PutAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}", new { conteudo = "Proposta nova", valor = 8500 }));
        Assert.Equal(token, editado.GetProperty("tokenLink").GetString());
        Assert.Equal("NaoAberta", editado.GetProperty("situacaoProposta").GetString());
        Assert.Equal("NaoAberta", (await Lead(dono, oportunidadeId)).GetProperty("proposta").GetProperty("situacao").GetString());
    }

    [Fact]
    public async Task Link_vencido_e_orcamento_cancelado_nao_aceitam_resposta()
    {
        var dono = await Entrar();
        var anonimo = _banco.Fabrica.CreateClient();

        var (_, vencidoId) = await CriarLeadComOrcamento(dono, "Casamento Gi");
        var vencido = await Enviar(dono, vencidoId);
        var opcoes = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options;
        await using (var banco = new AppDbContext(opcoes))
        {
            var item = await banco.OrcamentosFunil.SingleAsync(o => o.Id == vencidoId);
            item.ValidoAte = DateTimeOffset.UtcNow.AddMinutes(-1);
            await banco.SaveChangesAsync();
        }

        var paginaVencida = await Ler(await anonimo.GetAsync($"/api/v1/publico/propostas/{vencido}"));
        Assert.Equal("Vencida", paginaVencida.GetProperty("estado").GetString());
        Assert.Equal(JsonValueKind.Null, paginaVencida.GetProperty("conteudo").ValueKind);
        Assert.Equal(JsonValueKind.Null, paginaVencida.GetProperty("valor").ValueKind);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync($"/api/v1/publico/propostas/{vencido}/resposta", new { tipo = "Aceitar" })).StatusCode);

        var (oportunidadeId, canceladoId) = await CriarLeadComOrcamento(dono, "Casamento Helô");
        var cancelado = await Enviar(dono, canceladoId);
        await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{canceladoId}/cancelar", new { }));
        var paginaCancelada = await Ler(await anonimo.GetAsync($"/api/v1/publico/propostas/{cancelado}"));
        Assert.Equal("Cancelada", paginaCancelada.GetProperty("estado").GetString());
        Assert.Equal(JsonValueKind.Null, paginaCancelada.GetProperty("conteudo").ValueKind);
        Assert.Equal(HttpStatusCode.BadRequest, (await anonimo.PostAsJsonAsync($"/api/v1/publico/propostas/{cancelado}/resposta", new { tipo = "Aceitar" })).StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Lead(dono, oportunidadeId)).GetProperty("proposta").ValueKind);
    }

    [Fact]
    public async Task Outra_conta_nao_ve_a_proposta()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var (_, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Iara");
        await Enviar(dono, orcamentoId);

        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/orcamentos-funil/{orcamentoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/enviar", new { })).StatusCode);
        Assert.Empty((await Ler(await outra.GetAsync("/api/v1/oportunidades"))).EnumerateArray());
    }

    [Fact]
    public async Task Proposta_mostra_as_parcelas_e_mudar_as_parcelas_zera_a_resposta()
    {
        var dono = await Entrar();
        var (_, orcamentoId) = await CriarLeadComOrcamento(dono, "Casamento Parcelas");
        var token = await Enviar(dono, orcamentoId);
        var anonimo = _banco.Fabrica.CreateClient();

        var sem = await Ler(await anonimo.GetAsync($"/api/v1/publico/propostas/{token}"));
        Assert.True(sem.GetProperty("parcelas").ValueKind is JsonValueKind.Null || sem.GetProperty("parcelas").GetArrayLength() == 0);

        await Ler(await anonimo.PostAsJsonAsync($"/api/v1/publico/propostas/{token}/resposta", new { tipo = "Duvidas", mensagem = "Posso dividir?" }));
        await Ler(await dono.PutAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/parcelas", new { quantidadeParcelas = 3, primeiraParcela = "2027-01-10" }));

        var com = await Ler(await anonimo.GetAsync($"/api/v1/publico/propostas/{token}"));
        Assert.Equal(3, com.GetProperty("parcelas").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, com.GetProperty("resposta").ValueKind);
    }


    private async Task<(Guid OportunidadeId, Guid OrcamentoId)> CriarLeadComOrcamento(HttpClient dono, string nome)
    {
        var oportunidade = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome,
            estagio = "Contato inicial",
            contatos = new[] { new { nome = "Contato", telefone = "11977776666" } },
        }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();
        var orcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new
        {
            oportunidadeId,
            conteudo = $"Proposta para {nome}",
            valor = 9000,
        }));
        return (oportunidadeId, orcamento.GetProperty("id").GetGuid());
    }

    private static async Task<string> Enviar(HttpClient dono, Guid orcamentoId) =>
        (await Ler(await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/enviar", new { }))).GetProperty("tokenLink").GetString()!;

    private static async Task<JsonElement> Lead(HttpClient dono, Guid oportunidadeId) =>
        await Ler(await dono.GetAsync($"/api/v1/oportunidades/{oportunidadeId}"));

    private async Task<HttpClient> Entrar()
    {
        var email = $"proposta-{Guid.NewGuid():N}@aralu.test";
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
