using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Project.Infrastructure.Conta;

public sealed class ConfirmacaoEmailTokenProvider : DataProtectorTokenProvider<ApplicationUser>
{
    public const string Nome = "ConfirmacaoEmail";

    public ConfirmacaoEmailTokenProvider(
        IDataProtectionProvider dataProtectionProvider,
        IOptions<ConfirmacaoEmailTokenProviderOptions> options,
        ILogger<DataProtectorTokenProvider<ApplicationUser>> logger)
        : base(dataProtectionProvider, Microsoft.Extensions.Options.Options.Create<DataProtectionTokenProviderOptions>(options.Value), logger)
    {
    }
}

public sealed class ConfirmacaoEmailTokenProviderOptions : DataProtectionTokenProviderOptions
{
    public ConfirmacaoEmailTokenProviderOptions()
    {
        Name = ConfirmacaoEmailTokenProvider.Nome;
        TokenLifespan = TimeSpan.FromHours(24);
    }
}

public sealed class ConviteAssistenteTokenProvider : DataProtectorTokenProvider<ApplicationUser>
{
    public const string Nome = "ConviteAssistente";

    public ConviteAssistenteTokenProvider(
        IDataProtectionProvider dataProtectionProvider,
        IOptions<ConviteAssistenteTokenProviderOptions> options,
        ILogger<DataProtectorTokenProvider<ApplicationUser>> logger)
        : base(dataProtectionProvider, Microsoft.Extensions.Options.Options.Create<DataProtectionTokenProviderOptions>(options.Value), logger)
    {
    }
}

/// <summary>O convite da assistente vale 7 dias (SPEC-032 §17, ponto 7).</summary>
public sealed class ConviteAssistenteTokenProviderOptions : DataProtectionTokenProviderOptions
{
    public ConviteAssistenteTokenProviderOptions()
    {
        Name = ConviteAssistenteTokenProvider.Nome;
        TokenLifespan = TimeSpan.FromDays(7);
    }
}

public sealed class RedefinicaoSenhaTokenProvider : DataProtectorTokenProvider<ApplicationUser>
{
    public const string Nome = "RedefinicaoSenha";

    public RedefinicaoSenhaTokenProvider(
        IDataProtectionProvider dataProtectionProvider,
        IOptions<RedefinicaoSenhaTokenProviderOptions> options,
        ILogger<DataProtectorTokenProvider<ApplicationUser>> logger)
        : base(dataProtectionProvider, Microsoft.Extensions.Options.Options.Create<DataProtectionTokenProviderOptions>(options.Value), logger)
    {
    }
}

public sealed class RedefinicaoSenhaTokenProviderOptions : DataProtectionTokenProviderOptions
{
    public RedefinicaoSenhaTokenProviderOptions()
    {
        Name = RedefinicaoSenhaTokenProvider.Nome;
        TokenLifespan = TimeSpan.FromHours(1);
    }
}
