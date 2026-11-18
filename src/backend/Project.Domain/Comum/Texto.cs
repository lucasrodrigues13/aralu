using System.Globalization;
using System.Text;

namespace Project.Domain.Comum;

public static class Texto
{
    public static string? Limpo(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return null;
        }

        return valor.Trim();
    }

    /// <summary>Comparação sem diferenciar maiúsculas e acentos (SPEC-012 §8.5).</summary>
    public static string ChaveComparacao(string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return "";
        }

        var formD = valor.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        foreach (var c in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(char.ToLowerInvariant(c));
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    public static bool Vazio(string? valor) => string.IsNullOrWhiteSpace(valor);

    public static bool EmailValido(string? valor)
    {
        var texto = Limpo(valor);
        if (texto is null || texto.Contains(' '))
        {
            return false;
        }

        var arroba = texto.IndexOf('@');
        if (arroba <= 0 || arroba != texto.LastIndexOf('@'))
        {
            return false;
        }

        var dominio = texto[(arroba + 1)..];
        return dominio.Contains('.') && !dominio.StartsWith('.') && !dominio.EndsWith('.');
    }
}
