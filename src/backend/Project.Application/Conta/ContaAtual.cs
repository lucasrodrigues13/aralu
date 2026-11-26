using System.Security.Claims;

namespace Project.Application.Conta;

/// <summary>
/// Resolve o id da conta a partir dos claims (SPEC-062 Fase 1).
/// Assistente / impersonação Admin: claim organizer_id. Organizer: NameIdentifier.
/// </summary>
public static class ContaAtual
{
    public static string? De(ClaimsPrincipal? usuario)
    {
        if (usuario is null)
        {
            return null;
        }

        var organizerId = usuario.FindFirst(ContaClaims.OrganizerId)?.Value;
        if (!string.IsNullOrWhiteSpace(organizerId))
        {
            return organizerId;
        }

        var id = usuario.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return string.IsNullOrWhiteSpace(id) ? null : id;
    }
}
