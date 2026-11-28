using System.Net;
using System.Text;
using Project.Application.Negocio;

namespace Project.Infrastructure.Conta;

/// <summary>
/// Layout dos e-mails do sistema (docs/marca/regras-de-design.md §9): logo em PNG, cartão branco
/// sobre Creme, um botão Petróleo, linha do horizonte e rodapé. HTML em tabelas com estilo na
/// própria linha e Arial, porque programas de e-mail não carregam fonte da web nem CSS externo.
/// </summary>
public static class EmailModelo
{
    /// <summary>Caminho do logo positivo dentro do site público (arquivo com o dobro do tamanho exibido).</summary>
    public const string CaminhoLogo = "/marca/aralu-email.png";

    private const string Fonte = "Arial, Helvetica, sans-serif";
    private const string Creme = "#F7F4ED";
    private const string Branco = "#FFFFFF";
    private const string Petroleo = "#0F4D5C";
    private const string Tinta = "#132328";
    private const string Neutro600 = "#515D61";
    private const string Neutro200 = "#DDD8D0";
    private const string Neutro300 = "#C2BDB5";

    public static string Html(EmailConteudo conteudo, string? urlPublica)
    {
        var html = new StringBuilder();
        var publico = (urlPublica ?? "").TrimEnd('/');

        html.Append($$"""
            <!doctype html>
            <html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="x-apple-disable-message-reformatting">
            <meta name="color-scheme" content="light only">
            <meta name="supported-color-schemes" content="light only">
            <title>{{E(conteudo.Assunto)}}</title>
            </head>
            <body style="margin:0;padding:0;background-color:{{Creme}};-webkit-text-size-adjust:100%;">
            <div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{{Creme}};opacity:0;">{{E(conteudo.Previa)}}{{string.Concat(Enumerable.Repeat("&#847;&zwnj;&nbsp;", 40))}}</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{{Creme}};">
            <tr><td align="center" style="padding:32px 16px;">
            <!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr><td style="padding:0 0 24px 0;">{{Logo(publico)}}</td></tr>
            <tr><td style="background-color:{{Branco}};border:1px solid {{Neutro200}};border-radius:8px;padding:32px 24px;">
            <h1 style="margin:0 0 16px 0;font-family:{{Fonte}};font-size:22px;line-height:28px;font-weight:bold;color:{{Tinta}};">{{E(conteudo.Titulo)}}</h1>

            """);

        foreach (var paragrafo in conteudo.Paragrafos)
        {
            html.Append($"""<p style="margin:0 0 16px 0;font-family:{Fonte};font-size:16px;line-height:24px;color:{Tinta};">{E(paragrafo)}</p>""").Append('\n');
        }

        if (conteudo.Botao is { } botao)
        {
            var url = E(botao.Url);
            html.Append($$"""
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
                <tr><td align="center" bgcolor="{{Petroleo}}" style="background-color:{{Petroleo}};border-radius:8px;">
                <a href="{{url}}" target="_blank" style="display:inline-block;padding:14px 24px;font-family:{{Fonte}};font-size:16px;line-height:20px;font-weight:bold;color:{{Branco}};text-decoration:none;border-radius:8px;">{{E(botao.Texto)}}</a>
                </td></tr>
                </table>
                <p style="margin:0 0 16px 0;font-family:{{Fonte}};font-size:14px;line-height:20px;color:{{Neutro600}};">Se o botão não abrir, copie este endereço no navegador:<br><a href="{{url}}" target="_blank" style="color:{{Petroleo}};text-decoration:underline;word-break:break-all;">{{url}}</a></p>

                """);
        }

        if (!string.IsNullOrWhiteSpace(conteudo.Nota))
        {
            html.Append($"""<p style="margin:0;font-family:{Fonte};font-size:14px;line-height:20px;color:{Neutro600};">{E(conteudo.Nota)}</p>""").Append('\n');
        }

        html.Append($$"""
            </td></tr>
            <tr><td style="padding:24px 0 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid {{Neutro300}};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>
            <p style="margin:16px 0 4px 0;font-family:{{Fonte}};font-size:12px;line-height:16px;color:{{Neutro600}};"><strong style="color:{{Petroleo}};">Aralu</strong> · Tudo em dia</p>

            """);

        if (!string.IsNullOrWhiteSpace(conteudo.Motivo))
        {
            html.Append($"""<p style="margin:0;font-family:{Fonte};font-size:12px;line-height:16px;color:{Neutro600};">{E(conteudo.Motivo)}</p>""").Append('\n');
        }

        html.Append("""
            </td></tr>
            </table>
            <!--[if mso]></td></tr></table><![endif]-->
            </td></tr>
            </table>
            </body>
            </html>
            """);

        return html.ToString();
    }

    public static string Texto(EmailConteudo conteudo)
    {
        var texto = new StringBuilder();
        texto.Append(conteudo.Titulo).Append("\n\n");
        foreach (var paragrafo in conteudo.Paragrafos)
        {
            texto.Append(paragrafo).Append("\n\n");
        }

        if (conteudo.Botao is { } botao)
        {
            texto.Append(botao.Texto).Append(": ").Append(botao.Url).Append("\n\n");
        }

        if (!string.IsNullOrWhiteSpace(conteudo.Nota))
        {
            texto.Append(conteudo.Nota).Append("\n\n");
        }

        texto.Append("--\nAralu · Tudo em dia\n");
        if (!string.IsNullOrWhiteSpace(conteudo.Motivo))
        {
            texto.Append(conteudo.Motivo).Append('\n');
        }

        return texto.ToString();
    }

    private static string Logo(string publico)
    {
        // Sem URL pública o PNG não tem de onde vir: cai para o nome em serifa, nas cores do logo.
        if (string.IsNullOrEmpty(publico))
        {
            return $"""<span style="font-family:Georgia, 'Times New Roman', serif;font-size:32px;line-height:36px;color:{Petroleo};">aralu</span>""";
        }

        return $"""<img src="{E(publico + CaminhoLogo)}" width="120" height="45" alt="aralu" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:45px;font-family:Georgia, 'Times New Roman', serif;font-size:28px;color:{Petroleo};">""";
    }

    private static string E(string valor) => WebUtility.HtmlEncode(valor);
}
