namespace Project.Application.Conta;

public static class ContaClaims
{
    /// <summary>Id do Organizer dono do tenant. Presente no JWT de contas Client.</summary>
    public const string OrganizerId = "organizer_id";

    /// <summary>Id da assistente (tabela Assistentes). Posto a cada pedido, não vem do JWT.</summary>
    public const string AssistenteId = "assistente_id";
}
