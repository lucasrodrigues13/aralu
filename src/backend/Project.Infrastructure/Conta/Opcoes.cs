namespace Project.Infrastructure.Conta;

public sealed class JwtOpcoes
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "aralu";
    public string Audience { get; set; } = "aralu";
    public int ExpiryHours { get; set; } = 8;
}

public sealed class EmailOpcoes
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string From { get; set; } = "";
    public bool StartTls { get; set; } = true;
}

public sealed class BootstrapOpcoes
{
    public bool Enabled { get; set; }
    public string AdminEmail { get; set; } = "";
    public string AdminPassword { get; set; } = "";
}
