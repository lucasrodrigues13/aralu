using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Negocio;

[Collection(ColecaoApi.Nome)]
public class DinheiroFluxoTests
{
    private const string Senha = "ceu-de-junho-42";
    private readonly BancoFixture _banco;

    public DinheiroFluxoTests(BancoFixture banco) => _banco = banco;

    [Fact]
    public async Task Parcelas_nascem_no_orcamento_vao_para_o_contrato_e_o_cliente_paga_ali()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var oportunidade = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new
        {
            nome = "Casamento Ana e Rui",
            estagio = "Contato inicial",
            contatos = new[] { new { nome = "Ana", telefone = "11977776666" } },
            contratante = ContratanteDeTeste.Completo,
        }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();
        var orcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId, conteudo = "Proposta", valor = 9000 }));
        var orcamentoId = orcamento.GetProperty("id").GetGuid();
        var urlParcelas = $"/api/v1/orcamentos-funil/{orcamentoId}/parcelas";

        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(urlParcelas, new { quantidadeParcelas = 0, primeiraParcela = "2027-01-10" })).StatusCode);
        var comParcelas = await Ler(await dono.PutAsJsonAsync(urlParcelas, new
        {
            quantidadeParcelas = 3,
            primeiraParcela = "2027-01-10",
            comEntrada = true,
            baseEntrada = "Valor",
            valorEntrada = 3000,
            dataEntrada = "2026-12-01",
        }));
        var doOrcamento = comParcelas.GetProperty("parcelas");
        Assert.Equal(4, doOrcamento.GetArrayLength());
        Assert.True(doOrcamento[0].GetProperty("entrada").GetBoolean());
        Assert.Equal(2000m, doOrcamento[1].GetProperty("valor").GetDecimal());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync(urlParcelas, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);

        // Sem orçamento aceito, o contrato não é gerado (SPEC-050).
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId, conteudo = "Contrato" })).StatusCode);

        // Orçamento aceito: o contrato novo copia as parcelas.
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/responder", new { tipo = "Aceitar" })).StatusCode);
        var contrato = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId, conteudo = "Contrato" }));
        var contratoId = contrato.GetProperty("id").GetGuid();
        var parcelas = contrato.GetProperty("parcelas");
        Assert.Equal(4, parcelas.GetArrayLength());
        Assert.Equal(9000m, contrato.GetProperty("valorTotal").GetDecimal());
        var entradaId = parcelas[0].GetProperty("id").GetGuid();
        var urlRecebimento = $"/api/v1/contratos-funil/{contratoId}/parcelas/{entradaId}/recebimentos";

        var demais = await dono.PostAsJsonAsync(urlRecebimento, new { valor = 3500, forma = "Pix", data = "2026-12-01" });
        Assert.Equal(HttpStatusCode.BadRequest, demais.StatusCode);

        var parcial = await Ler(await dono.PostAsJsonAsync(urlRecebimento, new { valor = 1000, forma = "Pix", data = "2026-12-01" }));
        Assert.Equal(1000m, parcial.GetProperty("recebido").GetDecimal());
        Assert.Equal(8000m, parcial.GetProperty("saldo").GetDecimal());
        Assert.Equal("Parcial", parcial.GetProperty("parcelas")[0].GetProperty("situacao").GetString());
        Assert.Equal("11977776666", parcial.GetProperty("oportunidadeTelefone").GetString());

        var desfeito = await Ler(await dono.DeleteAsync($"{urlRecebimento}/ultimo"));
        Assert.Equal(0m, desfeito.GetProperty("recebido").GetDecimal());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.DeleteAsync($"{urlRecebimento}/ultimo")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsJsonAsync(urlRecebimento, new { valor = 10, forma = "Pix", data = "2026-12-01" })).StatusCode);

        // A tela Hoje cobra a entrada, que está vencida desde 01/12/2026 ou dentro da semana, conforme a data de hoje.
        var painel = await Ler(await dono.GetAsync("/api/v1/hoje"));
        Assert.All(painel.GetProperty("cobrancas").EnumerateArray(), item => Assert.Equal(contratoId, item.GetProperty("contratoId").GetGuid()));
    }

    [Fact]
    public async Task Gestao_financeira_define_o_parcelamento_do_contrato_ate_o_primeiro_recebimento()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var oportunidade = await Ler(await dono.PostAsJsonAsync("/api/v1/oportunidades", new { nome = "Casamento Bia e Leo", estagio = "Contato inicial", contatos = new[] { new { nome = "Bia" } }, contratante = ContratanteDeTeste.Completo }));
        var oportunidadeId = oportunidade.GetProperty("id").GetGuid();
        var orcamento = await Ler(await dono.PostAsJsonAsync("/api/v1/orcamentos-funil", new { oportunidadeId, conteudo = "Proposta", valor = 6000 }));
        var orcamentoId = orcamento.GetProperty("id").GetGuid();

        // Sem orçamento aceito, o contrato não é gerado (SPEC-050).
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId, conteudo = "Contrato" })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync($"/api/v1/orcamentos-funil/{orcamentoId}/responder", new { tipo = "Aceitar" })).StatusCode);
        var contratoCriado = await Ler(await dono.PostAsJsonAsync("/api/v1/contratos-funil", new { oportunidadeId, conteudo = "Contrato" }));
        var url = $"/api/v1/contratos-funil/{contratoCriado.GetProperty("id").GetGuid()}/parcelas";

        // À vista (uma parcela) e depois em três: a segunda definição substitui a primeira.
        var avista = await Ler(await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" }));
        Assert.Equal(1, avista.GetProperty("parcelas").GetArrayLength());
        Assert.Equal(6000m, avista.GetProperty("valorTotal").GetDecimal());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 0, primeiraParcela = "2027-01-10" })).StatusCode);
        var emTres = await Ler(await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 3, primeiraParcela = "2027-01-10" }));
        var parcelas = emTres.GetProperty("parcelas");
        Assert.Equal(3, parcelas.GetArrayLength());
        Assert.Equal(2000m, parcelas[0].GetProperty("valor").GetDecimal());

        // Com recebimento registrado, não refaz; depois de desfeito, refaz.
        var recebimento = $"{url}/{parcelas[0].GetProperty("id").GetGuid()}/recebimentos";
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync(recebimento, new { valor = 500, forma = "Pix", data = "2027-01-10" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync($"{recebimento}/ultimo")).StatusCode);
        Assert.Equal(2, (await Ler(await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10" }))).GetProperty("parcelas").GetArrayLength());

        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync(url, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);

        // Cancelado não parcela.
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsync($"/api/v1/contratos-funil/{contratoCriado.GetProperty("id").GetGuid()}/cancelar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync(url, new { quantidadeParcelas = 1, primeiraParcela = "2027-01-10" })).StatusCode);
    }

    [Fact]
    public async Task Planilha_de_budget_e_isolamento_do_dinheiro_do_evento()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Ana", segundoNome = "Rui" }));
        var eventoId = evento.GetProperty("id").GetGuid();

        var dinheiro = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"));
        Assert.Empty(dinheiro.GetProperty("pagamentosFornecedores").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro")).StatusCode);

        var planilha = await dono.GetAsync($"/api/v1/eventos/{eventoId}/budget/planilha");
        Assert.Equal(HttpStatusCode.OK, planilha.StatusCode);
    }

    [Fact]
    public async Task Hoje_conta_tarefas_de_hoje_e_mostra_o_proximo_evento()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var hoje = Project.Domain.Comum.HorarioBrasil.Data(DateTimeOffset.UtcNow);
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Bia", segundoNome = "Leo", data = hoje.AddDays(10).ToString("yyyy-MM-dd") }));
        var eventoId = evento.GetProperty("id").GetGuid();
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Ligar", prazo = hoje.ToString("yyyy-MM-dd") }));
        await Ler(await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/tarefas", new { titulo = "Atrasada", prazo = hoje.AddDays(-3).ToString("yyyy-MM-dd") }));

        var painel = await Ler(await dono.GetAsync("/api/v1/hoje"));
        Assert.Equal(1, painel.GetProperty("tarefasHoje").GetInt32());
        Assert.Equal(1, painel.GetProperty("tarefasAtrasadas").GetInt32());
        Assert.Equal(10, painel.GetProperty("proximoEvento").GetProperty("dias").GetInt32());

        var alheio = await Ler(await outra.GetAsync("/api/v1/hoje"));
        Assert.Equal(0, alheio.GetProperty("tarefasHoje").GetInt32());
        Assert.Empty(alheio.GetProperty("carteira").EnumerateArray());
    }

    [Fact]
    public async Task Pagamento_parcela_a_parcela_muda_o_pagamento_e_marcar_pagamento_marca_todas()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var (eventoId, servicoId, pagamentoId) = await EventoComFornecedorContratado(dono, 2);
        var url = $"/api/v1/eventos/{eventoId}/dinheiro/pagamentos/{pagamentoId}";

        var inicial = Pagamento(await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro")));
        Assert.False(inicial.GetProperty("pago").GetBoolean());
        Assert.Equal(4000m, inicial.GetProperty("valor").GetDecimal());
        var parcelas = inicial.GetProperty("parcelas").EnumerateArray().ToArray();
        Assert.Equal(2, parcelas.Length);

        // Uma parcela paga: o pagamento segue pendente; a segunda: fica pago sozinho.
        var umaPaga = await Ler(await dono.PutAsJsonAsync($"{url}/parcelas/{parcelas[0].GetProperty("id").GetGuid()}/pago", new { pago = true }));
        Assert.False(Pagamento(umaPaga).GetProperty("pago").GetBoolean());
        Assert.Equal(2000m, umaPaga.GetProperty("pago").GetDecimal());
        var duasPagas = await Ler(await dono.PutAsJsonAsync($"{url}/parcelas/{parcelas[1].GetProperty("id").GetGuid()}/pago", new { pago = true }));
        Assert.True(Pagamento(duasPagas).GetProperty("pago").GetBoolean());
        Assert.Equal(4000m, duasPagas.GetProperty("pago").GetDecimal());

        // Desmarcar uma parcela devolve o pagamento a pendente.
        var desmarcada = await Ler(await dono.PutAsJsonAsync($"{url}/parcelas/{parcelas[0].GetProperty("id").GetGuid()}/pago", new { pago = false }));
        Assert.False(Pagamento(desmarcada).GetProperty("pago").GetBoolean());

        // Marcar o pagamento marca todas; desfazer volta tudo.
        var tudo = Pagamento(await Ler(await dono.PutAsJsonAsync($"{url}/pago", new { pago = true })));
        Assert.True(tudo.GetProperty("pago").GetBoolean());
        Assert.All(tudo.GetProperty("parcelas").EnumerateArray(), parcela => Assert.True(parcela.GetProperty("paga").GetBoolean()));
        var desfeito = Pagamento(await Ler(await dono.PutAsJsonAsync($"{url}/pago", new { pago = false })));
        Assert.All(desfeito.GetProperty("parcelas").EnumerateArray(), parcela => Assert.False(parcela.GetProperty("paga").GetBoolean()));

        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync($"{url}/pago", new { pago = true })).StatusCode);
    }

    [Fact]
    public async Task Pagamento_pode_ser_parcelado_e_o_parcelamento_so_muda_sem_pagamento()
    {
        var dono = await Entrar();
        var (eventoId, servicoId, pagamentoId) = await EventoComFornecedorContratado(dono, 1);
        var url = $"/api/v1/eventos/{eventoId}/dinheiro/pagamentos/{pagamentoId}";

        // Sem parcelas: remover o parcelamento; depois marcar pago direto.
        var semParcelas = Pagamento(await Ler(await dono.DeleteAsync($"{url}/parcelamento")));
        Assert.Empty(semParcelas.GetProperty("parcelas").EnumerateArray());
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.DeleteAsync($"{url}/parcelamento")).StatusCode);
        Assert.True(Pagamento(await Ler(await dono.PutAsJsonAsync($"{url}/pago", new { pago = true }))).GetProperty("pago").GetBoolean());
        Assert.Equal(4000m, (await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"))).GetProperty("pago").GetDecimal());

        // Pago: não parcela. Desfeito: parcela com entrada de 1000 e 3 parcelas.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10", comEntrada = false })).StatusCode);
        await Ler(await dono.PutAsJsonAsync($"{url}/pago", new { pago = false }));
        var parcelado = Pagamento(await Ler(await dono.PutAsJsonAsync($"{url}/parcelamento", new
        {
            quantidadeParcelas = 3,
            primeiraParcela = "2027-01-10",
            comEntrada = true,
            baseEntrada = "Valor",
            valorEntrada = 1000,
            dataEntrada = "2026-12-01",
        })));
        var itens = parcelado.GetProperty("parcelas").EnumerateArray().ToArray();
        Assert.Equal(4, itens.Length);
        Assert.True(itens[0].GetProperty("entrada").GetBoolean());
        Assert.Equal(4000m, itens.Sum(item => item.GetProperty("valor").GetDecimal()));

        // Entrada que não fecha e número fora de 1 a 120 são recusados.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10", comEntrada = true, baseEntrada = "Valor", valorEntrada = 9000, dataEntrada = "2026-12-01" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 121, primeiraParcela = "2027-01-10", comEntrada = false })).StatusCode);

        // Refazer sem pagamento funciona; com parcela paga, remover é recusado e refazer exige a confirmação.
        var refeito = Pagamento(await Ler(await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10", comEntrada = false })));
        Assert.Equal(2, refeito.GetProperty("parcelas").GetArrayLength());
        await Ler(await dono.PutAsJsonAsync($"{url}/parcelas/{refeito.GetProperty("parcelas")[0].GetProperty("id").GetGuid()}/pago", new { pago = true }));
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 3, primeiraParcela = "2027-01-10", comEntrada = false })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.DeleteAsync($"{url}/parcelamento")).StatusCode);

        // Confirmado: as parcelas novas nascem sem pagamento e o pago do evento volta a zero.
        var substituido = await Ler(await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 3, primeiraParcela = "2027-01-10", comEntrada = false, substituirPagamentos = true }));
        var novas = Pagamento(substituido).GetProperty("parcelas").EnumerateArray().ToArray();
        Assert.Equal(3, novas.Length);
        Assert.All(novas, parcela => Assert.False(parcela.GetProperty("paga").GetBoolean()));
        Assert.False(Pagamento(substituido).GetProperty("pago").GetBoolean());
        Assert.Equal(0m, substituido.GetProperty("pago").GetDecimal());

        // Pagamento inteiro marcado como pago também pode ser parcelado com a confirmação.
        await Ler(await dono.PutAsJsonAsync($"{url}/pago", new { pago = true }));
        var aposPago = Pagamento(await Ler(await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10", comEntrada = false, substituirPagamentos = true })));
        Assert.False(aposPago.GetProperty("pago").GetBoolean());
        Assert.All(aposPago.GetProperty("parcelas").EnumerateArray(), parcela => Assert.False(parcela.GetProperty("paga").GetBoolean()));
    }

    [Fact]
    public async Task Comprovante_por_parcela_e_por_pagamento_aceita_pdf_recusa_outro_tipo_substitui_e_exclui()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var (eventoId, servicoId, pagamentoId) = await EventoComFornecedorContratado(dono, 2);
        var url = $"/api/v1/eventos/{eventoId}/dinheiro/pagamentos/{pagamentoId}";
        var parcelaId = Pagamento(await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"))).GetProperty("parcelas")[0].GetProperty("id").GetGuid();

        using var texto = new MultipartFormDataContent { { new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("oi")), "arquivo", "nota.txt" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"{url}/parcelas/{parcelaId}/comprovante", texto)).StatusCode);

        var grande = new byte[5 * 1024 * 1024 + 10];
        System.Text.Encoding.ASCII.GetBytes("%PDF-1.4").CopyTo(grande, 0);
        using var excesso = new MultipartFormDataContent { { new ByteArrayContent(grande), "arquivo", "grande.pdf" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"{url}/parcelas/{parcelaId}/comprovante", excesso)).StatusCode);

        // Pagamento parcelado: o comprovante é da parcela.
        using var inteiro = Pdf("recibo-total.pdf");
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"{url}/comprovante", inteiro)).StatusCode);

        using var primeiro = Pdf("recibo.pdf");
        var comPdf = Pagamento(await Ler(await dono.PostAsync($"{url}/parcelas/{parcelaId}/comprovante", primeiro)));
        var comprovante = comPdf.GetProperty("parcelas")[0].GetProperty("comprovante");
        Assert.Equal("recibo.pdf", comprovante.GetProperty("nome").GetString());
        Assert.Equal("application/pdf", comprovante.GetProperty("tipoConteudo").GetString());
        var arquivoId = comprovante.GetProperty("arquivoId").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dono.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);
        using var alheio = Pdf("alheio.pdf");
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsync($"{url}/parcelas/{parcelaId}/comprovante", alheio)).StatusCode);

        // Com comprovante, não refaz o parcelamento; enviar outro substitui e apaga o arquivo anterior.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 3, primeiraParcela = "2027-01-10", comEntrada = false })).StatusCode);
        using var novo = Pdf("novo.pdf");
        var substituido = Pagamento(await Ler(await dono.PostAsync($"{url}/parcelas/{parcelaId}/comprovante", novo)));
        Assert.Equal("novo.pdf", substituido.GetProperty("parcelas")[0].GetProperty("comprovante").GetProperty("nome").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);

        var excluido = Pagamento(await Ler(await dono.DeleteAsync($"{url}/parcelas/{parcelaId}/comprovante")));
        Assert.Equal(JsonValueKind.Null, excluido.GetProperty("parcelas")[0].GetProperty("comprovante").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await dono.DeleteAsync($"{url}/parcelas/{parcelaId}/comprovante")).StatusCode);

        // Refazer confirmado com comprovante: as parcelas novas vêm sem comprovante e o arquivo antigo é apagado.
        using var descartavel = Pdf("descartavel.pdf");
        var comDescartavel = Pagamento(await Ler(await dono.PostAsync($"{url}/parcelas/{parcelaId}/comprovante", descartavel)));
        var descartavelId = comDescartavel.GetProperty("parcelas")[0].GetProperty("comprovante").GetProperty("arquivoId").GetGuid();
        var refeito = Pagamento(await Ler(await dono.PutAsJsonAsync($"{url}/parcelamento", new { quantidadeParcelas = 2, primeiraParcela = "2027-01-10", comEntrada = false, substituirPagamentos = true })));
        Assert.All(refeito.GetProperty("parcelas").EnumerateArray(), parcela => Assert.Equal(JsonValueKind.Null, parcela.GetProperty("comprovante").ValueKind));
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/arquivos/{descartavelId}")).StatusCode);

        // Sem parcelas, o comprovante é do pagamento.
        await Ler(await dono.DeleteAsync($"{url}/parcelamento"));
        using var total = Pdf("total.pdf");
        var semParcelas = Pagamento(await Ler(await dono.PostAsync($"{url}/comprovante", total)));
        Assert.Equal("total.pdf", semParcelas.GetProperty("comprovante").GetProperty("nome").GetString());
        var semComprovante = Pagamento(await Ler(await dono.DeleteAsync($"{url}/comprovante")));
        Assert.Equal(JsonValueKind.Null, semComprovante.GetProperty("comprovante").ValueKind);
    }

    [Fact]
    public async Task Contrato_assinado_anexa_substitui_exclui_e_contratar_de_novo_mantem_pagos_e_comprovantes()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var (eventoId, servicoId, pagamentoId) = await EventoComFornecedorContratado(dono, 2);
        var urlServico = $"/api/v1/eventos/{eventoId}/servicos/{servicoId}";
        var urlVinculo = $"{urlServico}/fornecedores/{pagamentoId}";
        var urlPagamento = $"/api/v1/eventos/{eventoId}/dinheiro/pagamentos/{pagamentoId}";

        // Anexar, trocar (o arquivo antigo some), recusar tipo inválido e isolar por conta.
        using var primeiro = Pdf("contrato.pdf");
        var anexado = await Ler(await dono.PostAsync($"{urlVinculo}/contrato-assinado", primeiro));
        var arquivoId = VinculoDe(anexado, servicoId).GetProperty("contratoAssinado").GetProperty("arquivoId").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await dono.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outra.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);
        using var alheio = Pdf("alheio.pdf");
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsync($"{urlVinculo}/contrato-assinado", alheio)).StatusCode);
        using var texto = new MultipartFormDataContent { { new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("texto")), "arquivo", "contrato.txt" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsync($"{urlVinculo}/contrato-assinado", texto)).StatusCode);
        using var segundo = Pdf("contrato-2.pdf");
        var trocado = await Ler(await dono.PostAsync($"{urlVinculo}/contrato-assinado", segundo));
        Assert.Equal("contrato-2.pdf", VinculoDe(trocado, servicoId).GetProperty("contratoAssinado").GetProperty("nome").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await dono.GetAsync($"/api/v1/arquivos/{arquivoId}")).StatusCode);

        // Com parcela paga e comprovada: voltar para orçamento, excluir o fornecedor e excluir o serviço ficam bloqueados.
        var parcelas = Pagamento(await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"))).GetProperty("parcelas").EnumerateArray().ToArray();
        await Ler(await dono.PutAsJsonAsync($"{urlPagamento}/parcelas/{parcelas[0].GetProperty("id").GetGuid()}/pago", new { pago = true }));
        using var recibo = Pdf("recibo.pdf");
        await Ler(await dono.PostAsync($"{urlPagamento}/parcelas/{parcelas[0].GetProperty("id").GetGuid()}/comprovante", recibo));
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"{urlVinculo}/voltar", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.DeleteAsync(urlVinculo)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.DeleteAsync(urlServico)).StatusCode);

        // Contratar de novo: valor diferente da soma das parcelas é recusado; o mesmo valor mantém o contrato.
        Assert.Equal(HttpStatusCode.BadRequest, (await dono.PostAsJsonAsync($"{urlVinculo}/contratar", new { valor = 3000 })).StatusCode);
        var recontratado = await Ler(await dono.PostAsJsonAsync($"{urlVinculo}/contratar", new { valor = 4000 }));
        Assert.Equal("contrato-2.pdf", VinculoDe(recontratado, servicoId).GetProperty("contratoAssinado").GetProperty("nome").GetString());
        var pagamento = Pagamento(await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro")));
        var mantidas = pagamento.GetProperty("parcelas").EnumerateArray().ToArray();
        Assert.Equal(2, mantidas.Length);
        Assert.True(mantidas[0].GetProperty("paga").GetBoolean());
        Assert.Equal("recibo.pdf", mantidas[0].GetProperty("comprovante").GetProperty("nome").GetString());

        // Excluir apaga o arquivo e some da leitura.
        var excluido = await Ler(await dono.DeleteAsync($"{urlVinculo}/contrato-assinado"));
        Assert.Equal(JsonValueKind.Null, VinculoDe(excluido, servicoId).GetProperty("contratoAssinado").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await dono.DeleteAsync($"{urlVinculo}/contrato-assinado")).StatusCode);
    }

    [Fact]
    public async Task Link_do_cliente_libera_o_financeiro_e_o_cliente_atua_sem_login()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var (eventoId, servicoId, pagamentoId) = await EventoComFornecedorContratado(dono, 2);
        var urlLink = $"/api/v1/eventos/{eventoId}/link-cliente";

        // Sem link: nada a ver; outra conta não gerencia.
        Assert.False((await Ler(await dono.GetAsync(urlLink))).GetProperty("ativo").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PostAsync(urlLink, null)).StatusCode);

        var gerado = await Ler(await dono.PostAsync(urlLink, null));
        var token = gerado.GetProperty("token").GetString()!;
        Assert.False(gerado.GetProperty("financeiroLiberado").GetBoolean());

        // Cliente sem login, financeiro fechado: vê o evento, não vê valores nem age.
        var cliente = await LinkClienteDeTeste.AbrirAsync(_banco.Fabrica, dono, eventoId, token);
        var baseLink = $"/api/v1/publico/cliente/{token}";
        var fechado = await Ler(await cliente.GetAsync(baseLink));
        Assert.False(fechado.GetProperty("financeiroLiberado").GetBoolean());
        Assert.Equal(JsonValueKind.Null, fechado.GetProperty("financeiro").ValueKind);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PutAsJsonAsync($"{baseLink}/pagamentos/{pagamentoId}/pago", new { pago = true })).StatusCode);

        // Liberado: o cliente marca parcela e pagamento, sobe comprovante e contrato assinado.
        Assert.True((await Ler(await dono.PutAsJsonAsync(urlLink, new { financeiroLiberado = true }))).GetProperty("financeiroLiberado").GetBoolean());
        var aberto = await Ler(await cliente.GetAsync(baseLink));
        var pagamento = Pagamento(aberto.GetProperty("financeiro"));
        var parcelaId = pagamento.GetProperty("parcelas")[0].GetProperty("id").GetGuid();
        var urlPagamento = $"{baseLink}/pagamentos/{pagamentoId}";

        var umaPaga = Pagamento((await Ler(await cliente.PutAsJsonAsync($"{urlPagamento}/parcelas/{parcelaId}/pago", new { pago = true }))).GetProperty("financeiro"));
        Assert.True(umaPaga.GetProperty("parcelas")[0].GetProperty("paga").GetBoolean());
        Assert.False(umaPaga.GetProperty("pago").GetBoolean());
        var tudoPago = Pagamento((await Ler(await cliente.PutAsJsonAsync($"{urlPagamento}/pago", new { pago = true }))).GetProperty("financeiro"));
        Assert.True(tudoPago.GetProperty("pago").GetBoolean());

        var comComprovante = Pagamento((await Ler(await cliente.PostAsync($"{urlPagamento}/parcelas/{parcelaId}/comprovante", Pdf("comprovante.pdf")))).GetProperty("financeiro"));
        var arquivoId = comComprovante.GetProperty("parcelas")[0].GetProperty("comprovante").GetProperty("arquivoId").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await cliente.GetAsync($"{baseLink}/arquivos/{arquivoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync($"{baseLink}/arquivos/{Guid.NewGuid()}")).StatusCode);

        var comContrato = Pagamento((await Ler(await cliente.PostAsync($"{urlPagamento}/contrato-assinado", Pdf("contrato.pdf")))).GetProperty("financeiro"));
        Assert.Equal("contrato.pdf", comContrato.GetProperty("contratoAssinado").GetProperty("nome").GetString());
        var visto = Pagamento((await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"))));
        Assert.True(visto.GetProperty("pago").GetBoolean());

        // Trocar o link desliga o endereço antigo; desativar apaga.
        var trocado = await Ler(await dono.PostAsync(urlLink, null));
        Assert.NotEqual(token, trocado.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync(baseLink)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await dono.DeleteAsync(urlLink)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync($"/api/v1/publico/cliente/{trocado.GetProperty("token").GetString()}")).StatusCode);
    }

    [Fact]
    public async Task Link_do_cliente_cadastra_convites_quando_liberado_e_a_organizadora_define_o_envio()
    {
        var dono = await Entrar();
        var outra = await Entrar();
        var (eventoId, _, _) = await EventoComFornecedorContratado(dono, 1);
        var urlLink = $"/api/v1/eventos/{eventoId}/link-cliente";
        var token = (await Ler(await dono.PostAsync(urlLink, null))).GetProperty("token").GetString()!;
        var cliente = await LinkClienteDeTeste.AbrirAsync(_banco.Fabrica, dono, eventoId, token);
        var baseLink = $"/api/v1/publico/cliente/{token}";
        var pedido = new
        {
            nome = "Família Souza",
            email = "souza@exemplo.com",
            excecaoPrazoRsvp = true,
            observacao = "Ignorada no link do cliente",
            convidados = new[]
            {
                new { id = (Guid?)null, nome = "Maria Souza", ddi = (string?)"+55", celular = (string?)"11999990000", principal = true },
                new { id = (Guid?)null, nome = "João Souza", ddi = (string?)null, celular = (string?)null, principal = false },
            },
        };

        // Fechado (padrão): o cliente não vê nem cadastra.
        Assert.Equal(JsonValueKind.Null, (await Ler(await cliente.GetAsync(baseLink))).GetProperty("convites").ValueKind);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync($"{baseLink}/convites", pedido)).StatusCode);

        // Liberado: o cliente cadastra e a organizadora vê o convite na aba Convidados.
        var liberado = await Ler(await dono.PutAsJsonAsync(urlLink, new { financeiroLiberado = false, convidadosLiberado = true }));
        Assert.True(liberado.GetProperty("convidadosLiberado").GetBoolean());
        var semTelefone = await cliente.PostAsJsonAsync($"{baseLink}/convites", new
        {
            nome = "Sem telefone",
            convidados = new[] { new { id = (Guid?)null, nome = "Ana", ddi = (string?)null, celular = (string?)null, principal = true } },
        });
        Assert.Equal(HttpStatusCode.BadRequest, semTelefone.StatusCode);
        var criado = await Ler(await cliente.PostAsJsonAsync($"{baseLink}/convites", pedido));
        var convite = criado.GetProperty("convites").EnumerateArray().Single();
        Assert.Equal("11999990000", convite.GetProperty("telefone").GetString());
        Assert.Equal(2, convite.GetProperty("convidados").GetArrayLength());
        Assert.True(convite.GetProperty("excecaoPrazoRsvp").GetBoolean());
        Assert.False(convite.TryGetProperty("observacao", out _));

        var lista = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/convites"));
        var daOrganizadora = lista.GetProperty("convites").EnumerateArray().Single();
        Assert.Equal("souza@exemplo.com", daOrganizadora.GetProperty("email").GetString());
        Assert.Equal("Preenchido pelo cliente", daOrganizadora.GetProperty("observacao").GetString());
        Assert.False(daOrganizadora.TryGetProperty("dataEnvio", out _));
        Assert.Equal(JsonValueKind.Null, lista.GetProperty("dataEnvioConvites").ValueKind);

        // A organizadora define a data de envio, uma só para o evento.
        var envio = await Ler(await dono.PutAsJsonAsync($"/api/v1/eventos/{eventoId}/envio-convites", new { data = "2026-12-01" }));
        Assert.Equal("2026-12-01", envio.GetProperty("data").GetString());
        Assert.Equal("2026-12-01", (await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/convites"))).GetProperty("dataEnvioConvites").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync($"/api/v1/eventos/{eventoId}/envio-convites", new { data = "2026-12-01" })).StatusCode);

        // Outra conta não alcança o convite; o cliente edita pelo mesmo link e a observação não muda.
        var conviteId = daOrganizadora.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await outra.PutAsJsonAsync($"/api/v1/convites/{conviteId}", pedido)).StatusCode);
        var editado = await Ler(await cliente.PutAsJsonAsync($"{baseLink}/convites/{conviteId}", pedido with { nome = "Souza e família" }));
        Assert.Equal("Souza e família", editado.GetProperty("convites").EnumerateArray().Single().GetProperty("nome").GetString());
        var depois = (await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/convites"))).GetProperty("convites").EnumerateArray().Single();
        Assert.Equal("Preenchido pelo cliente", depois.GetProperty("observacao").GetString());
    }

    [Fact]
    public async Task Link_do_cliente_usa_as_ferramentas_da_aba_convidados()
    {
        var dono = await Entrar();
        var (eventoId, _, _) = await EventoComFornecedorContratado(dono, 1);
        var urlLink = $"/api/v1/eventos/{eventoId}/link-cliente";
        var token = (await Ler(await dono.PostAsync(urlLink, null))).GetProperty("token").GetString()!;
        var cliente = await LinkClienteDeTeste.AbrirAsync(_banco.Fabrica, dono, eventoId, token);
        var baseLink = $"/api/v1/publico/cliente/{token}";

        // Fechado: nenhuma ferramenta responde.
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PutAsJsonAsync($"{baseLink}/prazo-rsvp", new { prazo = "2099-01-01" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync($"{baseLink}/convites/planilha")).StatusCode);
        await dono.PutAsJsonAsync(urlLink, new { financeiroLiberado = false, convidadosLiberado = true });

        // Prazo e data de envio: o cliente define e a organizadora vê o mesmo valor.
        var comPrazo = await Ler(await cliente.PutAsJsonAsync($"{baseLink}/prazo-rsvp", new { prazo = "2099-01-01" }));
        Assert.Equal("2099-01-01", comPrazo.GetProperty("prazoRsvp").GetString());
        var comEnvio = await Ler(await cliente.PutAsJsonAsync($"{baseLink}/envio-convites", new { data = "2098-12-01" }));
        Assert.Equal("2098-12-01", comEnvio.GetProperty("dataEnvioConvites").GetString());
        var daOrganizadora = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/convites"));
        Assert.Equal("2099-01-01", daOrganizadora.GetProperty("prazoRsvp").GetString());
        Assert.Equal("2098-12-01", daOrganizadora.GetProperty("dataEnvioConvites").GetString());

        // Planilha padrão e importação; o convite importado pelo cliente grava "Preenchido pelo cliente".
        var modelo = await cliente.GetAsync($"{baseLink}/convites/planilha");
        Assert.Equal(HttpStatusCode.OK, modelo.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", modelo.Content.Headers.ContentType?.MediaType);
        var enviada = await Ler(await cliente.PostAsync($"{baseLink}/convites/importar", PlanilhaDeConvites(
            ["Família Souza", "+55", "11999990000", "Observação da planilha", "Maria Souza", "Sim"],
            ["Família Souza", "", "", "", "João Souza", "Não"])));
        Assert.Equal("Pendente", enviada.GetProperty("situacao").GetString());
        var importada = await NegocioFluxoTests.AguardarImportacao(cliente, $"{baseLink}/convites/importacoes", enviada.GetProperty("id").GetGuid());
        Assert.Equal("Importado", importada.GetProperty("situacao").GetString());
        var convite = (await Ler(await cliente.GetAsync(baseLink))).GetProperty("convites").EnumerateArray().Single();
        Assert.Equal(2, convite.GetProperty("convidados").GetArrayLength());
        var naOrganizadora = (await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/convites"))).GetProperty("convites").EnumerateArray().Single();
        Assert.Equal("Preenchido pelo cliente", naOrganizadora.GetProperty("observacao").GetString());

        // Lista de presença: começa vazia e mostra quem confirmou pelo RSVP.
        Assert.Equal(0, (await Ler(await cliente.GetAsync($"{baseLink}/presencas"))).GetArrayLength());
        var rsvp = naOrganizadora.GetProperty("token").GetString()!;
        var maria = naOrganizadora.GetProperty("convidados").EnumerateArray().Single(item => item.GetProperty("nome").GetString() == "Maria Souza").GetProperty("id").GetGuid();
        await cliente.PostAsJsonAsync($"/api/v1/rsvp/{rsvp}", new { respostas = new[] { new { convidadoId = maria, situacao = "Confirmado" } } });
        var presencas = await Ler(await cliente.GetAsync($"{baseLink}/presencas"));
        Assert.Equal("Maria Souza", presencas.EnumerateArray().Single().GetProperty("convidado").GetString());
    }

    private static MultipartFormDataContent PlanilhaDeConvites(params string[][] linhas)
    {
        using var livro = new ClosedXML.Excel.XLWorkbook();
        var aba = livro.AddWorksheet("Convidados");
        var colunas = Project.Domain.Convidados.PlanilhaConvites.Colunas;
        for (var i = 0; i < colunas.Length; i++)
        {
            aba.Cell(1, i + 1).Value = colunas[i];
        }

        for (var linha = 0; linha < linhas.Length; linha++)
        {
            for (var coluna = 0; coluna < linhas[linha].Length; coluna++)
            {
                aba.Cell(linha + 2, coluna + 1).Value = linhas[linha][coluna];
            }
        }

        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        return new MultipartFormDataContent { { new ByteArrayContent(memoria.ToArray()), "arquivo", "convidados.xlsx" } };
    }

    private static JsonElement ServicoDe(JsonElement evento, Guid servicoId) =>
        evento.GetProperty("servicos").EnumerateArray().Single(item => item.GetProperty("id").GetGuid() == servicoId);

    private static JsonElement VinculoDe(JsonElement evento, Guid servicoId) =>
        ServicoDe(evento, servicoId).GetProperty("fornecedores").EnumerateArray().Single();

    [Fact]
    public async Task Dois_fornecedores_contratados_no_mesmo_servico_geram_dois_pagamentos_e_somam_o_contratado()
    {
        var dono = await Entrar();
        var (eventoId, servicoId, primeiroId) = await EventoComFornecedorContratado(dono, 0);
        var urlServico = $"/api/v1/eventos/{eventoId}/servicos/{servicoId}";
        var servicoConta = await Ler(await dono.PostAsJsonAsync("/api/v1/servicos-conta", new { nome = $"Serviço {Guid.NewGuid():N}" }));
        var outro = await Ler(await dono.PostAsJsonAsync("/api/v1/fornecedores", new
        {
            nome = "Segundo Fornecedor",
            servicoContaIds = new[] { servicoConta.GetProperty("id").GetGuid() },
            emails = new[] { new { endereco = "segundo@exemplo.com" } },
            telefones = new[] { new { numero = "11999990001", movel = true } },
        }));
        var comDois = await Ler(await dono.PostAsJsonAsync($"{urlServico}/fornecedores", new { fornecedorId = outro.GetProperty("id").GetGuid(), etapa = "Orcamento" }));
        var segundoId = ServicoDe(comDois, servicoId).GetProperty("fornecedores").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() != primeiroId).GetProperty("id").GetGuid();

        // Contrato assinado antes de contratar: fica no fornecedor, sem aparecer no Dinheiro.
        var anexado = await Ler(await dono.PostAsync($"{urlServico}/fornecedores/{segundoId}/contrato-assinado", Pdf("segundo.pdf")));
        Assert.Equal("segundo.pdf", ServicoDe(anexado, servicoId).GetProperty("fornecedores").EnumerateArray()
            .Single(item => item.GetProperty("id").GetGuid() == segundoId).GetProperty("contratoAssinado").GetProperty("nome").GetString());
        Assert.Single((await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"))).GetProperty("pagamentosFornecedores").EnumerateArray());

        var contratado = await Ler(await dono.PostAsJsonAsync($"{urlServico}/fornecedores/{segundoId}/contratar", new { valor = 1000 }));
        var servico = ServicoDe(contratado, servicoId);
        Assert.True(servico.GetProperty("contratado").GetBoolean());
        Assert.Equal(5000m, servico.GetProperty("valorContratado").GetDecimal());
        var dinheiro = await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"));
        var pagamentos = dinheiro.GetProperty("pagamentosFornecedores").EnumerateArray().ToArray();
        Assert.Equal(2, pagamentos.Length);
        Assert.Equal(new[] { primeiroId, segundoId }.Order(), pagamentos.Select(item => item.GetProperty("pagamentoId").GetGuid()).Order());
        Assert.Equal(5000m, dinheiro.GetProperty("contratado").GetDecimal());

        // Sem pagamento registrado: excluir o fornecedor tira o pagamento dele; excluir o serviço tira o resto.
        var semSegundo = await Ler(await dono.DeleteAsync($"{urlServico}/fornecedores/{segundoId}"));
        Assert.Equal(4000m, ServicoDe(semSegundo, servicoId).GetProperty("valorContratado").GetDecimal());
        Assert.Single((await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"))).GetProperty("pagamentosFornecedores").EnumerateArray());
        var semServico = await Ler(await dono.DeleteAsync(urlServico));
        Assert.DoesNotContain(semServico.GetProperty("servicos").EnumerateArray(), item => item.GetProperty("id").GetGuid() == servicoId);
        Assert.Empty((await Ler(await dono.GetAsync($"/api/v1/eventos/{eventoId}/dinheiro"))).GetProperty("pagamentosFornecedores").EnumerateArray());
    }

    private static MultipartFormDataContent Pdf(string nome) =>
        new() { { new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n%%EOF")), "arquivo", nome } };

    private static JsonElement Pagamento(JsonElement dinheiro) => dinheiro.GetProperty("pagamentosFornecedores").EnumerateArray().Single();

    /// <summary>Evento com um serviço contratado (valor 4000, em <paramref name="parcelas"/> parcelas a partir de 10/12/2026).</summary>
    private static async Task<(Guid EventoId, Guid ServicoId, Guid PagamentoId)> EventoComFornecedorContratado(HttpClient dono, int parcelas)
    {
        var evento = await Ler(await dono.PostAsJsonAsync("/api/v1/eventos", new { tipo = "Casamento", primeiroNome = "Gil", segundoNome = "Ana" }));
        var eventoId = evento.GetProperty("id").GetGuid();
        var servicoConta = await Ler(await dono.PostAsJsonAsync("/api/v1/servicos-conta", new { nome = $"Serviço {Guid.NewGuid():N}" }));
        var fornecedor = await Ler(await dono.PostAsJsonAsync("/api/v1/fornecedores", new
        {
            nome = "Fornecedor Teste",
            servicoContaIds = new[] { servicoConta.GetProperty("id").GetGuid() },
            emails = new[] { new { endereco = "forn@exemplo.com" } },
            telefones = new[] { new { numero = "11999990000", movel = true } },
        }));
        var fornecedorId = fornecedor.GetProperty("id").GetGuid();
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
        Assert.Equal(HttpStatusCode.OK, (await dono.PostAsJsonAsync(
            $"/api/v1/eventos/{eventoId}/servicos/{servicoId}/fornecedores/{vinculoId}/contratar",
            new { valor = 4000 })).StatusCode);
        if (parcelas > 0)
        {
            Assert.Equal(HttpStatusCode.OK, (await dono.PutAsJsonAsync(
                $"/api/v1/eventos/{eventoId}/dinheiro/pagamentos/{vinculoId}/parcelamento",
                new { quantidadeParcelas = parcelas, primeiraParcela = "2026-12-10", comEntrada = false })).StatusCode);
        }

        return (eventoId, servicoId, vinculoId);
    }

    private async Task<HttpClient> Entrar()
    {
        var email = $"pessoa-{Guid.NewGuid():N}@aralu.test";
        var cliente = _banco.Fabrica.CreateClient();
        var cadastro = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });
        Assert.Equal(HttpStatusCode.Created, cadastro.StatusCode);
        var mensagem = _banco.Fabrica.Email.Mensagens.Last(item => item.Email == email && item.Tipo == "confirmacao");
        var query = QueryHelpers.ParseQuery(new Uri(mensagem.Corpo).Query);
        var confirmacao = await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = query["usuarioId"].ToString(), token = query["token"].ToString() });
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
