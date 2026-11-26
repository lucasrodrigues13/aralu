using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Infrastructure.Persistencia;

namespace Project.Api.Conta;

/// <summary>Alcance de eventos do grupo (SPEC-062 §9): "só os eventos em que estou atribuído".</summary>
public static class EscopoAssistente
{
    public static bool Restrito(ClaimsPrincipal usuario) =>
        usuario.IsInRole(Papeis.Assistant) && usuario.FindFirstValue(EquipeEndpoints.ClaimVeTodos) != "true";

    public static Guid? MembroId(ClaimsPrincipal usuario) =>
        Guid.TryParse(usuario.FindFirstValue(ContaClaims.MembroId), out var id) ? id : null;

    /// <summary>Membro (não Dono) do pedido: quem cria um evento fica atribuído a ele.</summary>
    public static Guid? MembroQueCria(ClaimsPrincipal usuario) =>
        usuario.IsInRole(Papeis.Assistant) ? MembroId(usuario) : null;

    /// <summary>Eventos liberados; nulo quando a pessoa vê todos.</summary>
    public static async Task<HashSet<Guid>?> LiberadosAsync(ClaimsPrincipal usuario, AppDbContext banco, CancellationToken ct)
    {
        if (!Restrito(usuario))
        {
            return null;
        }

        if (MembroId(usuario) is not Guid membro)
        {
            return [];
        }

        var ids = await banco.EventosMembros.AsNoTracking()
            .Where(item => item.MembroId == membro)
            .Select(item => item.EventoId)
            .ToListAsync(ct);
        return ids.ToHashSet();
    }

    /// <summary>Filtro de grupo: devolve 404 quando a rota aponta para um evento fora do alcance.</summary>
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
