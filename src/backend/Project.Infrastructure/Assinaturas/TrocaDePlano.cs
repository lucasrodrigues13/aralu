using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Project.Application.Comum;
using Project.Domain.Assinaturas;
using Project.Domain.Comum;

namespace Project.Infrastructure.Assinaturas;

/// <summary>Um plano para o qual a conta pode trocar, com o que a troca custa (SPEC-065 §6.1 passo 2 e §6.2 passo 2).</summary>
public sealed record TrocaPrevia(
    Guid PlanoId,
    string Plano,
    string? Descricao,
    decimal ValorMensal,
    string Tipo,
    decimal ValorAgora,
    decimal Credito,
    int DiasRestantes,
    int DiasDoCiclo,
    DateOnly? PagoAte,
    DateOnly? AplicaEm,
    decimal NovaMensalidade,
    IReadOnlyList<string> RecursosQueSaem,
    bool Permitida,
    string? Motivo);

public sealed record TrocaPedido(Guid? PlanoId);

/// <summary>Resposta da troca: link da cobrança avulsa (upgrade) ou a data em que o plano menor passa a valer.</summary>
public sealed record TrocaResposta(string Tipo, string Plano, decimal ValorAgora, string? LinkPagamento, DateOnly? AplicaEm, IReadOnlyList<PassoAsaas>? Diagnostico);

/// <summary>Troca pendente mostrada em Assinatura: upgrade esperando pagamento ou downgrade agendado.</summary>
public sealed record TrocaPendenteLeitura(string Tipo, string Plano, decimal? Valor, DateOnly? AplicaEm, string? LinkPagamento);

/// <summary>SPEC-065: upgrade com cobrança proporcional e downgrade no próximo vencimento, feitos pelo Dono.</summary>
public sealed partial class AssinaturaServico
{
    public const string PrefixoUpgrade = "upgrade:";

    /// <summary>Regra 7: o Asaas recusa cobrança abaixo de R$ 5,00.</summary>
    public const decimal MinimoAsaas = 5m;

    public const string Upgrade = "Upgrade";
    public const string Downgrade = "Downgrade";

    /// <summary>Planos públicos e ativos, menos o atual, com o valor da troca calculado aqui (o navegador só mostra).</summary>
    public async Task<IReadOnlyList<TrocaPrevia>> TrocasAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await DaContaAsync(contaId, ct, rastrear: false);
        if (assinatura is null)
        {
            return [];
        }

