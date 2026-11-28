using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Project.Domain.Assinaturas;
using Project.Infrastructure.Assinaturas;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-065: upgrade com cobrança proporcional e downgrade no próximo vencimento, com o Asaas simulado.</summary>
public partial class AssinaturaAsaasTests
{
    [Fact]
    public async Task Upgrade_cobra_a_diferenca_e_so_troca_o_plano_quando_o_pagamento_confirma()
    {
        var superior = await CriarPlano(299m);
        try
        {
            var (dona, contaId) = await AtivaComPeriodo(diasRestantes: 10);
            var antes = await Assinatura(contaId);
            var hoje = Project.Domain.Comum.HorarioBrasil.Data(DateTimeOffset.UtcNow);
            var esperado = Domain.Assinaturas.Assinatura.CalcularProRata(179m, 299m, antes.PagoAte!.Value, hoje);

            var previa = (await Ler(await dona.GetAsync("/api/v1/assinatura/trocas"))).EnumerateArray().Single(item => item.GetProperty("planoId").GetGuid() == superior);
            Assert.Equal("Upgrade", previa.GetProperty("tipo").GetString());
            Assert.Equal(10, previa.GetProperty("diasRestantes").GetInt32());
            Assert.Equal(esperado.Valor, previa.GetProperty("valorAgora").GetDecimal());
            Assert.True(previa.GetProperty("permitida").GetBoolean());

            var troca = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = superior }));
            var cobrancaId = Assert.Single(_banco.Fabrica.Asaas.Avulsas, item => item.Value.Referencia == $"upgrade:{antes.Id}:{superior}").Key;
            Assert.Equal(esperado.Valor, _banco.Fabrica.Asaas.Avulsas[cobrancaId].Valor);
            Assert.Equal(hoje, _banco.Fabrica.Asaas.Avulsas[cobrancaId].Vencimento);
            Assert.EndsWith(cobrancaId, troca.GetProperty("linkPagamento").GetString());

            // Pendente: plano atual, uma troca por vez, e a fatura aparece em aberto.
            var situacao = await Ler(await dona.GetAsync("/api/v1/assinatura"));
            Assert.Equal("Upgrade", situacao.GetProperty("trocaPendente").GetProperty("tipo").GetString());
            Assert.Equal(Plano.ProId, (await Assinatura(contaId)).PlanoId);
            Assert.Equal(HttpStatusCode.BadRequest, (await dona.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = superior })).StatusCode);

            // Vencida: nada muda na conta (§7), segue Ativa no plano atual.
            await Ler(await Avisar(AvisoAvulsa("PAYMENT_OVERDUE", cobrancaId, esperado.Valor, $"upgrade:{antes.Id}:{superior}", hoje)));
            var vencida = await Assinatura(contaId);
            Assert.Equal(SituacaoAssinatura.Ativa, vencida.Situacao);
            Assert.Equal(Plano.ProId, vencida.PlanoId);

            // Pago depois: plano novo, valor novo no Asaas (com as pendentes), período pago intacto.
            await Ler(await Avisar(AvisoAvulsa("PAYMENT_RECEIVED", cobrancaId, esperado.Valor, $"upgrade:{antes.Id}:{superior}", hoje)));
            var depois = await Assinatura(contaId);
            Assert.Equal(superior, depois.PlanoId);
            Assert.Equal(299m, depois.Valor);
            Assert.Equal(antes.PagoAte, depois.PagoAte);
            Assert.Equal(antes.ProximoVencimento, depois.ProximoVencimento);
            Assert.Equal(SituacaoAssinatura.Ativa, depois.Situacao);
            Assert.Null(depois.UpgradePlanoId);
            Assert.Equal(299m, _banco.Fabrica.Asaas.ValoresAtualizados[depois.AsaasSubscriptionId!]);
            Assert.True(_banco.Fabrica.Asaas.PendentesAtualizados[depois.AsaasSubscriptionId!]);

            // O mesmo pagamento avisado de novo não muda nada.
            await Ler(await Avisar(AvisoAvulsa("PAYMENT_CONFIRMED", cobrancaId, esperado.Valor, $"upgrade:{antes.Id}:{superior}", hoje)));
            var repetido = await Assinatura(contaId);
            Assert.Equal(depois.PlanoId, repetido.PlanoId);
            Assert.Equal(depois.PagoAte, repetido.PagoAte);
        }
        finally
        {
            await DesativarPlano(superior);
        }
    }

    [Fact]
    public async Task Downgrade_agenda_para_o_vencimento_pode_ser_desfeito_e_o_controle_diario_aplica()
    {
        var menor = await CriarPlano(99m);
        try
        {
            var (dona, contaId) = await AtivaComPeriodo(diasRestantes: 10);
            var antes = await Assinatura(contaId);
            var assinaturaId = antes.AsaasSubscriptionId!;

            var troca = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = menor }));
            Assert.Equal("Downgrade", troca.GetProperty("tipo").GetString());
            Assert.Equal(antes.ProximoVencimento, DateOnly.Parse(troca.GetProperty("aplicaEm").GetString()!));
            var agendada = await Assinatura(contaId);
            Assert.Equal(Plano.ProId, agendada.PlanoId);
            Assert.Equal(179m, agendada.Valor);
            Assert.Equal(99m, _banco.Fabrica.Asaas.ValoresAtualizados[assinaturaId]);
            Assert.DoesNotContain(_banco.Fabrica.Asaas.Avulsas, item => item.Value.Referencia.Contains(antes.Id.ToString()));

            // "Manter plano atual" volta o valor no Asaas.
            await Ler(await dona.PostAsync("/api/v1/assinatura/desistir-troca", null));
            Assert.Equal(179m, _banco.Fabrica.Asaas.ValoresAtualizados[assinaturaId]);
            Assert.Null((await Assinatura(contaId)).DowngradePlanoId);

            // Agenda de novo e chega o dia: o controle diário aplica.
            await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = menor }));
            await Mudar(contaId, item => item.DowngradeEm = Project.Domain.Comum.HorarioBrasil.Data(DateTimeOffset.UtcNow));
            await using (var escopo = _banco.Fabrica.Services.CreateAsyncScope())
            {
                await escopo.ServiceProvider.GetRequiredService<AvisosAssinaturaServico>().RodarAsync(DateTimeOffset.UtcNow, CancellationToken.None);
            }

            var aplicada = await Assinatura(contaId);
            Assert.Equal(menor, aplicada.PlanoId);
            Assert.Equal(99m, aplicada.Valor);
            Assert.Null(aplicada.DowngradePlanoId);
        }
        finally
        {
            await DesativarPlano(menor);
        }
    }

    [Fact]
    public async Task Cancelar_com_upgrade_pendente_remove_a_cobranca_avulsa_e_membro_nao_troca()
    {
        var superior = await CriarPlano(299m);
        try
        {
            var (dona, contaId) = await AtivaComPeriodo(diasRestantes: 10);
            await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = superior }));
            var cobrancaId = (await Assinatura(contaId)).UpgradeCobrancaId!;

            var email = $"troca-{Guid.NewGuid():N}@aralu.test";
            await Ler(await dona.PostAsJsonAsync("/api/v1/equipe", new { nome = "Bia", email }));
            var membro = await AceitarEEntrar(email);
            Assert.Equal(HttpStatusCode.Forbidden, (await membro.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = superior })).StatusCode);

            Assert.Equal(HttpStatusCode.OK, (await dona.PostAsync("/api/v1/assinatura/cancelar", null)).StatusCode);
            Assert.Contains(cobrancaId, _banco.Fabrica.Asaas.CobrancasRemovidas);
            var cancelada = await Assinatura(contaId);
            Assert.Null(cancelada.UpgradePlanoId);
            Assert.Equal(Plano.ProId, cancelada.PlanoId);

            // Cancelada não troca de plano.
            Assert.Equal(HttpStatusCode.BadRequest, (await dona.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = superior })).StatusCode);
        }
        finally
        {
            await DesativarPlano(superior);
        }
    }

    [Fact]
    public async Task No_trial_depois_de_assinar_a_troca_e_na_hora_sem_cobranca()
    {
        var superior = await CriarPlano(299m);
        try
        {
            var (dona, contaId) = await EntrarDono();
            await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = CpfNovo(), nomeCobranca = "Assessoria", formaPagamento = "pix" }));
            var avulsasAntes = _banco.Fabrica.Asaas.Avulsas.Count;

            var troca = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/trocar-plano", new { planoId = superior }));

            Assert.Equal(0m, troca.GetProperty("valorAgora").GetDecimal());
            var depois = await Assinatura(contaId);
            Assert.Equal(superior, depois.PlanoId);
            Assert.Equal(299m, depois.Valor);
            Assert.Equal(299m, _banco.Fabrica.Asaas.ValoresAtualizados[depois.AsaasSubscriptionId!]);
            Assert.Equal(avulsasAntes, _banco.Fabrica.Asaas.Avulsas.Count);
        }
        finally
        {
            await DesativarPlano(superior);
        }
    }

    /// <summary>Conta assinada e paga, com o período pago terminando daqui a N − 1 dias (hoje conta como restante).</summary>
    private async Task<(HttpClient Dona, Guid ContaId)> AtivaComPeriodo(int diasRestantes)
    {
        var (dona, contaId) = await EntrarDono();
        var resposta = await Ler(await dona.PostAsJsonAsync("/api/v1/assinatura/assinar", new { documento = CpfNovo(), nomeCobranca = "Assessoria", formaPagamento = "pix" }));
        var vencimento = DateOnly.Parse(resposta.GetProperty("vencimento").GetString()!);
        await Ler(await Avisar(Aviso("PAYMENT_CONFIRMED", (await Assinatura(contaId)).AsaasSubscriptionId!, vencimento)));
        var pagoAte = Project.Domain.Comum.HorarioBrasil.Data(DateTimeOffset.UtcNow).AddDays(diasRestantes - 1);
        await Mudar(contaId, item =>
        {
            item.PagoAte = pagoAte;
            item.ProximoVencimento = pagoAte.AddDays(1);
        });
        return (dona, contaId);
    }

    private async Task<Guid> CriarPlano(decimal valor)
    {
        await using var banco = Banco();
        var agora = DateTimeOffset.UtcNow;
        var plano = new Plano
        {
            Id = Guid.NewGuid(),
            Codigo = $"troca-{Guid.NewGuid():N}"[..30],
            Nome = $"Teste {valor:0}",
            ValorMensal = valor,
            Publico = true,
            Ativo = true,
            Ordem = 900,
            CriadoEm = agora,
            AtualizadoEm = agora,
        };
        banco.Planos.Add(plano);
        await banco.SaveChangesAsync();
        return plano.Id;
    }

    /// <summary>Tira o plano de teste do catálogo público para não aparecer nos outros testes.</summary>
    private async Task DesativarPlano(Guid id)
    {
        await using var banco = Banco();
        await banco.Planos.Where(item => item.Id == id).ExecuteUpdateAsync(set => set.SetProperty(item => item.Ativo, false).SetProperty(item => item.Publico, false));
    }

    private static string AvisoAvulsa(string evento, string cobrancaId, decimal valor, string referencia, DateOnly vencimento) => JsonSerializer.Serialize(new
    {
        id = $"evt_{Guid.NewGuid():N}",
        @event = evento,
        payment = new
        {
            id = cobrancaId,
            value = valor,
            dueDate = vencimento.ToString("yyyy-MM-dd"),
            status = evento == "PAYMENT_OVERDUE" ? "OVERDUE" : "RECEIVED",
            billingType = "PIX",
            externalReference = referencia,
            invoiceUrl = $"https://sandbox.asaas.com/i/{cobrancaId}",
        },
    });
}
