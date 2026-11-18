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

    [GeneratedRegex(@"^(\d+)\s*(dias?|semanas?|mes(?:es)?)(?:\s+antes)?$", RegexOptions.CultureInvariant)]
    private static partial Regex PrazoTextoRegex();
}
