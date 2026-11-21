namespace Project.Domain.Eventos;

public static class NomeDoEvento
{
    /// <summary>
    /// Nome do evento. Casamento com os dois nomes vira "A &amp; B"; com um só, é o nome informado (SPEC-008 v4).
    /// </summary>
    public static string? Montar(TipoEvento tipo, string? primeiro, string? segundo)
    {
        var a = Comum.Texto.Limpo(primeiro);
        if (tipo != TipoEvento.Casamento)
        {
            return a;
        }

        var b = Comum.Texto.Limpo(segundo);
        if (a is null || b is null)
        {
            return a ?? b;
        }

        return $"{a} & {b}";
    }
}
