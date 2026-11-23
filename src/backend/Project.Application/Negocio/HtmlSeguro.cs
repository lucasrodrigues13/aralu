using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace Project.Application.Negocio;

/// <summary>
/// Sanitizador do HTML que a assessoria cadastra para a tela de aceite da proposta (SPEC-057).
/// Reconstrói o HTML do zero: só sai o que está na lista permitida de tags e atributos; o resto
/// é descartado. Sem scripts, manipuladores de evento, iframes, estilos, formulários nem URLs
/// perigosas. O texto é sempre escapado.
/// </summary>
public static partial class HtmlSeguro
{
    public const int LimiteEntrada = 50_000;

    private const int ProfundidadeMaxima = 40;

    private static readonly HashSet<string> TagsComContainer = new(StringComparer.OrdinalIgnoreCase)
    {
        "p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "small",
        "sub", "sup", "ul", "ol", "li", "blockquote", "a", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "figure", "figcaption", "caption",
    };

    private static readonly HashSet<string> TagsVazias = new(StringComparer.OrdinalIgnoreCase) { "br", "hr", "img" };

    /// <summary>Tags cujo conteúdo inteiro é descartado (não só a tag).</summary>
    private static readonly HashSet<string> TagsComConteudoDescartado = new(StringComparer.OrdinalIgnoreCase)
    {
        "script", "style", "iframe", "frameset", "object", "noscript", "template",
        "svg", "math", "textarea", "title", "head", "select", "option", "applet", "xmp", "plaintext", "noembed", "noframes",
    };

    /// <summary>Texto do contrato (editor com formatação) pode ser bem mais longo que a tela de aceite.</summary>
    public const int LimiteContrato = 500_000;

    /// <summary>Conteúdo gravado pelo editor começa com uma tag; texto antigo (sem HTML), não.</summary>
    public static bool EhHtml(string? texto) => texto is not null && Regex.IsMatch(texto, @"^\s*<[a-zA-Z]");

    /// <summary>
    /// Campo com editor de formatação: HTML é sanitizado (e vira null se não tiver texto visível);
    /// texto antigo, sem HTML, só perde os espaços das pontas.
    /// </summary>
    public static string? LimparRico(string? texto, int limite = LimiteContrato)
    {
        var limpo = Domain.Comum.Texto.Limpo(texto);
        if (limpo is null || !EhHtml(limpo))
        {
            return limpo;
        }

        var html = Sanitizar(limpo, limite);
        return TemTexto(html) ? html : null;
    }

    /// <summary>Há texto visível (fora das tags)? Um "<p><br></p>" vazio não conta.</summary>
    public static bool TemTexto(string? texto) =>
        !string.IsNullOrWhiteSpace(texto) && !string.IsNullOrWhiteSpace(WebUtility.HtmlDecode(Regex.Replace(texto, "<[^>]*>", "")));

