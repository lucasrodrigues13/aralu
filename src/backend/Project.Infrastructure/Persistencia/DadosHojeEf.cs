using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Contratos;
using Project.Domain.Convidados;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;

namespace Project.Infrastructure.Persistencia;

public sealed class DadosHojeEf(AppDbContext banco) : IDadosHoje
{
    public async Task<IReadOnlyList<EventoHojeDado>> EventosEmAndamentoAsync(string contaId, CancellationToken ct) =>
        await banco.Eventos.AsNoTracking()
            .Where(evento => evento.ContaId == contaId && evento.Situacao == SituacaoEvento.EmAndamento)
            .Select(evento => new EventoHojeDado(evento.Id, evento.Nome, evento.Data))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<TarefaHojeDado>> TarefasAsync(string contaId, IReadOnlyCollection<Guid> eventoIds, CancellationToken ct) =>
        await banco.Tarefas.AsNoTracking()
            .Where(tarefa => tarefa.ContaId == contaId && eventoIds.Contains(tarefa.EventoId))
            .Select(tarefa => new TarefaHojeDado(tarefa.EventoId, tarefa.Prazo, tarefa.Situacao))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ConvidadosEventoDado>> ConvidadosAsync(string contaId, IReadOnlyCollection<Guid> eventoIds, CancellationToken ct) =>
        await banco.Convidados.AsNoTracking()
            .Join(
                banco.Convites.AsNoTracking().Where(convite => convite.ContaId == contaId && eventoIds.Contains(convite.EventoId)),
                convidado => convidado.ConviteId,
                convite => convite.Id,
                (convidado, convite) => new { convite.EventoId, convidado.Situacao })
            .GroupBy(item => item.EventoId)
            .Select(grupo => new ConvidadosEventoDado(
                grupo.Key,
                grupo.Count(),
                grupo.Count(item => item.Situacao == SituacaoConvidado.Pendente),
                grupo.Count(item => item.Situacao == SituacaoConvidado.Confirmado),
                grupo.Count(item => item.Situacao == SituacaoConvidado.NaoComparecera)))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ParcelaHojeDado>> CobrancasAsync(string contaId, IReadOnlyCollection<Guid> eventoIds, DateOnly ate, CancellationToken ct)
    {
        var parcelas = await banco.Set<ParcelaCasal>().AsNoTracking()
            .Include(parcela => parcela.Recebimentos)
            .Where(parcela => eventoIds.Contains(parcela.EventoId) && parcela.Vencimento <= ate)
            .ToListAsync(ct);
        var nomes = await banco.Eventos.AsNoTracking()
            .Where(evento => evento.ContaId == contaId && eventoIds.Contains(evento.Id))
            .ToDictionaryAsync(evento => evento.Id, evento => evento.Nome, ct);
        return parcelas
            .Where(parcela => parcela.Saldo > 0 && nomes.ContainsKey(parcela.EventoId))
            .Select(parcela => new ParcelaHojeDado(parcela.EventoId, nomes[parcela.EventoId], parcela.Numero, parcela.Entrada, parcela.Vencimento, parcela.Saldo))
            .ToArray();
    }

    public async Task<IReadOnlyList<PagamentoSemanaDado>> PagamentosPendentesAsync(
        string contaId,
        IReadOnlyCollection<Guid> eventoIds,
        DateOnly de,
        DateOnly ate,
        CancellationToken ct) =>
        await banco.Eventos.AsNoTracking()
            .Where(evento => evento.ContaId == contaId && eventoIds.Contains(evento.Id))
            .SelectMany(evento => evento.Servicos)
            .SelectMany(servico => servico.Parcelas)
            .Where(parcela => parcela.Situacao == SituacaoParcela.Pendente && parcela.Vencimento >= de && parcela.Vencimento <= ate)
            .Select(parcela => new PagamentoSemanaDado(parcela.Vencimento, parcela.Valor))
            .ToListAsync(ct);

    public async Task<ConfiguracaoContaDado> ConfiguracaoAsync(string contaId, CancellationToken ct)
    {
        var perfil = await banco.Perfis.AsNoTracking().FirstOrDefaultAsync(item => item.ContaId == contaId, ct);
        var temContrato = await banco.Set<ContratoConta>().AnyAsync(item => item.ContaId == contaId, ct);
        return new ConfiguracaoContaDado(
            !string.IsNullOrWhiteSpace(perfil?.NomeEmpresa),
            !string.IsNullOrWhiteSpace(perfil?.ChavePix),
            temContrato);
    }
}
