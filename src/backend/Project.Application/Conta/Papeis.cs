namespace Project.Application.Conta;

public static class Papeis
{
    public const string Admin = "Admin";
    public const string Organizer = "Organizer";
    public const string Client = "Client";
    public const string Assistant = "Assistant";

    /// <summary>Quem opera a conta no dia a dia: a dona e as assistentes (SPEC-032).</summary>
    public static readonly string[] Equipe = [Organizer, Assistant];
}
