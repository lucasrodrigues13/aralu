using Project.Application.Comum;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Project.Application.Negocio;
using Project.Domain.Assinaturas;
using Project.Domain.Equipe;
using Project.Infrastructure.Persistencia;
using Project.Domain.Comum;

namespace Project.Infrastructure.Assinaturas;

/// <summary>Resumo de uma rodada do controle diário, para log e testes.</summary>
public sealed record RodadaControle(int Contas, int Avisos, int Mudancas, int ValoresAtualizados);

/// <summary>
/// Controle diário da SPEC-062 (R11): grava a situação vencida (trial, atraso, cancelamento), manda os avisos
/// (trial nos dias 11, 13 e 14; atraso no 1º e no 4º dia; desconto 7 dias antes do fim) e leva ao Asaas o valor
/// cheio quando o desconto acaba. Pode rodar várias vezes no dia: cada aviso é gravado e não se repete.
/// O bloqueio em si não espera esta rodada: a regra de liberação é calculada a cada pedido.
/// </summary>
public sealed class AvisosAssinaturaServico(AppDbContext banco, IEnvioEmail email, IAsaas asaas, IConfiguration configuracao, ILogger<AvisosAssinaturaServico> logs)
{
    public async Task<RodadaControle> RodarAsync(DateTimeOffset agora, CancellationToken ct)
    {
        var hoje = HorarioBrasil.Data(agora);
        var assinaturas = await banco.Assinaturas.IgnoreQueryFilters().OrderBy(item => item.ContaId).ToListAsync(ct);
        var planos = await banco.Planos.AsNoTracking().ToDictionaryAsync(item => item.Id, ct);
        int avisos = 0, mudancas = 0, valores = 0;
        foreach (var assinatura in assinaturas)
        {
            try
            {
                mudancas += AtualizarSituacao(assinatura, agora, hoje) ? 1 : 0;
                mudancas += await AplicarDowngradeAsync(assinatura, planos, agora, hoje, ct) ? 1 : 0;
                avisos += await AvisarAsync(assinatura, planos[assinatura.PlanoId], agora, hoje, ct);
                valores += await SincronizarValorAsync(assinatura, planos[assinatura.PlanoId], hoje, ct) ? 1 : 0;
                await banco.SaveChangesAsync(ct);
            }
            catch (Exception erro) when (erro is not OperationCanceledException)
            {
                logs.LogError(erro, "Controle diário falhou na conta {Conta}.", assinatura.ContaId);

                // O contexto é o mesmo para todas as contas: sem descartar, a próxima conta tenta gravar de novo o que falhou aqui.
                banco.DescartarAlteracoes();
            }
        }

        return new RodadaControle(assinaturas.Count, avisos, mudancas, valores);
    }

    /// <summary>E-mail de pagamento confirmado (§6 B6), uma vez por vencimento.</summary>
    public async Task PagamentoConfirmadoAsync(Assinatura assinatura, DateOnly vencimento, decimal valor, DateTimeOffset agora, CancellationToken ct)
    {
        if (await RegistrarAsync(assinatura.ContaId, "PagamentoConfirmado", vencimento, agora, ct))
        {
            await EnviarAosDonosAsync(assinatura.ContaId, EmailsAssinatura.PagamentoConfirmado(valor, assinatura.ProximoVencimento, Link()), ct);
        }
    }

    /// <summary>E-mail do upgrade pago (SPEC-065 §6.1 passo 6).</summary>
    public Task UpgradeConfirmadoAsync(Assinatura assinatura, string plano, decimal valorPago, CancellationToken ct) =>
        EnviarAosDonosAsync(assinatura.ContaId, EmailsAssinatura.UpgradeConfirmado(plano, valorPago, assinatura.Valor, assinatura.ProximoVencimento, Link()), ct);

    /// <summary>E-mail do downgrade agendado (SPEC-065 §6.2 passo 6).</summary>
    public Task DowngradeAgendadoAsync(Assinatura assinatura, string plano, DateOnly aplicaEm, decimal mensalidade, CancellationToken ct) =>
        EnviarAosDonosAsync(assinatura.ContaId, EmailsAssinatura.DowngradeAgendado(plano, aplicaEm, mensalidade, Link()), ct);

