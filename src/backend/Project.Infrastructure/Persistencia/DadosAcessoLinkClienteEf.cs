using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Persistencia;

/// <summary>Códigos e sessões do link do cliente (SPEC-063).</summary>
public sealed class DadosAcessoLinkClienteEf(AppDbContext banco) : IDadosAcessoLinkCliente
{
    public async Task<IReadOnlyList<(Guid ClienteId, string Email)>> ListarEmailsClientesAsync(Guid contaId, Guid eventoId, CancellationToken ct)
    {
        var lista = await banco.Clientes.AsNoTracking()
            .Where(cliente => cliente.ContaId == contaId && cliente.Email != "" && cliente.Vinculos.Any(vinculo => vinculo.EventoId == eventoId))
            .OrderBy(cliente => cliente.Nome)
            .Select(cliente => new { cliente.Id, cliente.Email })
            .ToListAsync(ct);
        return lista
            .Where(item => !string.IsNullOrWhiteSpace(item.Email))
            .Select(item => (item.Id, item.Email.Trim()))
            .ToArray();
    }

    public async Task<IReadOnlyList<CodigoAcessoCliente>> ListarCodigosAsync(Guid linkId, DateTimeOffset desde, CancellationToken ct) =>
        await banco.CodigosAcessoCliente.Where(item => item.LinkId == linkId && item.CriadoEm >= desde).ToListAsync(ct);

    public Task<SessaoLinkCliente?> ObterSessaoAsync(Guid linkId, string tokenHash, CancellationToken ct) =>
        banco.SessoesLinkCliente.FirstOrDefaultAsync(item => item.LinkId == linkId && item.TokenHash == tokenHash, ct);

    public Task InserirCodigoAsync(CodigoAcessoCliente codigo, CancellationToken ct)
    {
        banco.CodigosAcessoCliente.Add(codigo);
        return Task.CompletedTask;
    }

    public Task InserirSessaoAsync(SessaoLinkCliente sessao, CancellationToken ct)
    {
        banco.SessoesLinkCliente.Add(sessao);
        return Task.CompletedTask;
    }

    public async Task RemoverAcessosAsync(Guid linkId, CancellationToken ct)
    {
        await banco.SessoesLinkCliente.Where(item => item.LinkId == linkId).ExecuteDeleteAsync(ct);
        await banco.CodigosAcessoCliente.Where(item => item.LinkId == linkId).ExecuteDeleteAsync(ct);
    }

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
