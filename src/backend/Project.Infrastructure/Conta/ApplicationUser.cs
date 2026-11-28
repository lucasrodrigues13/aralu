using Microsoft.AspNetCore.Identity;

namespace Project.Infrastructure.Conta;

/// <summary>Login Identity. A conta e o tipo da pessoa ficam em MembrosConta (SPEC-062).</summary>
public sealed class ApplicationUser : IdentityUser
{
}
