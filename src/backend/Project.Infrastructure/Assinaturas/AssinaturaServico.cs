using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Project.Application.Comum;
using Project.Domain.Assinaturas;
using Project.Infrastructure.Persistencia;

namespace Project.Infrastructure.Assinaturas;

/// <summary>Situação da assinatura para a barra de trial, a tela de bloqueio e Configurações → Assinatura.</summary>
public sealed record SituacaoLeitura(
    string Situacao,
    bool Liberada,
    int DiasRestantesTrial,
    DateTimeOffset TrialTerminaEm,
    DateOnly? ProximoVencimento,
    DateOnly? PagoAte,
    string Plano,
    decimal Valor,
    string? FormaPagamento = null,
    bool Assinada = false,
    bool DiagnosticoNoNavegador = false,
    TrocaPendenteLeitura? TrocaPendente = null);

public sealed record AssinarPedido(string? Documento, string? NomeCobranca, string? FormaPagamento, Guid? PlanoId = null);

/// <summary>Resposta do "Assinar": link de pagamento do Asaas e, no staging, o passo a passo das chamadas.</summary>
public sealed record AssinarResposta(string? LinkPagamento, DateOnly Vencimento, decimal Valor, IReadOnlyList<PassoAsaas>? Diagnostico);

public sealed record FaturaLeitura(DateOnly Vencimento, decimal Valor, string Status, string? FormaPagamento, DateTimeOffset? PagaEm, string? Link);

public sealed record EventoDiagnostico(string Tipo, DateTimeOffset RecebidoEm, DateTimeOffset? ProcessadoEm, string? Erro, JsonNode? Payload);

/// <summary>Assinatura da conta (SPEC-062 parte B): liberação (R7), assinatura no Asaas e avisos do Asaas.</summary>
public sealed partial class AssinaturaServico(AppDbContext banco, IAsaas asaas, IOptions<AsaasOpcoes> opcoes, ILogger<AssinaturaServico> logs, PlanosAdminServico planos, AvisosAssinaturaServico avisos)
{
    public const string ErroAsaasCodigo = "asaas";

    /// <summary>Passo a passo do último pedido recusado pelo Asaas (só no staging), para a API devolver junto do erro.</summary>
    public IReadOnlyList<PassoAsaas>? UltimoDiagnostico { get; private set; }

