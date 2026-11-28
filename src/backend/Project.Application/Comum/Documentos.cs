namespace Project.Application.Comum;

/// <summary>
/// CPF e CNPJ guardados sem máscara, em maiúsculas (SPEC-034). O CNPJ aceita letras (A-Z e 0-9 nas
/// 12 primeiras posições) e fecha com 2 dígitos verificadores numéricos, pela regra oficial do SERPRO.
/// Cada validador devolve nulo quando o valor não veio, vazio quando não é válido e o documento limpo quando é.
/// </summary>
public static class Documentos
{
    private const int TamanhoCpf = 11;
    private const int TamanhoCnpj = 14;

    /// <summary>Tira pontos, barra, traço e espaços e põe em maiúsculas. Nulo quando sobra nada.</summary>
    public static string? Limpar(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return null;
        }

        var limpo = new string(valor.Where(c => c is >= '0' and <= '9' or >= 'A' and <= 'Z' or >= 'a' and <= 'z').ToArray())
            .ToUpperInvariant();
        return limpo.Length == 0 ? null : limpo;
    }

    public static string? Cpf(string? valor)
    {
        var limpo = Limpar(valor);
        if (limpo is null)
        {
            return null;
        }

        return CpfValido(limpo) ? limpo : "";
    }

    public static string? Cnpj(string? valor)
    {
        var limpo = Limpar(valor);
        if (limpo is null)
        {
            return null;
        }

        return CnpjValido(limpo) ? limpo : "";
    }

    /// <summary>Campo único "CPF ou CNPJ": 11 caracteres é CPF, 14 é CNPJ, o resto não fecha.</summary>
    public static string? CpfOuCnpj(string? valor)
    {
        var limpo = Limpar(valor);
        if (limpo is null)
        {
            return null;
        }

        return limpo.Length switch
        {
            TamanhoCpf => CpfValido(limpo) ? limpo : "",
            TamanhoCnpj => CnpjValido(limpo) ? limpo : "",
            _ => "",
        };
    }

    public static bool CpfValido(string limpo)
    {
        if (limpo.Length != TamanhoCpf || !limpo.All(char.IsAsciiDigit) || limpo.Distinct().Count() == 1)
        {
            return false;
        }

        return DigitoCpf(limpo, 9) == limpo[9] - '0' && DigitoCpf(limpo, 10) == limpo[10] - '0';
    }

    public static bool CnpjValido(string limpo)
    {
        if (limpo.Length != TamanhoCnpj
            || !limpo.All(c => c is >= '0' and <= '9' or >= 'A' and <= 'Z')
            || !char.IsAsciiDigit(limpo[12])
            || !char.IsAsciiDigit(limpo[13])
            || limpo.Distinct().Count() == 1)
        {
            return false;
        }

        return DigitoCnpj(limpo, 12) == limpo[12] - '0' && DigitoCnpj(limpo, 13) == limpo[13] - '0';
    }

    /// <summary>Dígito verificador do CNPJ sobre os primeiros <paramref name="quantos"/> caracteres.</summary>
    public static int DigitoCnpj(string limpo, int quantos)
    {
        var soma = 0;
        var peso = 2;
        for (var i = quantos - 1; i >= 0; i--)
        {
            soma += (limpo[i] - 48) * peso;
            peso = peso == 9 ? 2 : peso + 1;
        }

        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    private static int DigitoCpf(string limpo, int quantos)
    {
        var soma = 0;
        for (var i = 0; i < quantos; i++)
        {
            soma += (limpo[i] - '0') * (quantos + 1 - i);
        }

        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
