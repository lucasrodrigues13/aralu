namespace Project.Application.Conta;

public static class ContaClaims
{
    /// <summary>Id da conta (assessoria) do login. Vem do JWT e é confirmado em MembrosConta a cada pedido.</summary>
    public const string ContaId = "conta_id";

    /// <summary>Id do membro (tabela MembrosConta). Posto a cada pedido, não vem do JWT.</summary>
    public const string MembroId = "membro_id";
}
