using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Contratos;

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
        // Tabelas legado (SPEC-030 v3): sem uso, mas apontam para o contrato; limpa as linhas dele para a exclusão passar.
        await banco.Set<ContratoDoModelo>().Where(item => item.ContratoId == contrato.Id).ExecuteDeleteAsync(ct);
        await banco.Set<ContratoDoEvento>().Where(item => item.ContratoId == contrato.Id).ExecuteDeleteAsync(ct);
        await banco.Set<LinkLeituraContrato>().Where(item => item.ContratoId == contrato.Id).ExecuteDeleteAsync(ct);
        banco.Set<ContratoConta>().Remove(contrato);
    }

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);
}
