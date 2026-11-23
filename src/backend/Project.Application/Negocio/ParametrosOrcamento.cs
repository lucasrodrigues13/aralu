using System.Globalization;
using System.Text.RegularExpressions;
using Project.Domain.Eventos;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

/// <summary>
/// Parâmetros do modelo de orçamento (SPEC-031 §17, ponto 12). A lista é fechada: o que não está aqui
/// fica no texto como a pessoa escreveu. Parâmetro sem dado no lead vira texto vazio.
/// </summary>
public static class ParametrosOrcamento
{
    public const int DiasDeValidade = 30;

    public static readonly IReadOnlyList<string> Lista =
    [
        "{{nome_oportunidade}}",
        "{{tipo_evento}}",
        "{{data_evento}}",
        "{{convidados}}",
        "{{local_cerimonia}}",
        "{{local_recepcao}}",
        "{{valor}}",
        "{{validade}}",
        "{{nome_assessoria}}",
    ];

    public static string Aplicar(string texto, Oportunidade oportunidade, decimal? valor, DateOnly hoje, string? nomeAssessoria)
    {
        var pt = CultureInfo.GetCultureInfo("pt-BR");
        var valores = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["nome_oportunidade"] = oportunidade.Nome,
            ["tipo_evento"] = RotuloTipo(oportunidade.TipoEvento),
            ["data_evento"] = oportunidade.DataPrevista?.ToString("dd/MM/yyyy", pt) ?? "",
            ["convidados"] = oportunidade.QuantidadeConvidados?.ToString(pt) ?? "",
            ["local_cerimonia"] = oportunidade.LocalCerimonia ?? "",
            ["local_recepcao"] = oportunidade.LocalRecepcao ?? "",
            ["valor"] = (valor ?? oportunidade.ValorProposta)?.ToString("C", pt) ?? "",
            ["validade"] = hoje.AddDays(DiasDeValidade).ToString("dd/MM/yyyy", pt),
            ["nome_assessoria"] = nomeAssessoria ?? "",
        };

        // Padrão único de tags ({{nome_tag}}), como no contrato; tag fora da lista fica como está.
        // Texto do editor (HTML): os valores entram escapados.
        var html = HtmlSeguro.EhHtml(texto);
        return Regex.Replace(texto, @"\{\{\s*([A-Za-z0-9_]+)\s*\}\}",
            encontrado => valores.TryGetValue(encontrado.Groups[1].Value, out var valorTexto)
                ? (html ? System.Net.WebUtility.HtmlEncode(valorTexto) : valorTexto)
                : encontrado.Value);
    }

    private static string RotuloTipo(TipoEvento? tipo) => tipo switch
    {
        TipoEvento.Casamento => "Casamento",
        TipoEvento.QuinzeAnos => "15 anos",
        TipoEvento.Aniversario => "Aniversário",
        TipoEvento.Corporativo => "Corporativo",
        TipoEvento.Formatura => "Formatura",
        _ => "",
    };
}
