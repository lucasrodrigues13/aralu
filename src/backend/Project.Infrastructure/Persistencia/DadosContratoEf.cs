using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Contratos;

namespace Project.Infrastructure.Persistencia;

public sealed class DadosContratoEf(AppDbContext banco) : IDadosContrato
{
    public async Task<IReadOnlyList<ContratoConta>> ListarAsync(Guid contaId, CancellationToken ct) =>
        await banco.Set<ContratoConta>().Where(item => item.ContaId == contaId).ToListAsync(ct);

    public Task<ContratoConta?> ObterAsync(Guid contaId, Guid id, CancellationToken ct) =>
        banco.Set<ContratoConta>().FirstOrDefaultAsync(item => item.Id == id && item.ContaId == contaId, ct);

    public Task InserirAsync(ContratoConta contrato, CancellationToken ct)
    {
        banco.Set<ContratoConta>().Add(contrato);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(ContratoConta contrato, CancellationToken ct)
    {
        banco.Set<ContratoConta>().Remove(contrato);
        return Task.CompletedTask;
    }

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
