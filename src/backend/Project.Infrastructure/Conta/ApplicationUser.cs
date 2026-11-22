using Microsoft.AspNetCore.Identity;

namespace Project.Infrastructure.Conta;

/// <summary>
/// Conta Identity. <see cref="OrganizerId"/> vincula a assistente ao Organizer dono da conta (SPEC-032).
/// Admin e Organizer ficam sem vínculo.
/// </summary>
public sealed class ApplicationUser : IdentityUser
{
    public string? OrganizerId { get; set; }

    public void VincularAoOrganizer(string organizerId)
    {
        if (string.IsNullOrWhiteSpace(organizerId))
        {
            throw new InvalidOperationException("Conta de assistente exige vínculo com um Organizer.");
        }

        if (string.Equals(Id, organizerId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Conta de assistente não pode vincular a si mesma.");
        }

        OrganizerId = organizerId.Trim();
    }
}
