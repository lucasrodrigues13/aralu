using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Project.Domain.Funil;

/// <summary>Os quatro horários do lead (SPEC-031 §6.7, ponto 1).</summary>
public sealed record QuatroHorarios(TimeOnly? Convite, TimeOnly? Cerimonia, TimeOnly? Recepcao, TimeOnly? Festa)
{
    public bool TemAlgum => Convite is not null || Cerimonia is not null || Recepcao is not null || Festa is not null;
}

/// <summary>
/// Converte o texto livre antigo de "horários" nos quatro campos. Lê trechos como
/// "cerimônia 16h, recepção 18h30, festa 20:00"; trecho com horário e sem palavra-chave é ignorado.
/// </summary>
public static partial class HorariosTexto
{
    public static QuatroHorarios Interpretar(string? texto)
    {
        TimeOnly? convite = null, cerimonia = null, recepcao = null, festa = null;
        if (string.IsNullOrWhiteSpace(texto))
        {
            return new QuatroHorarios(null, null, null, null);
        }

        foreach (var trecho in Separador().Split(SemAcento(texto)))
        {
            var horario = Horario().Match(trecho);
            if (!horario.Success || !int.TryParse(horario.Groups[1].Value, out var hora) || hora > 23)
            {
                continue;
            }

            var minuto = horario.Groups[2].Success ? int.Parse(horario.Groups[2].Value, CultureInfo.InvariantCulture) : 0;
            if (minuto > 59)
            {
                continue;
            }

            var valor = new TimeOnly(hora, minuto);
            if (trecho.Contains("convite", StringComparison.Ordinal))
            {
                convite ??= valor;
            }
            else if (trecho.Contains("cerim", StringComparison.Ordinal))
            {
                cerimonia ??= valor;
            }
            else if (trecho.Contains("recep", StringComparison.Ordinal))
            {
                recepcao ??= valor;
            }
            else if (trecho.Contains("festa", StringComparison.Ordinal) || trecho.Contains("baile", StringComparison.Ordinal))
            {
                festa ??= valor;
            }
        }

        return new QuatroHorarios(convite, cerimonia, recepcao, festa);
    }

    private static string SemAcento(string texto)
    {
        var decomposto = texto.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var saida = new StringBuilder(decomposto.Length);
        foreach (var letra in decomposto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(letra) != UnicodeCategory.NonSpacingMark)
            {
                saida.Append(letra);
            }
        }

        return saida.ToString();
    }

    [GeneratedRegex(@"[,;/|\n]+|\se\s")]
    private static partial Regex Separador();

    [GeneratedRegex(@"(\d{1,2})\s*(?:h|hs|:)\s*(\d{2})?")]
    private static partial Regex Horario();
}