    /// <summary>
    /// SPEC-065 regra 17: no dia do vencimento o plano menor passa a valer, mesmo antes do pagamento da nova mensalidade.
    /// O valor no Asaas já foi trocado ao agendar.
    /// </summary>
    private async Task<bool> AplicarDowngradeAsync(Assinatura assinatura, IReadOnlyDictionary<Guid, Plano> planos, DateTimeOffset agora, DateOnly hoje, CancellationToken ct)
    {
        if (assinatura.DowngradePlanoId is not Guid destino || assinatura.DowngradeEm is not DateOnly aplicaEm || hoje < aplicaEm)
        {
            return false;
        }

        var plano = planos[destino];
        assinatura.PlanoId = destino;
        assinatura.Valor = Assinatura.ValorCobrado(plano.ValorMensal, assinatura.ValorPersonalizado, assinatura.DescontoPercentual, assinatura.DescontoAte, aplicaEm);
        assinatura.DescartarTroca();
        assinatura.AtualizadaEm = agora;
        if (await RegistrarAsync(assinatura.ContaId, "DowngradeAplicado", aplicaEm, agora, ct))
        {
            await EnviarAosDonosAsync(assinatura.ContaId, EmailsAssinatura.DowngradeAplicado(plano.Nome, assinatura.Valor, Link()), ct);
        }

        return true;
    }

    /// <summary>Grava a situação que já venceu (§11): a tela e o Admin passam a ver o estado certo.</summary>
    private static bool AtualizarSituacao(Assinatura assinatura, DateTimeOffset agora, DateOnly hoje)
    {
        var nova = assinatura.Situacao switch
        {
            SituacaoAssinatura.Trial when agora >= assinatura.TrialTerminaEm => SituacaoAssinatura.Expirada,
            SituacaoAssinatura.EmAtraso when assinatura.ProximoVencimento is DateOnly v && hoje > v.AddDays(Assinatura.DiasDeTolerancia) => SituacaoAssinatura.Bloqueada,
            SituacaoAssinatura.Cancelada when assinatura.PagoAte is DateOnly pago && hoje > pago => SituacaoAssinatura.Bloqueada,
            _ => assinatura.Situacao,
        };
        if (nova == assinatura.Situacao)
        {
            return false;
        }

        assinatura.Situacao = nova;
        assinatura.AtualizadaEm = agora;
        return true;
    }

    private async Task<int> AvisarAsync(Assinatura assinatura, Plano plano, DateTimeOffset agora, DateOnly hoje, CancellationToken ct)
    {
        var enviados = 0;
        var link = Link();

        // Trial nos dias 11, 13 e 14 (§6 A7), só para quem ainda não assinou.
        if (assinatura.Situacao == SituacaoAssinatura.Trial && assinatura.AsaasSubscriptionId is null && agora < assinatura.TrialTerminaEm)
        {
            var dia = (int)Math.Floor((agora - assinatura.TrialIniciaEm).TotalDays) + 1;
            var ultimoDia = HorarioBrasil.Data(assinatura.TrialTerminaEm).AddDays(-1);
            // Só o marco mais recente que já chegou: um aviso atrasado não sai depois do seguinte.
            if (new[] { 14, 13, 11 }.FirstOrDefault(m => dia >= m) is var marco and > 0
                && await RegistrarAsync(assinatura.ContaId, $"Trial{marco}", ultimoDia, agora, ct))
            {
                    var restantes = ultimoDia.DayNumber - hoje.DayNumber + 1;
                    await EnviarAosDonosAsync(assinatura.ContaId, EmailsAssinatura.TrialAcabando(restantes, ultimoDia, link), ct);
                enviados++;
            }
        }

        // Atraso no 1º e no 4º dia depois do vencimento (§7).
        if (assinatura.Situacao == SituacaoAssinatura.EmAtraso && assinatura.ProximoVencimento is DateOnly vencimento)
        {
            var diasDeAtraso = hoje.DayNumber - vencimento.DayNumber;
            if (new[] { 4, 1 }.FirstOrDefault(m => diasDeAtraso >= m) is var marco and > 0
                && await RegistrarAsync(assinatura.ContaId, $"Atraso{marco}", vencimento, agora, ct))
            {
                    await EnviarAosDonosAsync(assinatura.ContaId, EmailsAssinatura.PagamentoEmAtraso(vencimento, vencimento.AddDays(Assinatura.DiasDeTolerancia + 1), link), ct);
                enviados++;
            }
        }

        // Desconto: aviso 7 dias antes do fim (§7).
        if (assinatura.DescontoPercentual is not null && assinatura.ValorPersonalizado is null && assinatura.DescontoAte is DateOnly fim
            && hoje >= fim.AddDays(-7) && hoje <= fim
            && await RegistrarAsync(assinatura.ContaId, "DescontoAcabando", fim, agora, ct))
        {
            await EnviarAosDonosAsync(assinatura.ContaId, EmailsAssinatura.DescontoAcabando(fim, plano.ValorMensal, link), ct);
            enviados++;
        }

        return enviados;
    }