    /// <summary>Conta sem assinatura (criada antes do lote 4.1) é tratada como liberada: nada é bloqueado sem registro.</summary>
    public async Task<bool> LiberadaAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await DaContaAsync(contaId, ct, rastrear: false);
        return assinatura is null || assinatura.Liberada(agora);
    }

    public async Task<SituacaoLeitura?> SituacaoAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await DaContaAsync(contaId, ct, rastrear: false);
        if (assinatura is null)
        {
            return null;
        }

        var plano = await banco.Planos.AsNoTracking().Where(item => item.Id == assinatura.PlanoId).Select(item => item.Nome).FirstAsync(ct);
        var liberada = assinatura.Liberada(agora);
        // Fora do prazo a situação gravada pode estar desatualizada até o controle diário: a leitura mostra a efetiva.
        var situacao = liberada
            ? assinatura.Situacao
            : assinatura.Situacao == SituacaoAssinatura.Trial ? SituacaoAssinatura.Expirada : SituacaoAssinatura.Bloqueada;
        return new SituacaoLeitura(
            situacao.ToString(),
            liberada,
            assinatura.DiasRestantesDeTrial(agora),
            assinatura.TrialTerminaEm,
            assinatura.ProximoVencimento,
            assinatura.PagoAte,
            plano,
            assinatura.Valor,
            assinatura.FormaPagamento?.ToString(),
            assinatura.AsaasSubscriptionId is not null && assinatura.Situacao != SituacaoAssinatura.Cancelada,
            opcoes.Value.DiagnosticoNoNavegador,
            await TrocaPendenteAsync(assinatura, ct));
    }

    /// <summary>
    /// Parte B: cria o cliente e a assinatura no Asaas e devolve o link da primeira fatura.
    /// No trial, a primeira cobrança vence no último dia do trial (T3); com documento que já assinou, no dia (T4).
    /// A conta só fica ativa quando o Asaas confirmar o pagamento (webhook).
    /// </summary>
    public async Task<Resultado<AssinarResposta>> AssinarAsync(Guid contaId, string emailDono, AssinarPedido pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var documento = Documentos.CpfOuCnpj(pedido.Documento);
        if (string.IsNullOrEmpty(documento))
        {
            return Resultado<AssinarResposta>.Erro(Codigos.Validacao, "Confira o CPF ou CNPJ informado.");
        }

        var nome = Domain.Comum.Texto.Limpo(pedido.NomeCobranca);
        if (nome is null || nome.Length > 100)
        {
            return Resultado<AssinarResposta>.Erro(Codigos.Validacao, "Informe o nome de cobrança (até 100 caracteres).");
        }

        var forma = pedido.FormaPagamento?.Trim().ToLowerInvariant() switch
        {
            "cartao" or "credit_card" => (FormaPagamento?)FormaPagamento.Cartao,
            "pix" => FormaPagamento.Pix,
            _ => null,
        };
        if (forma is null)
        {
            return Resultado<AssinarResposta>.Erro(Codigos.Validacao, "Escolha cartão ou Pix.");
        }

        var assinatura = await DaContaAsync(contaId, ct, rastrear: true);
        if (assinatura is null)
        {
            return Resultado<AssinarResposta>.Erro(Codigos.Indisponivel, "Assinatura não encontrada.");
        }

        var passos = new List<PassoAsaas>();
        try
        {
            // Cancelou e ainda está no período pago: assinar de novo é reativar a mesma recorrência no Asaas.
            var hojeAssinar = DateOnly.FromDateTime(agora.UtcDateTime);
            if (assinatura.Situacao == SituacaoAssinatura.Cancelada && assinatura.AsaasSubscriptionId is not null
                && assinatura.PagoAte is DateOnly pagoAteAssinar && pagoAteAssinar >= hojeAssinar)
            {
                return await ReativarAsync(contaId, agora, ct);
            }

            // Já assinou e não cancelou: devolve a fatura em aberto, sem criar outra assinatura.
            // CanceladaEm nulo com situação Cancelada = assinatura ainda viva no Asaas: não cria uma segunda.
            if (assinatura.AsaasSubscriptionId is { } existente && (assinatura.Situacao != SituacaoAssinatura.Cancelada || assinatura.CanceladaEm is null))
            {
                var abertas = await asaas.CobrancasDaAssinaturaAsync(existente, passos, ct);
                var aberta = abertas.FirstOrDefault(item => item.Status is "PENDING" or "OVERDUE") ?? abertas.LastOrDefault();
                return Resultado<AssinarResposta>.Sucesso(new AssinarResposta(aberta?.Link, aberta?.Vencimento ?? assinatura.ProximoVencimento ?? DateOnly.FromDateTime(agora.UtcDateTime), assinatura.Valor, Diagnostico(passos)));
            }

            // Escolha do plano (§6 B1): só entre os que a conta pode assinar.
            if (pedido.PlanoId is Guid escolhido && escolhido != assinatura.PlanoId)
            {
                var permitidos = await planos.ParaAssinarAsync(contaId, ct);
                if (permitidos.All(item => item.Id != escolhido))
                {
                    return Resultado<AssinarResposta>.Erro(Codigos.Validacao, "Este plano não está disponível para a conta.");
                }

                assinatura.PlanoId = escolhido;
            }

            var hash = Hash(documento);
            var jaUsado = await banco.DocumentosTrial.IgnoreQueryFilters().AnyAsync(item => item.DocumentoHash == hash && item.ContaId != contaId, ct);
            var vencimento = assinatura.PrimeiroVencimento(agora, jaUsado);
            var plano = await banco.Planos.AsNoTracking().FirstAsync(item => item.Id == assinatura.PlanoId, ct);
            var valor = Assinatura.ValorCobrado(plano.ValorMensal, assinatura.ValorPersonalizado, assinatura.DescontoPercentual, assinatura.DescontoAte, vencimento);

            if (assinatura.AsaasCustomerId is null)
            {
                var cliente = await asaas.CriarClienteAsync(nome, documento, emailDono, contaId.ToString(), passos, ct);
                assinatura.AsaasCustomerId = cliente.Id;
                await banco.SaveChangesAsync(ct);
            }

            var criada = await asaas.CriarAssinaturaAsync(
                assinatura.AsaasCustomerId,
                forma == FormaPagamento.Cartao ? "CREDIT_CARD" : "PIX",
                valor,
                vencimento,
                $"Aralu {plano.Nome}",
                contaId.ToString(),
                passos,
                ct);
            var cobrancas = await asaas.CobrancasDaAssinaturaAsync(criada.Id, passos, ct);

            assinatura.AsaasSubscriptionId = criada.Id;
            assinatura.FormaPagamento = forma;
            assinatura.Valor = valor;
            assinatura.ProximoVencimento = vencimento;
            assinatura.CanceladaEm = null;
            assinatura.AtualizadaEm = agora;
            if (assinatura.Situacao == SituacaoAssinatura.Cancelada)
            {
                // Assinou de novo depois de cancelar: dentro do período pago volta a Ativa (nada é cobrado agora);
                // depois dele, espera o pagamento, que ativa pelo aviso do Asaas.
                var hoje = DateOnly.FromDateTime(agora.UtcDateTime);
                assinatura.Situacao = assinatura.PagoAte is DateOnly pago && pago >= hoje ? SituacaoAssinatura.Ativa : SituacaoAssinatura.Bloqueada;
            }

            foreach (var cobranca in cobrancas)
            {
                await GuardarCobrancaAsync(assinatura, cobranca, agora, ct);
            }

            if (!await banco.DocumentosTrial.IgnoreQueryFilters().AnyAsync(item => item.DocumentoHash == hash, ct))
            {
                banco.DocumentosTrial.Add(new DocumentoTrial { Id = Guid.NewGuid(), ContaId = contaId, DocumentoHash = hash, UsadoEm = agora });
            }

            await banco.SaveChangesAsync(ct);
            var link = cobrancas.FirstOrDefault()?.Link;
            return Resultado<AssinarResposta>.Sucesso(new AssinarResposta(link, vencimento, valor, Diagnostico(passos)));
        }
        catch (ErroAsaas erro)
        {
            logs.LogWarning("Assinatura da conta {Conta} recusada pelo Asaas: {Erro}", contaId, erro.Message);
            UltimoDiagnostico = Diagnostico(passos);
            return Resultado<AssinarResposta>.Erro(ErroAsaasCodigo, erro.Message);
        }
    }

    /// <summary>Cancelamento (§7): segue liberada até o fim do período pago e depois bloqueia.</summary>
    public async Task<Resultado<IReadOnlyList<PassoAsaas>?>> CancelarAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await DaContaAsync(contaId, ct, rastrear: true);
        if (assinatura?.AsaasSubscriptionId is not { } id || assinatura.Situacao == SituacaoAssinatura.Cancelada)
        {
            return Resultado<IReadOnlyList<PassoAsaas>?>.Erro(Codigos.Validacao, "Não há assinatura ativa para cancelar.");
        }

        var passos = new List<PassoAsaas>();
        try
        {
            // SPEC-065 §7: upgrade pendente sai (a cobrança avulsa é removida) e downgrade agendado é descartado.
            if (assinatura.UpgradeCobrancaId is { } upgrade)
            {
                await asaas.RemoverCobrancaAsync(upgrade, passos, ct);
            }

            assinatura.DescartarTroca();

            // Só desativa a recorrência; a cobrança futura já gerada é removida para não ficar "aguardando pagamento".
            await asaas.CancelarAssinaturaAsync(id, passos, ct);
            var cobrancas = await asaas.CobrancasDaAssinaturaAsync(id, passos, ct);
            foreach (var cobranca in cobrancas.Where(item => item.Status == "PENDING"))
            {
                await asaas.RemoverCobrancaAsync(cobranca.Id, passos, ct);
                await GuardarCobrancaAsync(assinatura, cobranca, agora, ct);
            }

            // Inclui as que ficaram pendentes aqui de assinaturas antigas, já removidas no Asaas.
            var pendentes = banco.CobrancasAssinatura.Local.Where(item => item.ContaId == contaId && item.Status == "PENDING")
                .Concat(await banco.CobrancasAssinatura.IgnoreQueryFilters().Where(item => item.ContaId == contaId && item.Status == "PENDING").ToListAsync(ct))
                .Distinct()
                .ToList();
            foreach (var pendente in pendentes)
            {
                pendente.Status = "DELETED";
            }
        }
        catch (ErroAsaas erro)
        {
            return Resultado<IReadOnlyList<PassoAsaas>?>.Erro(ErroAsaasCodigo, erro.Message);
        }

        var estavaPaga = assinatura.Situacao is SituacaoAssinatura.Ativa or SituacaoAssinatura.EmAtraso;
        assinatura.Situacao = estavaPaga ? SituacaoAssinatura.Cancelada : SituacaoAssinatura.Expirada;
        if (!estavaPaga)
        {
            // Cancelou ainda no trial: o trial segue até o fim, sem cobrança.
            assinatura.Situacao = agora < assinatura.TrialTerminaEm ? SituacaoAssinatura.Trial : SituacaoAssinatura.Expirada;
            assinatura.AsaasSubscriptionId = null;
        }

        assinatura.CanceladaEm = agora;
        assinatura.AtualizadaEm = agora;
        await banco.SaveChangesAsync(ct);
        return Resultado<IReadOnlyList<PassoAsaas>?>.Sucesso(Diagnostico(passos));
    }

    /// <summary>
    /// Reativar (cancelou e ainda está no período pago): volta a recorrência sem cobrar agora. A primeira cobrança nova
    /// vence no dia seguinte ao fim do período pago, com a mesma forma de pagamento e o mesmo cliente no Asaas.
    /// </summary>
    public async Task<Resultado<AssinarResposta>> ReativarAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await DaContaAsync(contaId, ct, rastrear: true);
        var hoje = DateOnly.FromDateTime(agora.UtcDateTime);
        if (assinatura is null || assinatura.Situacao != SituacaoAssinatura.Cancelada)
        {
            return Resultado<AssinarResposta>.Erro(Codigos.Validacao, "Só uma assinatura cancelada pode ser reativada.");
        }

        if (assinatura.PagoAte is not DateOnly pago || pago < hoje)
        {
            return Resultado<AssinarResposta>.Erro(Codigos.Validacao, "O período pago já acabou. Assine de novo.");
        }

        // A assinatura no Asaas não chegou a ser cancelada (estado deixado pela versão anterior): só volta a Ativa.
        if (assinatura.AsaasSubscriptionId is not null && assinatura.CanceladaEm is null)
        {
            assinatura.Situacao = SituacaoAssinatura.Ativa;
            assinatura.AtualizadaEm = agora;
            await banco.SaveChangesAsync(ct);
            return Resultado<AssinarResposta>.Sucesso(new AssinarResposta(null, assinatura.ProximoVencimento ?? pago.AddDays(1), assinatura.Valor, null));
        }

        if (assinatura.AsaasCustomerId is null || assinatura.FormaPagamento is not FormaPagamento forma)
        {
            return Resultado<AssinarResposta>.Erro(Codigos.Validacao, "Não achamos os dados da assinatura anterior. Assine de novo.");
        }

        var passos = new List<PassoAsaas>();
        try
        {
            var vencimento = pago.AddDays(1);
            var plano = await banco.Planos.AsNoTracking().FirstAsync(item => item.Id == assinatura.PlanoId, ct);
            var valor = Assinatura.ValorCobrado(plano.ValorMensal, assinatura.ValorPersonalizado, assinatura.DescontoPercentual, assinatura.DescontoAte, vencimento);

            // Volta a recorrência da mesma assinatura no Asaas; só cria outra se a antiga foi removida lá (versão anterior).
            string assinaturaId;
            try
            {
                assinaturaId = assinatura.AsaasSubscriptionId ?? throw new ErroAsaas("Sem assinatura no Asaas.");
                await asaas.ReativarAssinaturaAsync(assinaturaId, vencimento, passos, ct);
            }
            catch (ErroAsaas)
            {
                var criada = await asaas.CriarAssinaturaAsync(
                    assinatura.AsaasCustomerId,
                    forma == FormaPagamento.Cartao ? "CREDIT_CARD" : "PIX",
                    valor,
                    vencimento,
                    $"Aralu {plano.Nome}",
                    contaId.ToString(),
                    passos,
                    ct);
                assinaturaId = criada.Id;
            }

            var cobrancas = await asaas.CobrancasDaAssinaturaAsync(assinaturaId, passos, ct);

            assinatura.AsaasSubscriptionId = assinaturaId;
            assinatura.Valor = valor;
            assinatura.ProximoVencimento = vencimento;
            assinatura.Situacao = SituacaoAssinatura.Ativa;
            assinatura.CanceladaEm = null;
            assinatura.AtualizadaEm = agora;
            foreach (var cobranca in cobrancas)
            {
                await GuardarCobrancaAsync(assinatura, cobranca, agora, ct);
            }

            await banco.SaveChangesAsync(ct);
            return Resultado<AssinarResposta>.Sucesso(new AssinarResposta(null, vencimento, valor, Diagnostico(passos)));
        }
        catch (ErroAsaas erro)
        {
            logs.LogWarning("Reativação da conta {Conta} recusada pelo Asaas: {Erro}", contaId, erro.Message);
            UltimoDiagnostico = Diagnostico(passos);
            return Resultado<AssinarResposta>.Erro(ErroAsaasCodigo, erro.Message);
        }
    }

    public async Task<IReadOnlyList<FaturaLeitura>> FaturasAsync(Guid contaId, CancellationToken ct) =>
        await banco.CobrancasAssinatura.AsNoTracking().IgnoreQueryFilters()
            .Where(item => item.ContaId == contaId)
            .OrderByDescending(item => item.Vencimento)
            .Select(item => new FaturaLeitura(item.Vencimento, item.Valor, item.Status, item.FormaPagamento == null ? null : item.FormaPagamento.ToString(), item.PagaEm, item.LinkFatura))
            .ToListAsync(ct);

    /// <summary>
    /// Recursos que o plano da conta libera (RF-119). No trial, os do plano em que a conta está (o padrão, ou o atribuído pelo Admin).
    /// </summary>
    public async Task<IReadOnlyDictionary<RecursoPlano, int?>> RecursosAsync(Guid contaId, CancellationToken ct)
    {
        var planoId = await banco.Assinaturas.AsNoTracking().IgnoreQueryFilters()
            .Where(item => item.ContaId == contaId).Select(item => (Guid?)item.PlanoId).FirstOrDefaultAsync(ct)
            ?? await banco.Planos.AsNoTracking().Where(item => item.Padrao).Select(item => (Guid?)item.Id).FirstOrDefaultAsync(ct);
        return await banco.Set<RecursoDoPlano>().AsNoTracking()
            .Where(item => item.PlanoId == planoId)
            .ToDictionaryAsync(item => item.Recurso, item => item.Limite, ct);
    }

    /// <summary>Nome do plano mais barato, ativo, que libera o recurso: o selo "Disponível no plano X" (§7, T20).</summary>
    public Task<string?> PlanoQueLiberaAsync(RecursoPlano recurso, CancellationToken ct) =>
        banco.Planos.AsNoTracking()
            .Where(plano => plano.Ativo && plano.Recursos.Any(item => item.Recurso == recurso))
            .OrderBy(plano => plano.ValorMensal)
            .Select(plano => plano.Nome)
            .FirstOrDefaultAsync(ct);

    /// <summary>Staging: os avisos do Asaas que chegaram para a conta, para acompanhar no DevTools.</summary>
    public async Task<IReadOnlyList<EventoDiagnostico>?> EventosParaDiagnosticoAsync(Guid contaId, CancellationToken ct)
    {
        if (!opcoes.Value.DiagnosticoNoNavegador)
        {
            return null;
        }

        var assinatura = await DaContaAsync(contaId, ct, rastrear: false);
        if (assinatura?.AsaasSubscriptionId is not { } id)
        {
            return [];
        }

        // Só no staging: lê os avisos recentes e filtra em memória pelo id da assinatura.
        var recentes = await banco.EventosWebhookAsaas.AsNoTracking()
            .OrderByDescending(item => item.RecebidoEm)
            .Take(500)
            .ToListAsync(ct);
        var eventos = recentes.Where(item => item.Payload.Contains(id, StringComparison.Ordinal)).Take(30).ToList();
        return eventos.Select(item => new EventoDiagnostico(item.Tipo, item.RecebidoEm, item.ProcessadoEm, item.Erro, JsonNode.Parse(item.Payload))).ToList();
    }

    /// <summary>
    /// Aviso do Asaas (R11). O id do evento é único: o mesmo aviso chegando duas vezes muda a conta uma vez só (T16).
    /// Devolve falso quando o aviso já tinha chegado.
    /// </summary>
    public async Task<bool> ReceberAvisoAsync(string corpo, DateTimeOffset agora, CancellationToken ct)
    {
        var aviso = JsonNode.Parse(corpo) ?? throw new JsonException("Aviso vazio.");
        var eventoId = aviso["id"]?.GetValue<string>() ?? throw new JsonException("Aviso sem id.");
        var tipo = aviso["event"]?.GetValue<string>() ?? "";
        if (await banco.EventosWebhookAsaas.AnyAsync(item => item.AsaasEventId == eventoId, ct))
        {
            return false;
        }

        var registro = new EventoWebhookAsaas { Id = Guid.NewGuid(), AsaasEventId = eventoId, Tipo = tipo, Payload = corpo, RecebidoEm = agora, Tentativas = 1 };
        banco.EventosWebhookAsaas.Add(registro);
        try
        {
            await banco.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Mesmo aviso chegando ao mesmo tempo: o índice único segurou o segundo.
            return false;
        }

        try
        {
            await ProcessarAsync(tipo, aviso, agora, ct);
            registro.ProcessadoEm = DateTimeOffset.UtcNow;
        }
        catch (Exception erro) when (erro is not OperationCanceledException)
        {
            logs.LogError(erro, "Falha ao processar o aviso {Evento} ({Tipo}) do Asaas.", eventoId, tipo);
            registro.Erro = erro.Message;
        }

        await banco.SaveChangesAsync(ct);
        return true;
    }

    private async Task ProcessarAsync(string tipo, JsonNode aviso, DateTimeOffset agora, CancellationToken ct)
    {
        // Cobrança avulsa do upgrade (SPEC-065): não tem "subscription" e não paga mês.
        if (aviso["payment"] is { } avulsa && avulsa["externalReference"]?.GetValue<string>() is { } referencia
            && referencia.StartsWith(PrefixoUpgrade, StringComparison.Ordinal))
        {
            await ProcessarUpgradeAsync(tipo, referencia, avulsa, agora, ct);
            return;
        }

        if (aviso["payment"] is not { } pagamento || pagamento["subscription"]?.GetValue<string>() is not { } assinaturaId)
        {
            return;
        }

        var assinatura = await banco.Assinaturas.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.AsaasSubscriptionId == assinaturaId, ct);
        if (assinatura is null)
        {
            logs.LogWarning("Aviso {Tipo} do Asaas para assinatura desconhecida {Assinatura}.", tipo, assinaturaId);
            return;
        }

        var cobranca = AsaasHttp.LerCobranca(pagamento);
        var guardada = await GuardarCobrancaAsync(assinatura, cobranca, agora, ct);
        switch (tipo)
        {
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED":
                // Pagamento confirmado: ativa (ou desbloqueia, T6) e paga o mês que começa no vencimento.
                guardada.PagaEm ??= agora;
                var fimDoPeriodo = cobranca.Vencimento.AddMonths(1).AddDays(-1);
                if (assinatura.PagoAte is null || fimDoPeriodo > assinatura.PagoAte)
                {
                    assinatura.PagoAte = fimDoPeriodo;
                    assinatura.ProximoVencimento = cobranca.Vencimento.AddMonths(1);
                }

                if (assinatura.Situacao != SituacaoAssinatura.Cancelada)
                {
                    assinatura.Situacao = SituacaoAssinatura.Ativa;
                }

                await avisos.PagamentoConfirmadoAsync(assinatura, cobranca.Vencimento, cobranca.Valor, agora, ct);

                break;
            case "PAYMENT_OVERDUE":
                if (assinatura.Situacao is SituacaoAssinatura.Ativa or SituacaoAssinatura.EmAtraso)
                {
                    assinatura.Situacao = SituacaoAssinatura.EmAtraso;
                    assinatura.ProximoVencimento = cobranca.Vencimento;
                }

                break;
            case "PAYMENT_REFUNDED":
            case "PAYMENT_CHARGEBACK_REQUESTED":
            case "PAYMENT_CHARGEBACK_DISPUTE":
                // Estorno ou contestação: bloqueia (§7).
                assinatura.Situacao = SituacaoAssinatura.Bloqueada;
                break;
        }

        assinatura.AtualizadaEm = agora;
    }

    private async Task<CobrancaAssinatura> GuardarCobrancaAsync(Assinatura assinatura, CobrancaAsaas cobranca, DateTimeOffset agora, CancellationToken ct)
    {
        var existente = banco.CobrancasAssinatura.Local.FirstOrDefault(item => item.AsaasPaymentId == cobranca.Id)
            ?? await banco.CobrancasAssinatura.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.AsaasPaymentId == cobranca.Id, ct);
        if (existente is null)
        {
            existente = new CobrancaAssinatura { Id = Guid.NewGuid(), ContaId = assinatura.ContaId, AssinaturaId = assinatura.Id, AsaasPaymentId = cobranca.Id, CriadaEm = agora };
            banco.CobrancasAssinatura.Add(existente);
        }

        existente.Valor = cobranca.Valor;
        existente.Vencimento = cobranca.Vencimento;
        existente.Status = cobranca.Status;
        existente.LinkFatura = cobranca.Link ?? existente.LinkFatura;
        existente.FormaPagamento = cobranca.FormaPagamento switch
        {
            "CREDIT_CARD" => FormaPagamento.Cartao,
            "PIX" => FormaPagamento.Pix,
            _ => existente.FormaPagamento,
        };
        return existente;
    }

    private IReadOnlyList<PassoAsaas>? Diagnostico(List<PassoAsaas> passos) => opcoes.Value.DiagnosticoNoNavegador ? passos : null;

    private Task<Assinatura?> DaContaAsync(Guid contaId, CancellationToken ct, bool rastrear)
    {
        var consulta = banco.Assinaturas.IgnoreQueryFilters().Where(item => item.ContaId == contaId);
        return (rastrear ? consulta : consulta.AsNoTracking()).FirstOrDefaultAsync(ct);
    }

    /// <summary>Só o hash do CPF/CNPJ fica guardado para impedir o segundo trial (R2).</summary>
    private static string Hash(string documento) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(documento)));
}
