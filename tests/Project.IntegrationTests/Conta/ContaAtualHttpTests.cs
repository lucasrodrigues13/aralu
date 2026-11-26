using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Project.Api.Conta;
using Project.Application.Conta;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062, lote 2.4: quando o filtro global por conta liga.</summary>
public class ContaAtualHttpTests
{
    private static readonly Guid Dona = Guid.Parse("3c1d2e3f-4a5b-4c6d-8e7f-a1b2c3d4e5f6");

    [Fact]
    public void Endpoint_com_login_filtra_pela_conta_do_usuario()
    {
        var contexto = Contexto(exigeLogin: true, Usuario(Papeis.Organizer, Dona.ToString()));

        Assert.Equal(Dona, ContaAtualHttp.De(contexto));
    }

    [Fact]
    public void Endpoint_publico_nao_filtra_mesmo_com_usuario_logado()
    {
        var contexto = Contexto(exigeLogin: false, Usuario(Papeis.Organizer, Dona.ToString()));

        Assert.Null(ContaAtualHttp.De(contexto));
    }

    [Fact]
    public void Endpoint_com_login_mas_marcado_como_anonimo_nao_filtra()
    {
        var contexto = Contexto(exigeLogin: true, Usuario(Papeis.Organizer, Dona.ToString()), anonimo: true);

        Assert.Null(ContaAtualHttp.De(contexto));
    }

    [Fact]
    public void Admin_sem_impersonacao_nao_filtra()
    {
        var contexto = Contexto(exigeLogin: true, Usuario(Papeis.Admin, Guid.NewGuid().ToString()));

        Assert.Null(ContaAtualHttp.De(contexto));
    }

    [Fact]
    public void Admin_impersonando_filtra_pela_conta_impersonada()
    {
        var admin = Usuario(Papeis.Admin, Guid.NewGuid().ToString());
        ((ClaimsIdentity)admin.Identity!).AddClaim(new Claim(ContaClaims.OrganizerId, Dona.ToString()));
        var contexto = Contexto(exigeLogin: true, admin);

        Assert.Equal(Dona, ContaAtualHttp.De(contexto));
    }

    [Fact]
    public void Sem_pedido_http_nao_filtra()
    {
        Assert.Null(ContaAtualHttp.De(null));
    }

    private static ClaimsPrincipal Usuario(string papel, string id) =>
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id), new Claim(ClaimTypes.Role, papel)], "teste"));

    private static DefaultHttpContext Contexto(bool exigeLogin, ClaimsPrincipal usuario, bool anonimo = false)
    {
        var metadados = new List<object>();
        if (exigeLogin)
        {
            metadados.Add(new AuthorizeAttribute());
        }

        if (anonimo)
        {
            metadados.Add(new AllowAnonymousAttribute());
        }

        var contexto = new DefaultHttpContext { User = usuario };
        contexto.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(metadados), "teste"));
        return contexto;
    }
}
