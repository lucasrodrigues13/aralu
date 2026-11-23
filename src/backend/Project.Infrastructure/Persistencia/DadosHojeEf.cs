using Microsoft.EntityFrameworkCore;
using Project.Domain.Funil;
using Project.Application.Negocio;
using Project.Domain.Contratos;
using Project.Domain.Convidados;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Equipe;
using Project.Domain.Fornecedores;
using Project.Domain.Tarefas;

namespace Project.Infrastructure.Persistencia;

public sealed class DadosHojeEf(AppDbContext banco) : IDadosHoje
{
    public async Task<IReadOnlyList<TarefaSemResponsavelAtivo>> TarefasSemResponsavelAtivoAsync(string contaId, CancellationToken ct)
    {
        var removidas = await banco.Assistentes.AsNoTracking()
            .Where(item => item.ContaId == contaId && (item.Situacao == SituacaoAssistente.Removida || item.Situacao == SituacaoAssistente.Inativa))
            .ToDictionaryAsync(item => item.Id.ToString(), item => item.Nome, ct);
        if (removidas.Count == 0)
        {
            return [];
        }

        var chaves = removidas.Keys.ToArray();
        var resultado = new List<TarefaSemResponsavelAtivo>();

        var doEvento = await banco.Tarefas.AsNoTracking()
            .Where(tarefa => tarefa.ContaId == contaId
                && tarefa.Situacao != SituacaoTarefa.Concluida
                && tarefa.Responsaveis.Any(r => r.Papel == PapelResponsavel.Assistente && r.ReferenciaId != null && chaves.Contains(r.ReferenciaId)))
            .Select(tarefa => new
            {
                tarefa.Id,
                tarefa.Titulo,
                tarefa.EventoId,
                Evento = banco.Eventos.Where(e => e.Id == tarefa.EventoId).Select(e => e.Nome).FirstOrDefault(),
                tarefa.Prazo,
                Referencia = tarefa.Responsaveis
                    .Where(r => r.Papel == PapelResponsavel.Assistente && r.ReferenciaId != null && chaves.Contains(r.ReferenciaId))
                    .Select(r => r.ReferenciaId!)
                    .First(),
            })
            .ToListAsync(ct);
        resultado.AddRange(doEvento.Select(item => new TarefaSemResponsavelAtivo(
            "Evento", item.Id, item.Titulo, item.EventoId, item.Evento ?? "", item.Prazo, removidas[item.Referencia])));

        var doFunil = await banco.TarefasFunil.AsNoTracking()
            .Where(tarefa => tarefa.ContaId == contaId
                && !tarefa.Completa
                && tarefa.Responsaveis.Any(r => r.Papel == PapelResponsavel.Assistente && chaves.Contains(r.ReferenciaId)))
            .Select(tarefa => new
            {
                tarefa.Id,
                tarefa.Titulo,
                tarefa.OportunidadeId,
                Lead = banco.Oportunidades.Where(o => o.Id == tarefa.OportunidadeId).Select(o => o.Nome).FirstOrDefault(),
                tarefa.Prazo,
                Referencia = tarefa.Responsaveis
                    .Where(r => r.Papel == PapelResponsavel.Assistente && chaves.Contains(r.ReferenciaId))
                    .Select(r => r.ReferenciaId)
                    .First(),
            })
            .ToListAsync(ct);
        resultado.AddRange(doFunil.Select(item => new TarefaSemResponsavelAtivo(
            "Funil", item.Id, item.Titulo, item.OportunidadeId, item.Lead ?? "", (DateOnly?)item.Prazo, removidas[item.Referencia])));

        return resultado.OrderBy(item => item.Prazo ?? DateOnly.MaxValue).ThenBy(item => item.Titulo).ToArray();
    }

    public async Task<IReadOnlyList<RetornoFunilHoje>> RetornosFunilAsync(string contaId, DateOnly ate, CancellationToken ct) =>
        await banco.Oportunidades.AsNoTracking()
            .Where(item => item.ContaId == contaId
                && item.RetornarEm != null
                && item.RetornarEm <= ate
                && item.EstagioFunil!.Tipo == TipoEstagioFunil.Aberto)
            .Select(item => new RetornoFunilHoje(item.Id, item.Nome, item.EstagioFunil!.Nome, item.RetornarEm!.Value, item.RetornarHora, false))
            .ToListAsync(ct);

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

    public async Task<IReadOnlyList<ParcelaHojeDado>> CobrancasAsync(string contaId, DateOnly ate, CancellationToken ct)
    {
        var contratos = await banco.ContratosFunil.AsNoTracking()
            .Include(contrato => contrato.Parcelas).ThenInclude(parcela => parcela.Recebimentos)
            .Where(contrato => contrato.ContaId == contaId
                && contrato.Situacao != SituacaoContratoFunil.Cancelado
                && contrato.Parcelas.Any(parcela => parcela.Vencimento <= ate))
            .ToListAsync(ct);
        var nomes = await banco.Oportunidades.AsNoTracking()
            .Where(oportunidade => oportunidade.ContaId == contaId && contratos.Select(contrato => contrato.OportunidadeId).Contains(oportunidade.Id))
            .ToDictionaryAsync(oportunidade => oportunidade.Id, oportunidade => oportunidade.Nome, ct);
        return contratos
            .SelectMany(contrato => contrato.Parcelas
                .Where(parcela => parcela.Vencimento <= ate && parcela.Saldo > 0)
                .Select(parcela => new ParcelaHojeDado(
                    contrato.Id,
                    nomes.GetValueOrDefault(contrato.OportunidadeId, ""),
                    parcela.Numero,
                    parcela.Entrada,
                    parcela.Vencimento,
                    parcela.Saldo)))
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
            .Select(servico => servico.Contrato).Where(contrato => contrato != null).SelectMany(contrato => contrato!.Parcelas)
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
