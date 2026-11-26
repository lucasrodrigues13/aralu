using System.Security.Claims;
using Project.Application.Conta;

namespace Project.Tests.Conta;

public class ContaAtualTests
{
    [Fact]
    public void Organizer_usa_o_name_identifier_como_conta()
    {
        var usuario = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "organizer-1"),
            new Claim(ClaimTypes.Role, Papeis.Organizer),
        ], "teste"));

        Assert.Equal("organizer-1", ContaAtual.De(usuario));
    }

    [Fact]
    public void Assistente_usa_o_organizer_id_quando_presente()
    {
        var usuario = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "assistente-1"),
            new Claim(ContaClaims.OrganizerId, "organizer-9"),
            new Claim(ClaimTypes.Role, Papeis.Assistant),
        ], "teste"));

        Assert.Equal("organizer-9", ContaAtual.De(usuario));
    }

    [Fact]
    public void Sem_claims_de_identidade_devolve_nulo()
    {
        Assert.Null(ContaAtual.De(null));
        Assert.Null(ContaAtual.De(new ClaimsPrincipal(new ClaimsIdentity())));
    }
}
