namespace Project.Domain.Convidados;

/// <summary>Regra do prazo de confirmação de presença (SPEC-054).</summary>
public static class PrazoDoRsvp
{
    /// <summary>
    /// O link expirou quando há prazo, o dia do prazo já passou (vale até o fim do dia) e o convite não tem exceção.
    /// </summary>
    public static bool Expirado(DateOnly? prazo, DateOnly hoje, bool excecao) =>
        prazo is { } limite && hoje > limite && !excecao;

    /// <summary>O prazo do evento já passou (independente de exceções por convite).</summary>
    public static bool Encerrado(DateOnly? prazo, DateOnly hoje) => prazo is { } limite && hoje > limite;
}
