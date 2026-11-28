namespace Project.Infrastructure.Conta;

public sealed class JwtOpcoes
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "aralu";
    public string Audience { get; set; } = "aralu";
    public int ExpiryHours { get; set; } = 8;

    /// <summary>A partir desta data, token sem o claim aralu_stamp é recusado (A07-001). Nulo: aceita até vencer.</summary>
    public DateTimeOffset? StampObrigatorioDesde { get; set; }
}

public sealed class EmailOpcoes
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string From { get; set; } = "";
    public bool StartTls { get; set; } = true;

    // OAuth2 (Entra ID, client credentials). Quando TenantId, ClientId e ClientSecret estão
    // preenchidos, o envio usa token e ignora Password.
    public string TenantId { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";

    public bool UsaOAuth => !string.IsNullOrWhiteSpace(TenantId)
        && !string.IsNullOrWhiteSpace(ClientId)
        && !string.IsNullOrWhiteSpace(ClientSecret);
}

public sealed class BootstrapOpcoes
{
    public bool Enabled { get; set; }
    public string AdminEmail { get; set; } = "";
    public string AdminPassword { get; set; } = "";
}
