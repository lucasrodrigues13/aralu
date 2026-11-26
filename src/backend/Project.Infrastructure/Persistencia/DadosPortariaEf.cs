using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Convidados;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Persistencia;

/// <summary>Acesso a dados da portaria (SPEC-058).</summary>
public sealed class DadosPortariaEf(AppDbContext banco) : IDadosPortaria
{
    public Task<EventoDoLink?> ObterEventoAsync(Guid contaId, Guid eventoId, CancellationToken ct) =>
        banco.Eventos.AsNoTracking()
            .Where(evento => evento.Id == eventoId && evento.ContaId == contaId)
            .Select(evento => new EventoDoLink(evento.Id, evento.ContaId, evento.Nome, evento.Data, evento.Situacao == SituacaoEvento.EmAndamento))
            .FirstOrDefaultAsync(ct);

    public Task<LinkPortaria?> ObterPorEventoAsync(Guid eventoId, CancellationToken ct) =>
        banco.LinksPortaria.FirstOrDefaultAsync(link => link.EventoId == eventoId, ct);

    public Task<LinkPortaria?> ObterPorTokenAsync(string token, CancellationToken ct) =>
        banco.LinksPortaria.AsNoTracking().FirstOrDefaultAsync(link => link.Token == token, ct);

    public Task InserirAsync(LinkPortaria link, CancellationToken ct)
    {
        banco.LinksPortaria.Add(link);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(LinkPortaria link, CancellationToken ct)
    {
        banco.LinksPortaria.Remove(link);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<Convite>> ListarConvitesAsync(Guid eventoId, CancellationToken ct) =>
        await banco.Convites.AsNoTracking().Include(convite => convite.Convidados)
            .Where(convite => convite.EventoId == eventoId)
            .ToListAsync(ct);

    public Task<Convite?> ObterConviteAsync(Guid eventoId, Guid conviteId, CancellationToken ct) =>
        banco.Convites.AsNoTracking().Include(convite => convite.Convidados)
            .FirstOrDefaultAsync(convite => convite.Id == conviteId && convite.EventoId == eventoId, ct);

    public Task<Convite?> ObterConvitePorTokenAsync(string token, CancellationToken ct) =>
        banco.Convites.AsNoTracking().Include(convite => convite.Convidados)
            .FirstOrDefaultAsync(convite => convite.Token == token, ct);

    public async Task<IReadOnlyList<PresencaEvento>> ListarPresencasAsync(Guid eventoId, CancellationToken ct) =>
        await banco.PresencasEvento.Where(item => item.EventoId == eventoId).ToListAsync(ct);

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
