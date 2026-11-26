using System.Security.Claims;

namespace Project.Application.Conta;

/// <summary>
/// Resolve o id da conta a partir dos claims (SPEC-062).
/// Assistente / impersonação Admin: claim organizer_id. Organizer: NameIdentifier.
/// O id da conta é um Guid (o mesmo valor do id do usuário dono, gerado pelo Identity).
/// </summary>
public static class ContaAtual
{
    public static Guid? De(ClaimsPrincipal? usuario)
    {
        if (usuario is null)
        {
            return null;
        }

        var organizerId = usuario.FindFirst(ContaClaims.OrganizerId)?.Value;
        if (!string.IsNullOrWhiteSpace(organizerId))
        {
            return Guid.TryParse(organizerId, out var daDona) ? daDona : null;
        }

        var id = usuario.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(id, out var proprio) ? proprio : null;
    }
}