        var planos = await banco.Planos.AsNoTracking().Include(item => item.Recursos).Where(item => item.Publico && item.Ativo).OrderBy(item => item.Ordem).ToListAsync(ct);
        var atual = await banco.Planos.AsNoTracking().Include(item => item.Recursos).FirstAsync(item => item.Id == assinatura.PlanoId, ct);
        return planos.Where(plano => plano.Id != assinatura.PlanoId).Select(plano => Prever(assinatura, atual, plano, agora)).ToList();
    }

    /// <summary>Upgrade (cobrança avulsa) ou downgrade (agendado), conforme o valor do plano de destino.</summary>
    public async Task<Resultado<TrocaResposta>> TrocarPlanoAsync(Guid contaId, TrocaPedido pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await DaContaAsync(contaId, ct, rastrear: true);
        if (assinatura is null)
        {
            return Resultado<TrocaResposta>.Erro(Codigos.Indisponivel, "Assinatura não encontrada.");
        }

        var destino = pedido.PlanoId is Guid id
            ? await banco.Planos.AsNoTracking().Include(item => item.Recursos).FirstOrDefaultAsync(item => item.Id == id && item.Publico && item.Ativo, ct)
            : null;
        if (destino is null || destino.Id == assinatura.PlanoId)
        {
            return Resultado<TrocaResposta>.Erro(Codigos.Validacao, "Escolha um plano disponível diferente do atual.");
        }

        var atual = await banco.Planos.AsNoTracking().Include(item => item.Recursos).FirstAsync(item => item.Id == assinatura.PlanoId, ct);
        var previa = Prever(assinatura, atual, destino, agora);
        if (!previa.Permitida)
        {
            return Resultado<TrocaResposta>.Erro(Codigos.Validacao, previa.Motivo ?? "Não é possível trocar de plano agora.");
        }

        var passos = new List<PassoAsaas>();
        try
        {
            // Trial: troca na hora, sem cobrança; se já assinou, a primeira cobrança passa ao valor novo (§7).
            if (assinatura.Situacao == SituacaoAssinatura.Trial)
            {
                if (assinatura.AsaasSubscriptionId is { } trialId)
                {
                    await asaas.AtualizarValorAsync(trialId, previa.NovaMensalidade, passos, ct, atualizarPendentes: true);
                }

                assinatura.PlanoId = destino.Id;
                assinatura.Valor = previa.NovaMensalidade;
                assinatura.AtualizadaEm = agora;
                await banco.SaveChangesAsync(ct);
                return Resultado<TrocaResposta>.Sucesso(new TrocaResposta(previa.Tipo, destino.Nome, 0m, null, null, Diagnostico(passos)));
            }

            var assinaturaId = assinatura.AsaasSubscriptionId!;
            if (previa.Tipo == Downgrade)
            {
                // Regra 16: a próxima cobrança já vem com o valor menor; o plano só muda no vencimento (regra 17).
                await asaas.AtualizarValorAsync(assinaturaId, previa.NovaMensalidade, passos, ct, atualizarPendentes: true);
                assinatura.DowngradePlanoId = destino.Id;
                assinatura.DowngradeEm = previa.AplicaEm;
                assinatura.AtualizadaEm = agora;
                await banco.SaveChangesAsync(ct);
                await avisos.DowngradeAgendadoAsync(assinatura, destino.Nome, previa.AplicaEm!.Value, previa.NovaMensalidade, ct);
                return Resultado<TrocaResposta>.Sucesso(new TrocaResposta(Downgrade, destino.Nome, 0m, null, previa.AplicaEm, Diagnostico(passos)));
            }

            var forma = assinatura.FormaPagamento == FormaPagamento.Cartao ? "CREDIT_CARD" : "PIX";
            var hoje = HorarioBrasil.Data(agora);
            var cobranca = await asaas.CriarCobrancaAsync(
                assinatura.AsaasCustomerId!,
                forma,
                previa.ValorAgora,
                hoje,
                $"Aralu: upgrade para o plano {destino.Nome} ({previa.DiasRestantes} de {previa.DiasDoCiclo} dias)",
                $"{PrefixoUpgrade}{assinatura.Id}:{destino.Id}",
                passos,
                ct);
            await GuardarCobrancaAsync(assinatura, cobranca, agora, ct);
            assinatura.UpgradePlanoId = destino.Id;
            assinatura.UpgradeCobrancaId = cobranca.Id;
            assinatura.UpgradeValor = previa.ValorAgora;
            assinatura.UpgradePedidoEm = agora;
            assinatura.AtualizadaEm = agora;
            await banco.SaveChangesAsync(ct);
            return Resultado<TrocaResposta>.Sucesso(new TrocaResposta(Upgrade, destino.Nome, previa.ValorAgora, cobranca.Link, null, Diagnostico(passos)));
        }
        catch (ErroAsaas erro)
        {
            logs.LogWarning("Troca de plano da conta {Conta} recusada pelo Asaas: {Erro}", contaId, erro.Message);
            UltimoDiagnostico = Diagnostico(passos);
            return Resultado<TrocaResposta>.Erro(ErroAsaasCodigo, erro.Message);
        }
    }

    /// <summary>Desistir do upgrade pendente (remove a cobrança avulsa) ou "Manter plano atual" no downgrade agendado.</summary>
    public async Task<Resultado<IReadOnlyList<PassoAsaas>?>> DesistirDaTrocaAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await DaContaAsync(contaId, ct, rastrear: true);
        if (assinatura is null || !assinatura.TemTrocaPendente)
        {
            return Resultado<IReadOnlyList<PassoAsaas>?>.Erro(Codigos.Validacao, "Não há troca de plano pendente.");
        }

        var passos = new List<PassoAsaas>();
        try
        {
            await DesfazerTrocaNoAsaasAsync(assinatura, passos, ct);
        }
        catch (ErroAsaas erro)
        {
            return Resultado<IReadOnlyList<PassoAsaas>?>.Erro(ErroAsaasCodigo, erro.Message);
        }

        assinatura.DescartarTroca();
        assinatura.AtualizadaEm = agora;
        await banco.SaveChangesAsync(ct);
        return Resultado<IReadOnlyList<PassoAsaas>?>.Sucesso(Diagnostico(passos));
    }

    private async Task<TrocaPendenteLeitura?> TrocaPendenteAsync(Assinatura assinatura, CancellationToken ct)
    {
        if (assinatura.UpgradePlanoId is Guid upgrade)
        {
            var nome = await banco.Planos.AsNoTracking().Where(item => item.Id == upgrade).Select(item => item.Nome).FirstAsync(ct);
            var link = await banco.CobrancasAssinatura.AsNoTracking().IgnoreQueryFilters()
                .Where(item => item.AsaasPaymentId == assinatura.UpgradeCobrancaId).Select(item => item.LinkFatura).FirstOrDefaultAsync(ct);
            return new TrocaPendenteLeitura(Upgrade, nome, assinatura.UpgradeValor, null, link);
        }

        if (assinatura.DowngradePlanoId is Guid downgrade)
        {
            var plano = await banco.Planos.AsNoTracking().FirstAsync(item => item.Id == downgrade, ct);
            return new TrocaPendenteLeitura(Downgrade, plano.Nome, ValorDoPlano(assinatura, plano.ValorMensal, assinatura.DowngradeEm), assinatura.DowngradeEm, null);
        }

        return null;
    }

    /// <summary>Volta o Asaas ao estado sem troca: remove a cobrança avulsa do upgrade ou devolve o valor atual à recorrência.</summary>
    private async Task DesfazerTrocaNoAsaasAsync(Assinatura assinatura, List<PassoAsaas> passos, CancellationToken ct)
    {
        if (assinatura.UpgradeCobrancaId is { } cobrancaId)
        {
            await asaas.RemoverCobrancaAsync(cobrancaId, passos, ct);
            var local = banco.CobrancasAssinatura.Local.FirstOrDefault(item => item.AsaasPaymentId == cobrancaId)
                ?? await banco.CobrancasAssinatura.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.AsaasPaymentId == cobrancaId, ct);
            if (local is not null && local.Status is "PENDING" or "OVERDUE")
            {
                local.Status = "DELETED";
            }
        }

        if (assinatura.DowngradePlanoId is not null && assinatura.AsaasSubscriptionId is { } id && assinatura.Situacao != SituacaoAssinatura.Cancelada)
        {
            await asaas.AtualizarValorAsync(id, assinatura.Valor, passos, ct, atualizarPendentes: true);
        }
    }

    /// <summary>
    /// Pagamento da cobrança avulsa do upgrade (externalReference "upgrade:{assinatura}:{plano}").
    /// Não paga mês (regra 9) nem muda a situação: vencido, não deixa a conta em atraso (§7).
    /// </summary>
    private async Task ProcessarUpgradeAsync(string tipo, string referencia, JsonNode pagamento, DateTimeOffset agora, CancellationToken ct)
    {
        var partes = referencia[PrefixoUpgrade.Length..].Split(':');
        if (partes.Length != 2 || !Guid.TryParse(partes[0], out var assinaturaId) || !Guid.TryParse(partes[1], out var planoId))
        {
            logs.LogWarning("Aviso {Tipo} do Asaas com referência de upgrade inválida: {Referencia}.", tipo, referencia);
            return;
        }

        var assinatura = await banco.Assinaturas.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.Id == assinaturaId, ct);
        if (assinatura is null)
        {
            return;
        }

        var cobranca = AsaasHttp.LerCobranca(pagamento);
        var guardada = await GuardarCobrancaAsync(assinatura, cobranca, agora, ct);
        if (tipo is not ("PAYMENT_CONFIRMED" or "PAYMENT_RECEIVED"))
        {
            return;
        }

        guardada.PagaEm ??= agora;
        // Só aplica o upgrade que está pendente com esta cobrança: descartado (Admin, desistência) ou já aplicado não muda nada.
        if (assinatura.UpgradeCobrancaId != cobranca.Id || assinatura.UpgradePlanoId != planoId)
        {
            logs.LogWarning("Pagamento de upgrade {Cobranca} da conta {Conta} sem upgrade pendente correspondente.", cobranca.Id, assinatura.ContaId);
            return;
        }

        var plano = await banco.Planos.AsNoTracking().FirstAsync(item => item.Id == planoId, ct);
        var valor = ValorDoPlano(assinatura, plano.ValorMensal, assinatura.ProximoVencimento);
        if (assinatura.AsaasSubscriptionId is { } id)
        {
            await asaas.AtualizarValorAsync(id, valor, [], ct, atualizarPendentes: true);
        }

        assinatura.PlanoId = planoId;
        assinatura.Valor = valor;
        assinatura.DescartarTroca();
        assinatura.AtualizadaEm = agora;
        await avisos.UpgradeConfirmadoAsync(assinatura, plano.Nome, cobranca.Valor, ct);
    }

    private TrocaPrevia Prever(Assinatura assinatura, Plano atual, Plano destino, DateTimeOffset agora)
    {
        var hoje = HorarioBrasil.Data(agora);
        var aplicaEm = assinatura.Situacao == SituacaoAssinatura.Trial ? null : assinatura.ProximoVencimento;
        var novaMensalidade = ValorDoPlano(assinatura, destino.ValorMensal, aplicaEm ?? hoje);
        var tipo = novaMensalidade > assinatura.Valor ? Upgrade : Downgrade;
        var saem = atual.Recursos.Select(item => item.Recurso).Except(destino.Recursos.Select(item => item.Recurso)).Select(item => item.ToString()).ToList();
        var proRata = tipo == Upgrade && assinatura.Situacao == SituacaoAssinatura.Ativa && assinatura.PagoAte is DateOnly pago
            ? Assinatura.CalcularProRata(assinatura.Valor, novaMensalidade, pago, hoje)
            : new ProRata(0, 0, 0m, 0m);

        var motivo = MotivoSemTroca(assinatura, agora, hoje);
        if (motivo is null && tipo == Upgrade && assinatura.Situacao == SituacaoAssinatura.Ativa && proRata.Valor < MinimoAsaas)
        {
            motivo = "O valor do upgrade fica abaixo do mínimo de cobrança (R$ 5,00). Fale com o suporte para trocar de plano.";
        }

        return new TrocaPrevia(
            destino.Id,
            destino.Nome,
            destino.Descricao,
            destino.ValorMensal,
            tipo,
            proRata.Valor,
            proRata.Credito,
            proRata.DiasRestantes,
            proRata.DiasDoCiclo,
            assinatura.PagoAte,
            tipo == Downgrade ? aplicaEm : null,
            novaMensalidade,
            tipo == Downgrade ? saem : [],
            motivo is null,
            motivo);
    }

    /// <summary>Pré-condições (§5) e fluxos alternativos (§7) que impedem a troca.</summary>
    private static string? MotivoSemTroca(Assinatura assinatura, DateTimeOffset agora, DateOnly hoje)
    {
        if (assinatura.ValorPersonalizado is not null)
        {
            // Regra 8.
            return "Sua conta tem um valor combinado com a Aralu. Fale com a gente para trocar de plano.";
        }

        if (assinatura.UpgradePlanoId is not null)
        {
            return "Já há um upgrade esperando pagamento. Pague a fatura ou desista dele antes de escolher outro plano.";
        }

        if (assinatura.DowngradePlanoId is not null)
        {
            return "Já há uma mudança de plano agendada. Clique em \"Manter plano atual\" antes de escolher outro.";
        }

        return assinatura.Situacao switch
        {
            SituacaoAssinatura.Trial when agora < assinatura.TrialTerminaEm => null,
            SituacaoAssinatura.Ativa when assinatura.AsaasSubscriptionId is not null && assinatura.AsaasCustomerId is not null
                && assinatura.PagoAte is DateOnly pago && pago >= hoje && assinatura.ProximoVencimento is not null => null,
            SituacaoAssinatura.Cancelada => "Reative a assinatura antes de trocar de plano.",
            _ => "Regularize a assinatura antes de trocar de plano.",
        };
    }

    /// <summary>Valor do plano para a conta (R10 da SPEC-062), com o desconto enquanto valer.</summary>
    private static decimal ValorDoPlano(Assinatura assinatura, decimal valorMensal, DateOnly? vencimento) =>
        Assinatura.ValorCobrado(valorMensal, null, assinatura.DescontoPercentual, assinatura.DescontoAte, vencimento ?? Relogio.Hoje);
}
