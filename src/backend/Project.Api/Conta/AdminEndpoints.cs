using Microsoft.EntityFrameworkCore;
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
            extra.AddClaim(new Claim(ContaClaims.ContaId, dona.Id));
            usuario.AddIdentity(extra);
        }

        await proximo();
    }

    /// <summary>
    /// Contas da plataforma, pelo e-mail de quem a criou (SPEC-062). O id é o da conta: sócios convidados como Dono
    /// não aparecem como conta própria.
    /// </summary>
    private static async Task<IResult> ListarUsuarios(Project.Infrastructure.Persistencia.AppDbContext banco, CancellationToken ct)
    {
        var contas = await banco.Contas.AsNoTracking()
            .Join(banco.Users, conta => conta.DonoUsuarioId, usuario => usuario.Id, (conta, usuario) => new { id = conta.Id.ToString(), email = usuario.Email, papel = Papeis.Organizer })
            .ToListAsync(ct);
        return Results.Ok(contas.OrderBy(item => item.email, StringComparer.OrdinalIgnoreCase));
    }
}
