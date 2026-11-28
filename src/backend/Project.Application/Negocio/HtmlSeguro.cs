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

    /// <summary>Estrutura extra liberada só na página de aceite (SPEC-061).</summary>
    private static readonly HashSet<string> TagsDaPagina = new(StringComparer.OrdinalIgnoreCase)
    {
        "section", "header", "footer", "main", "article", "aside", "nav",
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

    /// <summary>
    /// Página de aceite (SPEC-061): além da lista da SPEC-057, aceita <c>&lt;style&gt;</c>, <c>class</c>, <c>id</c> e
    /// <c>style</c> (CSS filtrado por <see cref="CssSeguro"/>), seções estruturais e Google Fonts. Continua sem
    /// scripts, eventos, iframes e formulários. É exibida num iframe isolado, sem scripts.
    /// </summary>
    public static string SanitizarPagina(string? html) => Sanitizar(html, LimiteEntrada, pagina: true);

    public static string Sanitizar(string? html, int limite = LimiteEntrada) => Sanitizar(html, limite, pagina: false);

    private static string Sanitizar(string? html, int limite, bool pagina)
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

            if (pagina && nome == "style")
            {
                var achou = entrada.IndexOf("</style", i, StringComparison.OrdinalIgnoreCase);
                var css = CssSeguro(achou < 0 ? entrada[i..] : entrada[i..achou]);
                if (achou < 0)
                {
                    i = entrada.Length;
                }
                else
                {
                    var fecha = entrada.IndexOf('>', achou);
                    i = fecha < 0 ? entrada.Length : fecha + 1;
                }

                if (css.Length > 0)
                {
                    saida.Append("<style>").Append(css).Append("</style>");
                }

                continue;
            }

            if (pagina && nome == "link")
            {
                // Google Fonts por <link> vira @import (a única folha externa aceita).
                var href = AtributoBruto().Matches(atributosBrutos)
                    .FirstOrDefault(m => m.Groups["n"].Value.Equals("href", StringComparison.OrdinalIgnoreCase));
                var url = href is null ? null : WebUtility.HtmlDecode(href.Groups["d"].Success ? href.Groups["d"].Value : href.Groups["s"].Value);
                if (url is not null && FonteGoogle(url))
                {
                    saida.Append("<style>").Append(CssSeguro($"@import url(\"{url}\");")).Append("</style>");
                }

                continue;
            }

            if (TagsComConteudoDescartado.Contains(nome) && !(pagina && nome == "head"))
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
                    var atributos = Atributos(nome, atributosBrutos, pagina);
                    if (atributos.Contains(" src=\"", StringComparison.Ordinal))
                    {
                        saida.Append("<img").Append(atributos).Append('>');
                    }
                }
                else
                {
                    saida.Append('<').Append(nome).Append(pagina ? Atributos(nome, atributosBrutos, pagina) : "").Append('>');
                }

                continue;
            }

            if ((TagsComContainer.Contains(nome) || (pagina && TagsDaPagina.Contains(nome))) && abertas.Count < ProfundidadeMaxima)
            {
                saida.Append('<').Append(nome).Append(Atributos(nome, atributosBrutos, pagina)).Append('>');
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

    private static string Atributos(string tag, string brutos, bool pagina = false)
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
            if (pagina && nome is "class" or "id" or "style")
            {
                seguro = nome switch
                {
                    "style" => CssSeguro(valor) is { Length: > 0 } css ? css : null,
                    "id" => NomeCss().IsMatch(valor) ? valor : null,
                    _ => string.Join(' ', valor.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(c => NomeCss().IsMatch(c))) is { Length: > 0 } lista ? lista : null,
                };
                if (seguro is not null)
                {
                    resultado.Append(' ').Append(nome).Append("=\"").Append(WebUtility.HtmlEncode(seguro)).Append('"');
                }

                continue;
            }

            if (pagina && (tag, nome) is ("a", "href") && TagDeLink().IsMatch(valor))
            {
                resultado.Append(" href=\"{{link_whatsapp}}\"");
                continue;
            }

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

    /// <summary>
    /// CSS da página de aceite (SPEC-061 §8.2). Tira comentários, barras invertidas (escapes usados para disfarçar
    /// palavras) e "&lt;" (assim não fecha o &lt;style&gt;); só aceita @import do Google Fonts e url() https; remove
    /// expression(), behavior, -moz-binding e esquemas javascript:/vbscript:. Idempotente.
    /// </summary>
    public static string CssSeguro(string? css)
    {
        if (string.IsNullOrWhiteSpace(css))
        {
            return "";
        }

        var s = css.Length > LimiteEntrada ? css[..LimiteEntrada] : css;
        s = Regex.Replace(s, @"/\*.*?(\*/|$)", "", RegexOptions.Singleline);
        s = new string(s.Where(c => c is not ('\\' or '<') && (!char.IsControl(c) || c is '\n' or '\r' or '\t')).ToArray());
        s = Regex.Replace(s, @"@import\s*(?:url\(\s*)?[""']?([^""'\)\s;]*)[""']?\s*\)?[^;{]*;?", m =>
            FonteGoogle(m.Groups[1].Value) ? $"@import url(\"{m.Groups[1].Value}\");" : "", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"url\(\s*([""']?)(.*?)\1\s*\)", m =>
            UrlSegura(m.Groups[2].Value, ["https"]) is { } u && !u.Contains('"') && !u.Contains('\'') && !u.Contains(')') ? $"url(\"{u}\")" : "none",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        string anterior;
        do
        {
            anterior = s;
            s = Regex.Replace(s, @"expression\s*\(|behavior\s*:|-moz-binding|javascript\s*:|vbscript\s*:|@charset|@namespace", "", RegexOptions.IgnoreCase);
        }
        while (s != anterior);

        return s.Trim();
    }

    private static bool FonteGoogle(string url) =>
        url.StartsWith("https://fonts.googleapis.com/", StringComparison.OrdinalIgnoreCase) && !url.Contains('"') && !url.Contains('\'') && !url.Contains(')');

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

    [GeneratedRegex("^[A-Za-z_-][A-Za-z0-9_-]{0,60}$")]
    private static partial Regex NomeCss();

    /// <summary>Na página, o link do WhatsApp pode vir da tag (trocada depois por wa.me).</summary>
    [GeneratedRegex(@"^\s*\{\{\s*link_whatsapp\s*\}\}\s*$")]
    private static partial Regex TagDeLink();

    [GeneratedRegex(@"&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6});")]
    private static partial Regex EntidadeValida();

    [GeneratedRegex("""(?<n>[a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"(?<d>[^"]*)"|'(?<s>[^']*)'|(?<u>[^\s"'=<>`]+)))?""")]
    private static partial Regex AtributoBruto();
}
