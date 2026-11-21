using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Persistencia;

/// <summary>Acesso a dados do link do casal (SPEC-046).</summary>
public sealed class DadosLinkCasalEf(AppDbContext banco) : IDadosLinkCasal
{
    public Task<EventoDoLink?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct) =>
        banco.Eventos.AsNoTracking()
            .Where(evento => evento.Id == eventoId && evento.ContaId == contaId)
            .Select(evento => new EventoDoLink(evento.Id, evento.ContaId, evento.Nome, evento.Data))
            .FirstOrDefaultAsync(ct);

    public Task<LinkCasal?> ObterPorEventoAsync(Guid eventoId, CancellationToken ct) =>
        banco.LinksCasal.FirstOrDefaultAsync(link => link.EventoId == eventoId, ct);

    public Task<LinkCasal?> ObterPorTokenAsync(string token, CancellationToken ct) =>
        banco.LinksCasal.AsNoTracking().FirstOrDefaultAsync(link => link.Token == token, ct);

    public Task InserirAsync(LinkCasal link, CancellationToken ct)
    {
        banco.LinksCasal.Add(link);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(LinkCasal link, CancellationToken ct)
    {
        banco.LinksCasal.Remove(link);
        return Task.CompletedTask;
    }

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
