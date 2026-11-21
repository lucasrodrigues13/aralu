using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;

namespace Project.Infrastructure.Persistencia;

public sealed class DadosDinheiroEf(AppDbContext banco) : IDadosDinheiro
{
    public Task<Evento?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct) =>
        banco.Eventos
            .Include(evento => evento.Servicos).ThenInclude(servico => servico.Contrato).ThenInclude(contrato => contrato!.Parcelas)
            .Include(evento => evento.Servicos).ThenInclude(servico => servico.Subitens)
            .FirstOrDefaultAsync(evento => evento.Id == eventoId && evento.ContaId == contaId, ct);

    public async Task<IReadOnlyList<LancamentoEvento>> LancamentosAsync(Guid eventoId, CancellationToken ct) =>
        await banco.Set<LancamentoEvento>().Where(item => item.EventoId == eventoId).ToListAsync(ct);

    public Task<LancamentoEvento?> ObterLancamentoAsync(string contaId, Guid eventoId, Guid id, CancellationToken ct) =>
        banco.Set<LancamentoEvento>()
            .Where(item => item.Id == id && item.EventoId == eventoId)
            .Where(item => banco.Eventos.Any(evento => evento.Id == item.EventoId && evento.ContaId == contaId))
            .FirstOrDefaultAsync(ct);

    public Task InserirLancamentoAsync(LancamentoEvento lancamento, CancellationToken ct)
    {
        banco.Set<LancamentoEvento>().Add(lancamento);
        return Task.CompletedTask;
    }

    public Task RemoverLancamentoAsync(LancamentoEvento lancamento, CancellationToken ct)
    {
        banco.Set<LancamentoEvento>().Remove(lancamento);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<PagamentoFornecedorLeitura>> PagamentosFornecedoresAsync(string contaId, Guid? eventoId, CancellationToken ct)
    {
        var eventos = banco.Eventos.AsNoTracking().Where(evento => evento.ContaId == contaId);
        if (eventoId is Guid id)
        {
            eventos = eventos.Where(evento => evento.Id == id);
        }

        var lista = await eventos
            .Include(evento => evento.Servicos).ThenInclude(servico => servico.Contrato).ThenInclude(contrato => contrato!.Parcelas)
            .Include(evento => evento.Servicos).ThenInclude(servico => servico.Fornecedores)
            .AsSplitQuery()
            .ToListAsync(ct);
        var fornecedorIds = lista
            .SelectMany(evento => evento.Servicos)
            .SelectMany(servico => servico.Fornecedores)
            .Where(vinculo => vinculo.Etapa == EtapaNegociacao.Contratado)
            .Select(vinculo => vinculo.FornecedorId)
            .Distinct()
            .ToArray();
        var nomes = await banco.Fornecedores.AsNoTracking()
            .Where(fornecedor => fornecedor.ContaId == contaId && fornecedorIds.Contains(fornecedor.Id))
            .ToDictionaryAsync(fornecedor => fornecedor.Id, fornecedor => fornecedor.Nome, ct);

        return lista
            .SelectMany(evento => evento.Servicos.SelectMany(servico => (servico.Contrato?.Parcelas ?? []).Select(parcela =>
            {
                var contratado = servico.Fornecedores.FirstOrDefault(vinculo => vinculo.Etapa == EtapaNegociacao.Contratado);
                string? fornecedor = null;
                if (contratado is not null)
                {
                    nomes.TryGetValue(contratado.FornecedorId, out fornecedor);
                }

                return new PagamentoFornecedorLeitura(
                    evento.Id,
                    evento.Nome,
                    servico.Id,
                    servico.Nome,
                    fornecedor,
                    parcela.Numero,
                    parcela.Vencimento,
                    parcela.Valor,
                    parcela.Entrada,
                    parcela.Situacao);
            })))
            .OrderBy(item => item.Vencimento)
            .ThenBy(item => item.Evento)
            .ToArray();
    }

    public async Task<IReadOnlyList<ComprovanteEvento>> ComprovantesAsync(Guid eventoId, CancellationToken ct) =>
        await banco.Set<ComprovanteEvento>().Where(item => item.EventoId == eventoId).ToListAsync(ct);

    public Task<ComprovanteEvento?> ObterComprovanteAsync(string contaId, Guid eventoId, Guid id, CancellationToken ct) =>
        banco.Set<ComprovanteEvento>()
            .Where(item => item.Id == id && item.EventoId == eventoId)
            .Where(item => banco.Eventos.Any(evento => evento.Id == item.EventoId && evento.ContaId == contaId))
            .FirstOrDefaultAsync(ct);

    public Task InserirComprovanteAsync(ComprovanteEvento comprovante, CancellationToken ct)
    {
        banco.Set<ComprovanteEvento>().Add(comprovante);
        return Task.CompletedTask;
    }

    public Task RemoverComprovanteAsync(ComprovanteEvento comprovante, CancellationToken ct)
    {
        banco.Set<ComprovanteEvento>().Remove(comprovante);
        return Task.CompletedTask;
    }

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
