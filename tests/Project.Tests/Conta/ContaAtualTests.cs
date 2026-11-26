using System.Security.Claims;
using Project.Application.Conta;

namespace Project.Tests.Conta;

public class ContaAtualTests
{
    private static readonly Guid Organizer = Guid.Parse("0f2b6c1e-3a4d-4c5e-8f90-112233445566");
    private static readonly Guid OutraDona = Guid.Parse("7a8b9c0d-1e2f-4a3b-9c4d-5e6f70819203");

    [Fact]
    public void Organizer_usa_o_name_identifier_como_conta()
    {
        var usuario = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, Organizer.ToString()),
            new Claim(ClaimTypes.Role, Papeis.Organizer),
        ], "teste"));

        Assert.Equal(Organizer, ContaAtual.De(usuario));
    }

    [Fact]
    public void Assistente_usa_o_organizer_id_quando_presente()
    {
        var usuario = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ContaClaims.OrganizerId, OutraDona.ToString()),
            new Claim(ClaimTypes.Role, Papeis.Assistant),
        ], "teste"));

        Assert.Equal(OutraDona, ContaAtual.De(usuario));
    }

    [Fact]
    public void Sem_claims_de_identidade_devolve_nulo()
    {
        Assert.Null(ContaAtual.De(null));
        Assert.Null(ContaAtual.De(new ClaimsPrincipal(new ClaimsIdentity())));
    }

    [Fact]
    public void Id_que_nao_e_guid_devolve_nulo()
    {
        var usuario = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "nao-e-guid"),
        ], "teste"));

        Assert.Null(ContaAtual.De(usuario));
    }
}
