using Microsoft.AspNetCore.Authorization;
using Project.Application.Conta;

namespace Project.Api.Conta;

/// <summary>
/// Conta do pedido para o filtro global do banco (SPEC-062, lote 2.4).
/// Só existe em endpoint que exige login. Endpoint público (link do cliente, portaria, proposta, RSVP,
/// login, cadastro) acha o registro pelo token e não filtra por conta, mesmo que o navegador mande um login.
/// Admin sem impersonação não tem conta: vê todas, como hoje (RF-040).
/// </summary>
public sealed class ContaAtualHttp(IHttpContextAccessor http) : IContaAtual
{
    public Guid? Id => De(http.HttpContext);

    public static Guid? De(HttpContext? contexto)
    {
        if (contexto is null)
        {
            return null;
        }

        var endpoint = contexto.GetEndpoint();
        var exigeLogin = endpoint?.Metadata.GetMetadata<IAuthorizeData>() is not null
            && endpoint.Metadata.GetMetadata<IAllowAnonymous>() is null;
        if (!exigeLogin)
        {
            return null;
        }

        var usuario = contexto.User;
        if (usuario.IsInRole(Papeis.Admin) && usuario.FindFirst(ContaClaims.ContaId) is null)
        {
            return null;
        }

        return ContaAtual.De(usuario);
    }
}
