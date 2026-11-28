using System.Security.Claims;

namespace Project.Application.Conta;

/// <summary>
/// Resolve o id da conta a partir dos claims (SPEC-062).
/// Claim conta_id (membro da conta ou Admin impersonando); sem ele, o próprio id do usuário (o Dono que criou a conta).
/// </summary>
public static class ContaAtual
{
    public static Guid? De(ClaimsPrincipal? usuario)
    {
        if (usuario is null)
        {
            return null;
        }

        var contaId = usuario.FindAll(ContaClaims.ContaId).LastOrDefault()?.Value;
        if (!string.IsNullOrWhiteSpace(contaId))
        {
            return Guid.TryParse(contaId, out var conta) ? conta : null;
        }

        var id = usuario.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(id, out var proprio) ? proprio : null;
    }
}
