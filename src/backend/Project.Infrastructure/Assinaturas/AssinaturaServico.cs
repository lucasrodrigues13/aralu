using Microsoft.EntityFrameworkCore;
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
    decimal Valor);

/// <summary>Assinatura da conta (SPEC-062 parte B): leitura da situação e da regra de liberação (R7).</summary>
public sealed class AssinaturaServico(AppDbContext banco)
{
    /// <summary>Conta sem assinatura (criada antes do lote 4.1) é tratada como liberada: nada é bloqueado sem registro.</summary>
    public async Task<bool> LiberadaAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await banco.Assinaturas.AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.ContaId == contaId, ct);
        return assinatura is null || assinatura.Liberada(agora);
    }

    public async Task<SituacaoLeitura?> SituacaoAsync(Guid contaId, DateTimeOffset agora, CancellationToken ct)
    {
        var assinatura = await banco.Assinaturas.AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.ContaId == contaId, ct);
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
            assinatura.Valor);
    }
}
