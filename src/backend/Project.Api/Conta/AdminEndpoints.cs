using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Project.Application.Conta;
using Project.Infrastructure.Conta;

namespace Project.Api.Conta;

/// <summary>
/// Início Admin: lista de usuários e acesso total a uma conta organizer escolhida.
/// O front manda o cabeçalho <see cref="CabecalhoConta"/>; o middleware valida e faz o admin operar como a dona.
/// </summary>
public static class AdminEndpoints
{
    public const string CabecalhoConta = "X-Aralu-Conta";

    public static void Mapear(WebApplication app)
    {
        app.MapGet("/api/v1/admin/usuarios", ListarUsuarios)
            .RequireAuthorization(policy => policy.RequireRole(Papeis.Admin));
    }

    /// <summary>Se o admin escolheu uma conta organizer, ele passa a ter o papel e o escopo dela neste pedido.</summary>
    public static async Task AplicarContaDoAdmin(HttpContext http, Func<Task> proximo)
    {
        var usuario = http.User;
        if (usuario.Identity?.IsAuthenticated == true
            && usuario.IsInRole(Papeis.Admin)
            && http.Request.Headers.TryGetValue(CabecalhoConta, out var valor)
            && !string.IsNullOrWhiteSpace(valor.ToString()))
        {
            var usuarios = http.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
            var dona = await usuarios.FindByIdAsync(valor.ToString().Trim());
            if (dona is null || !await usuarios.IsInRoleAsync(dona, Papeis.Organizer))
            {
                http.Response.StatusCode = StatusCodes.Status400BadRequest;
                await http.Response.WriteAsJsonAsync(new ErroResposta("conta", "A conta escolhida não existe."), http.RequestAborted);
                return;
            }

            var extra = new ClaimsIdentity();
            extra.AddClaim(new Claim(ClaimTypes.Role, Papeis.Organizer));
            extra.AddClaim(new Claim(ContaClaims.OrganizerId, dona.Id));
            usuario.AddIdentity(extra);
        }

        await proximo();
    }

    private static async Task<IResult> ListarUsuarios(UserManager<ApplicationUser> usuarios, CancellationToken ct)
    {
        var donas = await usuarios.GetUsersInRoleAsync(Papeis.Organizer);
        return Results.Ok(donas
            .OrderBy(u => u.Email, StringComparer.OrdinalIgnoreCase)
            .Select(u => new { id = u.Id, email = u.Email, papel = Papeis.Organizer }));
    }
}