    /// <summary>
    /// Leva ao Asaas o valor da próxima cobrança quando ele muda sozinho (fim do desconto, T18).
    /// O Asaas gera a cobrança com antecedência; por isso a rodada olha o vencimento seguinte e corrige antes.
    /// </summary>
    private async Task<bool> SincronizarValorAsync(Assinatura assinatura, Plano plano, DateOnly hoje, CancellationToken ct)
    {
        var vencimento = assinatura.ProximoVencimento ?? hoje;
        var devido = Assinatura.ValorCobrado(plano.ValorMensal, assinatura.ValorPersonalizado, assinatura.DescontoPercentual, assinatura.DescontoAte, vencimento);
        if (devido == assinatura.Valor || assinatura.DescontoAte is not DateOnly fim || vencimento <= fim || assinatura.DowngradePlanoId is not null)
        {
            return false;
        }

        if (assinatura.AsaasSubscriptionId is { } id && assinatura.Situacao is not (SituacaoAssinatura.Cancelada or SituacaoAssinatura.Bloqueada))
        {
            await asaas.AtualizarValorAsync(id, devido, [], ct);
        }

        logs.LogInformation("Desconto da conta {Conta} terminou em {Fim}: valor de {Antes} para {Depois}.", assinatura.ContaId, fim, assinatura.Valor, devido);
        assinatura.Valor = devido;
        return true;
    }

    /// <summary>Verdadeiro quando o aviso é novo (e fica gravado); falso quando já tinha sido enviado.</summary>
    private async Task<bool> RegistrarAsync(Guid contaId, string tipo, DateOnly referencia, DateTimeOffset agora, CancellationToken ct)
    {
        if (await banco.AvisosAssinatura.IgnoreQueryFilters().AnyAsync(item => item.ContaId == contaId && item.Tipo == tipo && item.Referencia == referencia, ct))
        {
            return false;
        }

        banco.AvisosAssinatura.Add(new AvisoAssinatura { Id = Guid.NewGuid(), ContaId = contaId, Tipo = tipo, Referencia = referencia, EnviadoEm = agora });
        return true;
    }

    private async Task EnviarAosDonosAsync(Guid contaId, EmailConteudo conteudo, CancellationToken ct)
    {
        var donos = await banco.Membros.AsNoTracking().IgnoreQueryFilters()
            .Where(item => item.ContaId == contaId && item.Tipo == TipoMembro.Dono && item.Situacao == SituacaoMembro.Ativa)
            .Select(item => item.Email)
            .ToListAsync(ct);
        foreach (var endereco in donos)
        {
            try
            {
                await email.EnviarAsync(endereco, conteudo, ct);
            }
            catch (Exception erro) when (erro is not OperationCanceledException)
            {
                logs.LogWarning("Aviso de assinatura não enviado para a conta {Conta}: {Tipo}.", contaId, erro.GetType().Name);
            }
        }
    }

    private string Link() => $"{(configuracao["PublicUrl"] ?? "").TrimEnd('/')}/configuracoes/assinatura";
}

/// <summary>Roda o controle diário de hora em hora (cada aviso só sai uma vez). Desligue com Assinaturas:ControleDiario=false.</summary>
public sealed class ControleDiarioAssinaturas(IServiceScopeFactory escopos, IConfiguration configuracao, ILogger<ControleDiarioAssinaturas> logs) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!configuracao.GetValue("Assinaturas:ControleDiario", true))
        {
            return;
        }

        await Task.Delay(TimeSpan.FromMinutes(1), ct);
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var escopo = escopos.CreateScope();
                var rodada = await escopo.ServiceProvider.GetRequiredService<AvisosAssinaturaServico>().RodarAsync(Relogio.Agora, ct);
                logs.LogInformation(
                    "Controle de assinaturas: {Contas} contas, {Avisos} avisos, {Mudancas} situações e {Valores} valores atualizados.",
                    rodada.Contas, rodada.Avisos, rodada.Mudancas, rodada.ValoresAtualizados);
            }
            catch (Exception erro) when (erro is not OperationCanceledException)
            {
                logs.LogError(erro, "Controle diário de assinaturas falhou.");
            }

            try
            {
                using var escopo = escopos.CreateScope();
                var reprocessados = await escopo.ServiceProvider.GetRequiredService<AssinaturaServico>().ReprocessarAvisosPendentesAsync(ct);
                if (reprocessados > 0)
                {
                    logs.LogInformation("Avisos do Asaas reprocessados: {Avisos}.", reprocessados);
                }
            }
            catch (Exception erro) when (erro is not OperationCanceledException)
            {
                logs.LogError(erro, "Reprocessamento dos avisos do Asaas falhou.");
            }

            await Task.Delay(Intervalo, ct);
        }
    }
}
