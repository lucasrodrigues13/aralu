using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Domain.Equipe;
using Project.Infrastructure.Persistencia;

namespace Project.Api.Conta;

/// <summary>"Só os dela" (SPEC-032 §6.4): a assistente restrita só enxerga os eventos em que a dona a marcou.</summary>
public static class EscopoAssistente
{
    public static bool Restrito(ClaimsPrincipal usuario) =>
        usuario.IsInRole(Papeis.Assistant) && usuario.FindFirstValue(AssistenteEndpoints.ClaimSomenteDela) == "true";

    public static Guid? AssistenteId(ClaimsPrincipal usuario) =>
        Guid.TryParse(usuario.FindFirstValue(ContaClaims.AssistenteId), out var id) ? id : null;

    /// <summary>Eventos liberados; nulo quando a pessoa vê todos.</summary>
    public static async Task<HashSet<Guid>?> LiberadosAsync(ClaimsPrincipal usuario, AppDbContext banco, CancellationToken ct)
    {
        if (!Restrito(usuario) || AssistenteId(usuario) is not Guid assistente)
        {
            return null;
        }

        var ids = await banco.EventosAssistentes.AsNoTracking()
            .Where(item => item.AssistenteId == assistente)
            .Select(item => item.EventoId)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    /// <summary>Filtro de grupo: devolve 404 quando a rota aponta para um evento que não é dela.</summary>
    public static async ValueTask<object?> Filtro(EndpointFilterInvocationContext contexto, EndpointFilterDelegate proximo)
    {
        var http = contexto.HttpContext;
        if (!Restrito(http.User)
            || http.Request.RouteValues["id"] is not string texto
            || !Guid.TryParse(texto, out var id))
        {
            return await proximo(contexto);
        }

        var caminho = http.Request.Path.Value ?? "";
        var banco = http.RequestServices.GetRequiredService<AppDbContext>();
        var ct = http.RequestAborted;
        Guid? eventoId;
        if (caminho.StartsWith("/api/v1/eventos/", StringComparison.Ordinal))
        {
            eventoId = id;
        }
        else if (caminho.StartsWith("/api/v1/tarefas/", StringComparison.Ordinal))
        {
            eventoId = await banco.Tarefas.AsNoTracking().Where(item => item.Id == id).Select(item => (Guid?)item.EventoId).FirstOrDefaultAsync(ct);
        }
        else if (caminho.StartsWith("/api/v1/convites/", StringComparison.Ordinal))
        {
            eventoId = await banco.Convites.AsNoTracking().Where(item => item.Id == id).Select(item => (Guid?)item.EventoId).FirstOrDefaultAsync(ct);
        }
        else if (caminho.StartsWith("/api/v1/convidados/", StringComparison.Ordinal))
        {
            eventoId = await banco.Convidados.AsNoTracking()
                .Where(item => item.Id == id)
                .Join(banco.Convites, convidado => convidado.ConviteId, convite => convite.Id, (convidado, convite) => (Guid?)convite.EventoId)
                .FirstOrDefaultAsync(ct);
        }
        else
        {
            return await proximo(contexto);
        }

        if (eventoId is null)
        {
            return await proximo(contexto);
        }

        var liberados = await LiberadosAsync(http.User, banco, ct);
        return liberados is null || liberados.Contains(eventoId.Value)
            ? await proximo(contexto)
            : Results.Json(new ErroResposta(Codigos.Indisponivel, "Indisponível."), statusCode: StatusCodes.Status404NotFound);
    }
}
