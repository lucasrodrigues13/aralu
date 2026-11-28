using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Convidados;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Persistencia;

/// <summary>Acesso a dados do link do cliente (SPEC-046).</summary>
public sealed class DadosLinkClienteEf(AppDbContext banco) : IDadosLinkCliente
{
    public async Task<IReadOnlyList<Convite>> ListarConvitesAsync(Guid eventoId, CancellationToken ct) =>
        await banco.Convites.AsNoTracking().Include(convite => convite.Convidados)
            .Where(convite => convite.EventoId == eventoId)
            .ToListAsync(ct);

    public Task<Convite?> ObterConviteAsync(Guid eventoId, Guid conviteId, CancellationToken ct) =>
        banco.Convites.Include(convite => convite.Convidados)
            .FirstOrDefaultAsync(convite => convite.Id == conviteId && convite.EventoId == eventoId, ct);

    public async Task InserirConviteAsync(Convite convite, CancellationToken ct)
    {
        banco.Convites.Add(convite);
        await banco.SaveChangesAsync(ct);
    }

    public Task IncluirConvidadoAsync(Convidado convidado, CancellationToken ct)
    {
        banco.Convidados.Add(convidado);
        return Task.CompletedTask;
    }

    public Task RemoverConvidadoAsync(Convidado convidado, CancellationToken ct)
    {
        banco.Convidados.Remove(convidado);
        return Task.CompletedTask;
    }

    public Task<EventoDoLink?> ObterEventoAsync(Guid contaId, Guid eventoId, CancellationToken ct) =>
        banco.Eventos.AsNoTracking()
            .Where(evento => evento.Id == eventoId && evento.ContaId == contaId)
            .Select(evento => new EventoDoLink(
                evento.Id,
                evento.ContaId,
                evento.Nome,
                evento.Data,
                evento.Situacao == SituacaoEvento.EmAndamento,
                evento.PrazoRsvp,
                evento.DataEnvioConvites))
            .FirstOrDefaultAsync(ct);

    public Task<LinkCliente?> ObterPorEventoAsync(Guid eventoId, CancellationToken ct) =>
        banco.LinksCliente.FirstOrDefaultAsync(link => link.EventoId == eventoId, ct);

    public Task<LinkCliente?> ObterPorTokenAsync(string token, CancellationToken ct) =>
        banco.LinksCliente.AsNoTracking().FirstOrDefaultAsync(link => link.Token == token, ct);

    public Task InserirAsync(LinkCliente link, CancellationToken ct)
    {
        banco.LinksCliente.Add(link);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(LinkCliente link, CancellationToken ct)
    {
        banco.LinksCliente.Remove(link);
        return Task.CompletedTask;
    }

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
