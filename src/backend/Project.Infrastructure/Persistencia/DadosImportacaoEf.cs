using Microsoft.EntityFrameworkCore;
using Project.Application.Convidados;
using Project.Domain.Convidados;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Persistencia;

/// <summary>Fila de importações de convidados (SPEC-059 §6.6).</summary>
public sealed class DadosImportacaoEf(AppDbContext banco) : IDadosImportacao
{
    public async Task<bool?> EventoEmAndamentoAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var situacao = await banco.Eventos.AsNoTracking()
            .Where(evento => evento.Id == eventoId && evento.ContaId == contaId)
            .Select(evento => (SituacaoEvento?)evento.Situacao)
            .FirstOrDefaultAsync(ct);
        return situacao is null ? null : situacao == SituacaoEvento.EmAndamento;
    }

    public async Task InserirAsync(ImportacaoConvidados importacao, CancellationToken ct)
    {
        banco.ImportacoesConvidados.Add(importacao);
        await banco.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<ImportacaoConvidados>> ListarAsync(string contaId, Guid eventoId, int quantidade, CancellationToken ct) =>
        await banco.ImportacoesConvidados.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.EventoId == eventoId)
            .OrderByDescending(item => item.CriadaEm)
            .Take(quantidade)
            .Select(item => new ImportacaoConvidados
            {
                Id = item.Id,
                ContaId = item.ContaId,
                EventoId = item.EventoId,
                NomeArquivo = item.NomeArquivo,
                Situacao = item.Situacao,
                CriadaEm = item.CriadaEm,
                ConcluidaEm = item.ConcluidaEm,
                Convites = item.Convites,
                Erros = item.Erros,
            })
            .ToListAsync(ct);

    public Task<bool> TemPendenteAsync(CancellationToken ct) =>
        banco.ImportacoesConvidados.AnyAsync(item => item.Situacao == SituacaoImportacao.Pendente, ct);

    public async Task<ImportacaoConvidados?> PegarProximaAsync(DateTimeOffset agora, CancellationToken ct)
    {
        var proxima = await banco.ImportacoesConvidados
            .Where(item => item.Situacao == SituacaoImportacao.Pendente)
            .OrderBy(item => item.CriadaEm)
            .FirstOrDefaultAsync(ct);
        if (proxima is null)
        {
            return null;
        }

        proxima.Situacao = SituacaoImportacao.Processando;
        await banco.SaveChangesAsync(ct);
        return proxima;
    }

    public Task<int> RetomarInterrompidasAsync(CancellationToken ct) =>
        banco.ImportacoesConvidados
            .Where(item => item.Situacao == SituacaoImportacao.Processando)
            .ExecuteUpdateAsync(item => item.SetProperty(campo => campo.Situacao, SituacaoImportacao.Pendente), ct);

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
