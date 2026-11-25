using System.Globalization;
using System.Text.RegularExpressions;
using Project.Domain.Eventos;
using Project.Domain.Funil;
using Project.Domain.Perfil;

namespace Project.Application.Negocio;

/// <summary>
/// Parâmetros do modelo de orçamento (SPEC-031 §17, ponto 12; 17 tags desde a SPEC-061). A lista é fechada: o que
/// não está aqui fica no texto como a pessoa escreveu. Parâmetro sem dado no lead vira texto vazio.
/// </summary>
public static partial class ParametrosOrcamento
{
    public const int DiasDeValidade = 30;

    public static readonly IReadOnlyList<string> Lista =
    [
        "{{nome_oportunidade}}",
        "{{nome_contratante}}",
        "{{tipo_evento}}",
        "{{data_evento}}",
        "{{hora_evento}}",
        "{{convidados}}",
        "{{local_cerimonia}}",
        "{{local_recepcao}}",
        "{{endereco_cerimonia}}",
        "{{endereco_recepcao}}",
        "{{valor}}",
        "{{validade}}",
        "{{servicos_contratados}}",
        "{{forma_pagamento}}",
        "{{nome_assessoria}}",
        "{{telefone_assessoria}}",
        "{{link_whatsapp}}",
    ];

    /// <summary>Exemplos usados no Live Preview (SPEC-061).</summary>
    public static readonly IReadOnlyDictionary<string, string> Exemplos = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["nome_oportunidade"] = "Ana e Pedro",
        ["nome_contratante"] = "Ana Souza",
        ["tipo_evento"] = "Casamento",
        ["data_evento"] = "12/09/2027",
        ["hora_evento"] = "16:30",
        ["convidados"] = "180",
        ["local_cerimonia"] = "Igreja Nossa Senhora do Brasil",
        ["local_recepcao"] = "Casa Fasano",
        ["endereco_cerimonia"] = "Praça Nossa Senhora do Brasil, 1, São Paulo",
        ["endereco_recepcao"] = "Rua Vittorio Fasano, 88, São Paulo",
        ["valor"] = "R$ 8.500,00",
        ["validade"] = "30/12/2026",
        ["servicos_contratados"] = "Assessoria completa",
        ["forma_pagamento"] = "Entrada de R$ 2.500,00 e 6 parcelas de R$ 1.000,00",
        ["nome_assessoria"] = "Minha Assessoria",
        ["telefone_assessoria"] = "(11) 98888-7777",
        ["link_whatsapp"] = "https://wa.me/5511988887777",
    };

    public static string Aplicar(string texto, Oportunidade oportunidade, decimal? valor, DateOnly hoje, PerfilAssessoria? perfil) =>
        Trocar(texto, Valores(oportunidade, valor, hoje, perfil, null), HtmlSeguro.EhHtml(texto));

    /// <summary>Valores das tags de dados para um lead. <paramref name="parcelas"/> só existe depois do orçamento criado.</summary>
    public static Dictionary<string, string> Valores(
        Oportunidade oportunidade,
        decimal? valor,
        DateOnly validade,
        PerfilAssessoria? perfil,
        IReadOnlyList<ParcelaOrcamentoLeitura>? parcelas,
        bool validadeJaCalculada = false)
    {
        var pt = CultureInfo.GetCultureInfo("pt-BR");
        var hora = oportunidade.HoraCerimonia ?? oportunidade.HoraRecepcao ?? oportunidade.HoraFesta;
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["nome_oportunidade"] = oportunidade.Nome,
            ["nome_contratante"] = oportunidade.ContratanteNome ?? "",
            ["tipo_evento"] = RotuloTipo(oportunidade.TipoEvento),
            ["data_evento"] = oportunidade.DataPrevista?.ToString("dd/MM/yyyy", pt) ?? "",
            ["hora_evento"] = hora?.ToString("HH:mm", pt) ?? "",
            ["convidados"] = oportunidade.QuantidadeConvidados?.ToString(pt) ?? "",
            ["local_cerimonia"] = oportunidade.LocalCerimonia ?? "",
            ["local_recepcao"] = oportunidade.LocalRecepcao ?? "",
            ["endereco_cerimonia"] = Endereco(oportunidade.EnderecoCerimonia, oportunidade.NumeroCerimonia, oportunidade.BairroCerimonia),
            ["endereco_recepcao"] = Endereco(oportunidade.EnderecoRecepcao, oportunidade.NumeroRecepcao, oportunidade.BairroRecepcao, oportunidade.CidadeRecepcao),
            ["valor"] = (valor ?? oportunidade.ValorProposta)?.ToString("C", pt) ?? "",
            ["validade"] = (validadeJaCalculada ? validade : validade.AddDays(DiasDeValidade)).ToString("dd/MM/yyyy", pt),
            ["servicos_contratados"] = oportunidade.ServicoProduto ?? "",
            ["forma_pagamento"] = FormaPagamento(parcelas, pt),
            ["nome_assessoria"] = perfil?.NomeEmpresa ?? "",
            ["telefone_assessoria"] = perfil?.Celular ?? "",
            ["link_whatsapp"] = LinkWhatsApp(perfil?.Celular) ?? "",
        };
    }

    /// <summary>Troca as tags conhecidas; as outras ficam como estão. Em HTML os valores entram escapados.</summary>
    public static string Trocar(string texto, IReadOnlyDictionary<string, string> valores, bool html) =>
        Tag().Replace(texto, encontrado => valores.TryGetValue(encontrado.Groups[1].Value, out var valorTexto)
            ? (html ? System.Net.WebUtility.HtmlEncode(valorTexto) : valorTexto)
            : encontrado.Value);

    /// <summary>Link wa.me a partir do celular (Brasil por padrão). Nulo se não houver número.</summary>
    public static string? LinkWhatsApp(string? celular)
    {
        var digitos = new string((celular ?? "").Where(char.IsAsciiDigit).ToArray());
        if (digitos.Length < 10)
        {
            return null;
        }

        return "https://wa.me/" + (digitos.Length <= 11 ? "55" + digitos : digitos);
    }

    private static string FormaPagamento(IReadOnlyList<ParcelaOrcamentoLeitura>? parcelas, CultureInfo pt)
    {
        if (parcelas is null || parcelas.Count == 0)
        {
            return "";
        }

        var entrada = parcelas.FirstOrDefault(p => p.Entrada);
        var demais = parcelas.Where(p => !p.Entrada).ToArray();
        var partes = new List<string>();
        if (entrada is not null)
        {
            partes.Add($"Entrada de {entrada.Valor.ToString("C", pt)}");
        }

        if (demais.Length > 0)
        {
            partes.Add(demais.Select(p => p.Valor).Distinct().Count() == 1
                ? $"{demais.Length} {(demais.Length == 1 ? "parcela" : "parcelas")} de {demais[0].Valor.ToString("C", pt)}"
                : $"{demais.Length} parcelas");
        }

        return string.Join(" e ", partes);
    }

    private static string Endereco(params string?[] partes) =>
        string.Join(", ", partes.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));

    private static string RotuloTipo(TipoEvento? tipo) => tipo switch
    {
        TipoEvento.Casamento => "Casamento",
        TipoEvento.QuinzeAnos => "15 anos",
        TipoEvento.Aniversario => "Aniversário",
        TipoEvento.Corporativo => "Corporativo",
        TipoEvento.Formatura => "Formatura",
        _ => "",
    };

    [GeneratedRegex(@"\{\{\s*([A-Za-z0-9_]+)\s*\}\}")]
    private static partial Regex Tag();
}
