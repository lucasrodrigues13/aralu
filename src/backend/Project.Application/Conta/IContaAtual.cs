namespace Project.Application.Conta;

/// <summary>
/// Conta (tenant) do pedido atual. Hoje resolve pelo claim organizer_id ou pelo id do usuário;
/// na SPEC-062 Fase 2 passa a ser o Guid de Contas, via filtro global do EF.
/// </summary>
public interface IContaAtual
{
    /// <summary>Id da conta do usuário autenticado, ou null se não houver.</summary>
    string? Id { get; }
}
