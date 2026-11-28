namespace Project.Application.Comum;

public static class Mascaras
{
    public static string? Cep(string? valor)
    {
        var digitos = SoDigitos(valor);
        if (digitos is null)
        {
            return null;
        }

        if (digitos.Length != 8)
        {
            return "";
        }

        return $"{digitos[..5]}-{digitos[5..]}";
    }

    /// <summary>
    /// Celular brasileiro com DDD: aceita 10 ou 11 dígitos (com ou sem o 55 na frente)
    /// e devolve "(DD) 9XXXX-XXXX" ou "(DD) XXXX-XXXX". Vazio quando não fecha; nulo quando não veio.
    /// </summary>
    public static string? Celular(string? valor)
    {
        var digitos = SoDigitos(valor);
        if (digitos is null)
        {
            return null;
        }

        if (digitos.Length is 12 or 13 && digitos.StartsWith("55", StringComparison.Ordinal))
        {
            digitos = digitos[2..];
        }

        return digitos.Length switch
        {
            11 => $"({digitos[..2]}) {digitos[2..7]}-{digitos[7..]}",
            10 => $"({digitos[..2]}) {digitos[2..6]}-{digitos[6..]}",
            _ => "",
        };
    }

    public static string? SoDigitos(string? valor)
    {
        var texto = valor?.Trim();
        if (string.IsNullOrEmpty(texto))
        {
            return null;
        }

        var digitos = new string(texto.Where(char.IsDigit).ToArray());
        return digitos.Length == 0 ? null : digitos;
    }
}
