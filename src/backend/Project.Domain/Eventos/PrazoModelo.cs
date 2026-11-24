using System.Globalization;
using System.Text.RegularExpressions;

namespace Project.Domain.Eventos;

/// <summary>
/// Converte e exibe o prazo da tarefa do modelo (dias antes do evento).
/// Mês = 30 dias; semana = 7 dias (SPEC-012 §8.1).
/// </summary>
public static partial class PrazoModelo
{
    public const int MaximoNaUnidade = 999;

    private static readonly Regex PrazoTexto = PrazoTextoRegex();

    public enum Unidade
    {
        Dias = 0,
        Semanas = 1,
        Meses = 2,
        NoDia = 3,
        SemPrazo = 4,
    }

    public static int? ParaDias(int? quantidade, Unidade unidade)
    {
        return unidade switch
        {
            Unidade.SemPrazo => null,
            Unidade.NoDia => 0,
            Unidade.Dias => quantidade,
            Unidade.Semanas => quantidade is int s ? s * 7 : null,
            Unidade.Meses => quantidade is int m ? m * 30 : null,
            _ => null,
        };
    }

    public static string? Validar(int? quantidade, Unidade unidade)
    {
        if (unidade is Unidade.SemPrazo or Unidade.NoDia)
        {
            return null;
        }

        if (quantidade is null)
        {
            return "Informe o prazo.";
        }

        if (quantidade is < 0 or > MaximoNaUnidade)
        {
            return "Use um número inteiro de 0 a 999.";
        }

        return null;
    }

    public static string Exibir(int? diasAntes)
    {
        if (diasAntes is null)
        {
            return "Sem prazo";
        }

        if (diasAntes == 0)
        {
            return "No dia do evento";
        }

        var dias = diasAntes.Value;
        if (dias % 30 == 0)
        {
            var meses = dias / 30;
            return meses == 1 ? "1 mês antes" : $"{meses} meses antes";
        }

        if (dias % 7 == 0)
        {
            var semanas = dias / 7;
            return semanas == 1 ? "1 semana antes" : $"{semanas} semanas antes";
        }

        return dias == 1 ? "1 dia antes" : $"{dias} dias antes";
    }

    /// <summary>
    /// Decompõe dias gravados na unidade preferida para o formulário (meses → semanas → dias).
    /// </summary>
    public static (int? Quantidade, Unidade Unidade) DeDias(int? diasAntes)
    {
        if (diasAntes is null)
        {
            return (null, Unidade.SemPrazo);
        }

        if (diasAntes == 0)
        {
            return (null, Unidade.NoDia);
        }

        var dias = diasAntes.Value;
        if (dias % 30 == 0)
        {
            return (dias / 30, Unidade.Meses);
        }

        if (dias % 7 == 0)
        {
            return (dias / 7, Unidade.Semanas);
        }

        return (dias, Unidade.Dias);
    }

    /// <summary>
    /// Lê "30 dias", "6 semanas", "2 meses", "no dia" (com ou sem "antes" / "do evento").
    /// Retorna false se o texto não for reconhecido.
    /// </summary>
    public static bool TentarLer(string? texto, out int? diasAntes)
    {
        diasAntes = null;
        var limpo = texto?.Trim();
        if (string.IsNullOrEmpty(limpo))
        {
            return false;
        }

        var normalizado = limpo.ToLowerInvariant()
            .Replace("é", "e", StringComparison.Ordinal)
            .Replace("ê", "e", StringComparison.Ordinal);

        if (normalizado is "no dia" or "no dia do evento")
        {
            diasAntes = 0;
            return true;
        }

        var match = PrazoTexto.Match(normalizado);
        if (!match.Success)
        {
            return false;
        }

        if (!int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var qtd)
            || qtd is < 0 or > MaximoNaUnidade)
        {
            return false;
        }

        var unidade = match.Groups[2].Value;
        diasAntes = unidade switch
        {
            "dia" or "dias" => ParaDias(qtd, Unidade.Dias),
            "semana" or "semanas" => ParaDias(qtd, Unidade.Semanas),
            "mes" or "meses" => ParaDias(qtd, Unidade.Meses),
            _ => null,
        };
        return true;
    }

    /// <summary>
    /// Lê o prazo da SPEC-012 v3 §8.6: "6 semanas" ou "6 semanas antes", "2 semanas depois", "no dia" e, quando
    /// <paramref name="aceitaData"/>, uma data ("15/03/2027" ou "2027-03-15"). Devolve o deslocamento relativo
    /// (negativo = antes) ou a data. Falso se o texto não for reconhecido.
    /// </summary>
    public static bool TentarLerPrazo(string? texto, bool aceitaData, out int? relativo, out DateOnly? data)
    {
        relativo = null;
        data = null;
        var limpo = texto?.Trim();
        if (string.IsNullOrEmpty(limpo))
        {
            return false;
        }

        if (aceitaData && TentarLerData(limpo, out var exata))
        {
            data = exata;
            return true;
        }

        var normalizado = Normalizar(limpo);
        if (normalizado is "no dia" or "no dia do evento" or "dia do evento" or "na data do evento")
        {
            relativo = 0;
            return true;
        }

        var match = PrazoRelativoRegex().Match(normalizado);
        if (!match.Success
            || !int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var qtd)
            || qtd is < 0 or > MaximoNaUnidade)
        {
            return false;
        }

        var dias = match.Groups[2].Value switch
        {
            "dia" or "dias" => qtd,
            "semana" or "semanas" => qtd * 7,
            _ => qtd * 30,
        };
        relativo = match.Groups[3].Value == "depois" ? dias : -dias;
        return true;
    }

    /// <summary>Exibe o deslocamento relativo: "6 semanas antes", "2 semanas depois", "No dia do evento".</summary>
    public static string ExibirRelativo(int? deslocamento)
    {
        if (deslocamento is null)
        {
            return "Sem prazo";
        }

        if (deslocamento == 0)
        {
            return "No dia do evento";
        }

        var sentido = deslocamento < 0 ? "antes" : "depois";
        var dias = Math.Abs(deslocamento.Value);
        if (dias % 30 == 0)
        {
            var meses = dias / 30;
            return meses == 1 ? $"1 mês {sentido}" : $"{meses} meses {sentido}";
        }

        if (dias % 7 == 0)
        {
            var semanas = dias / 7;
            return semanas == 1 ? $"1 semana {sentido}" : $"{semanas} semanas {sentido}";
        }

        return dias == 1 ? $"1 dia {sentido}" : $"{dias} dias {sentido}";
    }

    private static readonly string[] FormatosData = ["dd/MM/yyyy", "d/M/yyyy", "dd/MM/yy", "d/M/yy", "yyyy-MM-dd"];

    public static bool TentarLerData(string texto, out DateOnly data) =>
        DateOnly.TryParseExact(
            texto.Trim(),
            FormatosData,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out data);

    private static string Normalizar(string texto) =>
        texto.ToLowerInvariant()
            .Replace("é", "e", StringComparison.Ordinal)
            .Replace("ê", "e", StringComparison.Ordinal)
            .Trim();

    [GeneratedRegex(@"^(\d+)\s*(dias?|semanas?|mes(?:es)?)(?:\s+antes)?$", RegexOptions.CultureInvariant)]
    private static partial Regex PrazoTextoRegex();

    [GeneratedRegex(@"^(\d+)\s*(dias?|semanas?|mes(?:es)?)(?:\s+(antes|depois))?(?:\s+do\s+evento)?$", RegexOptions.CultureInvariant)]
    private static partial Regex PrazoRelativoRegex();
}
