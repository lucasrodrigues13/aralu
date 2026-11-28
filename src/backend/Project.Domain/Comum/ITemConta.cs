namespace Project.Domain.Comum;

/// <summary>
/// Registro que pertence a uma conta (tenant). SPEC-062, RF-110.
/// Toda tabela de negócio carrega o ContaId, inclusive as filhas, para que o filtro por conta
/// não precise passar pelo registro pai.
/// </summary>
public interface ITemConta
{
    Guid ContaId { get; set; }
}
