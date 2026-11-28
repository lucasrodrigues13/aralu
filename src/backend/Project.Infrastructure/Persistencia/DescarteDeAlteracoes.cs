using Microsoft.EntityFrameworkCore;

namespace Project.Infrastructure.Persistencia;

public static class DescarteDeAlteracoes
{
    /// <summary>
    /// Desfaz no change tracker tudo o que ainda não foi gravado. Use depois de uma falha num laço ou fluxo que
    /// reaproveita o mesmo contexto: sem isso, o próximo SaveChanges tenta gravar de novo o que falhou
    /// (e falha de novo), ou grava pela metade o que deu errado.
    /// </summary>
    public static void DescartarAlteracoes(this DbContext banco)
    {
        foreach (var entrada in banco.ChangeTracker.Entries().ToList())
        {
            switch (entrada.State)
            {
                case EntityState.Added:
                    entrada.State = EntityState.Detached;
                    break;
                case EntityState.Modified:
                case EntityState.Deleted:
                    entrada.CurrentValues.SetValues(entrada.OriginalValues);
                    entrada.State = EntityState.Unchanged;
                    break;
            }
        }
    }
}
