using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Contratos;
using Project.Domain.Dinheiro;

namespace Project.Infrastructure.Persistencia;

public sealed class DadosContratoEf(AppDbContext banco) : IDadosContrato
{
    public async Task<IReadOnlyList<ContratoConta>> ListarAsync(string contaId, CancellationToken ct) =>
        await banco.Set<ContratoConta>().Where(item => item.ContaId == contaId).ToListAsync(ct);

    public Task<ContratoConta?> ObterAsync(string contaId, Guid id, CancellationToken ct) =>
        banco.Set<ContratoConta>().FirstOrDefaultAsync(item => item.Id == id && item.ContaId == contaId, ct);

    public Task InserirAsync(ContratoConta contrato, CancellationToken ct)
    {
        banco.Set<ContratoConta>().Add(contrato);
        return Task.CompletedTask;
    }

    public async Task RemoverAsync(ContratoConta contrato, CancellationToken ct)
    {
        await banco.Set<ContratoDoModelo>().Where(item => item.ContratoId == contrato.Id).ExecuteDeleteAsync(ct);
        await banco.Set<ContratoDoEvento>().Where(item => item.ContratoId == contrato.Id).ExecuteDeleteAsync(ct);
        await banco.Set<LinkLeituraContrato>().Where(item => item.ContratoId == contrato.Id).ExecuteDeleteAsync(ct);
        banco.Set<ContratoConta>().Remove(contrato);
    }

    public Task<bool> ModeloDaContaAsync(string contaId, Guid modeloId, CancellationToken ct) =>
        banco.Modelos.AnyAsync(modelo => modelo.Id == modeloId && modelo.ContaId == contaId, ct);

    public async Task<IReadOnlyList<Guid>> ContratosDoModeloAsync(Guid modeloId, CancellationToken ct) =>
        await banco.Set<ContratoDoModelo>().Where(item => item.ModeloId == modeloId).Select(item => item.ContratoId).ToListAsync(ct);

    public async Task SubstituirContratosDoModeloAsync(Guid modeloId, IReadOnlyList<Guid> contratoIds, CancellationToken ct)
    {
        await banco.Set<ContratoDoModelo>().Where(item => item.ModeloId == modeloId).ExecuteDeleteAsync(ct);
        banco.Set<ContratoDoModelo>().AddRange(contratoIds.Select(id => new ContratoDoModelo { ModeloId = modeloId, ContratoId = id }));
    }

    public Task<bool> EventoDaContaAsync(string contaId, Guid eventoId, CancellationToken ct) =>
        banco.Eventos.AnyAsync(evento => evento.Id == eventoId && evento.ContaId == contaId, ct);

    public async Task<IReadOnlyList<Guid>> ContratosDoEventoAsync(Guid eventoId, CancellationToken ct) =>
        await banco.Set<ContratoDoEvento>().Where(item => item.EventoId == eventoId).Select(item => item.ContratoId).ToListAsync(ct);

    public Task AdicionarAoEventoAsync(Guid eventoId, Guid contratoId, CancellationToken ct)
    {
        banco.Set<ContratoDoEvento>().Add(new ContratoDoEvento { EventoId = eventoId, ContratoId = contratoId });
        return Task.CompletedTask;
    }

    public async Task RemoverDoEventoAsync(Guid eventoId, Guid contratoId, CancellationToken ct) =>
        await banco.Set<ContratoDoEvento>().Where(item => item.EventoId == eventoId && item.ContratoId == contratoId).ExecuteDeleteAsync(ct);

    public async Task<DadosMesclagemEvento?> DadosMesclagemAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var evento = await banco.Eventos.AsNoTracking().FirstOrDefaultAsync(item => item.Id == eventoId && item.ContaId == contaId, ct);
        if (evento is null)
        {
            return null;
        }

        var cliente = await banco.Vinculos.AsNoTracking()
            .Where(vinculo => vinculo.EventoId == eventoId)
            .Join(
                banco.Clientes.AsNoTracking().Where(item => item.ContaId == contaId),
                vinculo => vinculo.ClienteId,
                item => item.Id,
                (_, item) => item)
            .OrderBy(item => item.Nome)
            .FirstOrDefaultAsync(ct);
        var perfil = await banco.Perfis.AsNoTracking().FirstOrDefaultAsync(item => item.ContaId == contaId, ct);
        var parcelas = await banco.Set<ParcelaCasal>().AsNoTracking().Where(item => item.EventoId == eventoId).ToListAsync(ct);
        return new DadosMesclagemEvento(evento, cliente, perfil, parcelas);
    }

    public Task InserirLinkAsync(LinkLeituraContrato link, CancellationToken ct)
    {
        banco.Set<LinkLeituraContrato>().Add(link);
        return Task.CompletedTask;
    }

    public Task<LinkLeituraContrato?> LinkPorTokenAsync(string token, CancellationToken ct) =>
        banco.Set<LinkLeituraContrato>().AsNoTracking().FirstOrDefaultAsync(item => item.Token == token, ct);

    public async Task<IReadOnlyList<LinkLeituraContrato>> LinksDoEventoAsync(Guid eventoId, CancellationToken ct) =>
        await banco.Set<LinkLeituraContrato>().AsNoTracking().Where(item => item.EventoId == eventoId).ToListAsync(ct);

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