    public static string Sanitizar(string? html, int limite = LimiteEntrada)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return "";
        }

        var entrada = html.Length > limite ? html[..limite] : html;
        var saida = new StringBuilder(entrada.Length);
        var abertas = new List<string>();
        var i = 0;
        while (i < entrada.Length)
        {
            var c = entrada[i];
            if (c != '<')
            {
                if (c == '>')
                {
                    saida.Append("&gt;");
                }
                else if (c == '&')
                {
                    var m = EntidadeValida().Match(entrada, i);
                    if (m.Success && m.Index == i)
                    {
                        saida.Append(m.Value);
                        i += m.Length;
                        continue;
                    }

                    saida.Append("&amp;");
                }
                else if (char.IsControl(c) && c is not ('\n' or '\r' or '\t'))
                {
                    // descarta controles
                }
                else
                {
                    saida.Append(c);
                }

                i++;
                continue;
            }

            if (string.CompareOrdinal(entrada, i, "<!--", 0, 4) == 0)
            {
                var fim = entrada.IndexOf("-->", i + 4, StringComparison.Ordinal);
                i = fim < 0 ? entrada.Length : fim + 3;
                continue;
            }

            var proximo = i + 1 < entrada.Length ? entrada[i + 1] : '\0';
            if (proximo is '!' or '?')
            {
                var fim = entrada.IndexOf('>', i);
                i = fim < 0 ? entrada.Length : fim + 1;
                continue;
            }

            var fechando = proximo == '/';
            var inicioNome = i + (fechando ? 2 : 1);
            var j = inicioNome;
            while (j < entrada.Length && char.IsAsciiLetterOrDigit(entrada[j]))
            {
                j++;
            }

            if (j == inicioNome || !char.IsAsciiLetter(entrada[inicioNome]))
            {
                // "<" solto: vira texto
                saida.Append("&lt;");
                i++;
                continue;
            }

            var nome = entrada[inicioNome..j].ToLowerInvariant();
            var fimTag = ProcurarFimDaTag(entrada, j);
            if (fimTag < 0)
            {
                // tag sem fechamento: o "<" vira texto escapado
                saida.Append("&lt;");
                i++;
                continue;
            }

            var atributosBrutos = entrada[j..fimTag];
            i = fimTag + 1;

            if (fechando)
            {
                var pos = abertas.LastIndexOf(nome);
                if (pos >= 0)
                {
                    for (var k = abertas.Count - 1; k >= pos; k--)
                    {
                        saida.Append("</").Append(abertas[k]).Append('>');
                    }

                    abertas.RemoveRange(pos, abertas.Count - pos);
                }

                continue;
            }

            if (TagsComConteudoDescartado.Contains(nome))
            {
                if (!atributosBrutos.TrimEnd().EndsWith('/'))
                {
                    var alvo = "</" + nome;
                    var achou = entrada.IndexOf(alvo, i, StringComparison.OrdinalIgnoreCase);
                    if (achou < 0)
                    {
                        i = entrada.Length;
                    }
                    else
                    {
                        var fecha = entrada.IndexOf('>', achou);
                        i = fecha < 0 ? entrada.Length : fecha + 1;
                    }
                }

                continue;
            }

            if (TagsVazias.Contains(nome))
            {
                if (nome == "img")
                {
                    var atributos = Atributos(nome, atributosBrutos);
                    if (atributos.Contains(" src=\"", StringComparison.Ordinal))
                    {
                        saida.Append("<img").Append(atributos).Append('>');
                    }
                }
                else
                {
                    saida.Append('<').Append(nome).Append('>');
                }

                continue;
            }

            if (TagsComContainer.Contains(nome) && abertas.Count < ProfundidadeMaxima)
            {
                saida.Append('<').Append(nome).Append(Atributos(nome, atributosBrutos)).Append('>');
                abertas.Add(nome);
            }

            // tag não permitida: some a tag, o texto de dentro continua
        }

        for (var k = abertas.Count - 1; k >= 0; k--)
        {
            saida.Append("</").Append(abertas[k]).Append('>');
        }

        return saida.ToString().Trim();
    }

    /// <summary>Acha o ">" que fecha a tag respeitando aspas. -1 se não fecha.</summary>
    private static int ProcurarFimDaTag(string texto, int de)
    {
        char? aspas = null;
        for (var k = de; k < texto.Length; k++)
        {
            var c = texto[k];
            if (aspas is not null)
            {
                if (c == aspas)
                {
                    aspas = null;
                }
            }
            else if (c is '"' or '\'')
            {
                aspas = c;
            }
            else if (c == '>')
            {
                return k;
            }
        }

        return -1;
    }

    private static string Atributos(string tag, string brutos)
    {
        var resultado = new StringBuilder();
        var vistos = new HashSet<string>();
        foreach (Match m in AtributoBruto().Matches(brutos))
        {
            var nome = m.Groups["n"].Value.ToLowerInvariant();
            var valor = m.Groups["d"].Success ? m.Groups["d"].Value
                : m.Groups["s"].Success ? m.Groups["s"].Value
                : m.Groups["u"].Success ? m.Groups["u"].Value : "";
            valor = WebUtility.HtmlDecode(valor);
            if (!vistos.Add(nome))
            {
                continue;
            }

            string? seguro = null;
            switch (tag, nome)
            {
                case ("a", "href"):
                    seguro = UrlSegura(valor, ["http", "https", "mailto", "tel"]);
                    break;
                case ("img", "src"):
                    seguro = UrlSegura(valor, ["https"]);
                    break;
                case ("a" or "img", "title"):
                case ("img", "alt"):
                    seguro = valor.Length <= 300 ? valor : valor[..300];
                    break;
                case ("img", "width" or "height"):
                case ("td" or "th", "colspan" or "rowspan"):
                case ("ol", "start"):
                    seguro = Regex.IsMatch(valor, "^[0-9]{1,4}$") ? valor : null;
                    break;
                case ("li", "data-list"):
                    seguro = valor is "bullet" or "ordered" ? valor : null;
                    break;
                case (_, "class"):
                    // Só as classes de alinhamento e recuo do editor (Quill).
                    var classes = valor.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .Where(c => Regex.IsMatch(c, "^ql-(align-(center|right|justify)|indent-[1-8])$"));
                    seguro = string.Join(' ', classes) is { Length: > 0 } lista ? lista : null;
                    break;
            }

            if (seguro is not null)
            {
                resultado.Append(' ').Append(nome).Append("=\"").Append(WebUtility.HtmlEncode(seguro)).Append('"');
            }
        }

        if (tag == "a" && resultado.ToString().Contains(" href=\"", StringComparison.Ordinal))
        {
            resultado.Append(" target=\"_blank\" rel=\"noopener noreferrer nofollow\"");
        }

        return resultado.ToString();
    }

    /// <summary>Devolve a URL se o esquema é permitido. Remove espaços e controles antes de olhar o esquema.</summary>
    internal static string? UrlSegura(string valor, string[] esquemas)
    {
        var limpo = new string(valor.Where(c => !char.IsControl(c) && !char.IsWhiteSpace(c)).ToArray());
        if (limpo.Length == 0 || limpo.Length > 2000)
        {
            return null;
        }

        var dois = limpo.IndexOf(':');
        if (dois < 0)
        {
            return null; // só URL absoluta (sem relativas nem "//host")
        }

        var esquema = limpo[..dois].ToLowerInvariant();
        return esquemas.Contains(esquema) ? limpo : null;
    }

    [GeneratedRegex(@"&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6});")]
    private static partial Regex EntidadeValida();

    [GeneratedRegex("""(?<n>[a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"(?<d>[^"]*)"|'(?<s>[^']*)'|(?<u>[^\s"'=<>`]+)))?""")]
    private static partial Regex AtributoBruto();
}
