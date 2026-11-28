using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Project.Application.Comum;

namespace Project.Application.Negocio;

/// <summary>Foto de um espaço da página de aceite: <c>logo</c>, <c>imagem:capa</c>, <c>galeria:bastidores</c>...</summary>
public sealed record MidiaAceite(string Espaco, Guid ArquivoId, int Ordem);

public sealed record DepoimentoAceite(string Texto, string? Autor);

/// <summary>Mídias e depoimentos da página de aceite (SPEC-061), guardados em JSON no modelo e no orçamento.</summary>
public sealed record ExtrasAceite(IReadOnlyList<MidiaAceite> Midias, IReadOnlyList<DepoimentoAceite> Depoimentos)
{
    public const int MaximoMidias = 40;
    public const int MaximoDepoimentos = 20;

    public static readonly ExtrasAceite Vazio = new([], []);

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static ExtrasAceite Ler(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Vazio;
        }

        try
        {
            var lido = JsonSerializer.Deserialize<ExtrasAceite>(json, Json);
            return lido is null ? Vazio : new(lido.Midias ?? [], lido.Depoimentos ?? []);
        }
        catch (JsonException)
        {
            return Vazio;
        }
    }

    public string? Gravar() => Midias.Count == 0 && Depoimentos.Count == 0 ? null : JsonSerializer.Serialize(this, Json);

    /// <summary>Valida e normaliza o pedido. Espaço repetido com o mesmo arquivo conta uma vez; a ordem é refeita.</summary>
    public static Resultado<ExtrasAceite> Montar(IReadOnlyList<MidiaAceite>? midias, IReadOnlyList<DepoimentoAceite>? depoimentos)
    {
        var listaMidias = (midias ?? []).Where(m => m is not null).ToArray();
        if (listaMidias.Length > MaximoMidias)
        {
            return Resultado<ExtrasAceite>.Erro(Codigos.Validacao, $"Use até {MaximoMidias} fotos na tela de aceite.");
        }

        if (listaMidias.Any(m => !PaginaAceite.EspacoValido(m.Espaco) || m.ArquivoId == Guid.Empty))
        {
            return Resultado<ExtrasAceite>.Erro(Codigos.Validacao, "Há uma foto sem espaço válido na tela de aceite.");
        }

        var normalizadas = listaMidias
            .Select(m => m with { Espaco = m.Espaco.Trim().ToLowerInvariant() })
            .DistinctBy(m => (m.Espaco, m.ArquivoId))
            .GroupBy(m => m.Espaco)
            .SelectMany(g => g.OrderBy(m => m.Ordem).Select((m, i) => m with { Ordem = i }))
            .ToArray();

        var listaDepoimentos = (depoimentos ?? [])
            .Where(d => d is not null && !string.IsNullOrWhiteSpace(d.Texto))
            .Select(d => new DepoimentoAceite(Corte(d.Texto.Trim(), 600), Domain.Comum.Texto.Limpo(d.Autor) is { } autor ? Corte(autor, 120) : null))
            .ToArray();
        if (listaDepoimentos.Length > MaximoDepoimentos)
        {
            return Resultado<ExtrasAceite>.Erro(Codigos.Validacao, $"Use até {MaximoDepoimentos} depoimentos.");
        }

        return Resultado<ExtrasAceite>.Sucesso(new(normalizadas, listaDepoimentos));
    }

    private static string Corte(string texto, int limite) => texto.Length > limite ? texto[..limite] : texto;
}

/// <summary>O que a página de aceite precisa para ser montada (pública ou Live Preview).</summary>
public sealed record DadosPaginaAceite(
    string Html,
    IReadOnlyDictionary<string, string> Valores,
    ExtrasAceite Extras,
    Guid? LogoPerfil,
    string? Proposta,
    decimal? Valor,
    IReadOnlyList<ParcelaOrcamentoLeitura> Parcelas,
    string? CorPrimaria,
    string? CorSecundaria,
    bool Previa);

/// <summary>
/// Monta o documento da página de aceite (SPEC-061): troca tags de dados, componentes (logo, imagem, galeria,
/// carrossel, vídeo, mapa, depoimentos, WhatsApp) e blocos do sistema (proposta, valor, botões). Fotos saem com
/// <c>src="aralu-midia:{id}"</c> e os botões com <c>href="aralu-resposta:{tipo}"</c>; o frontend troca esses
/// endereços antes de pôr o documento no iframe isolado (sem scripts).
/// </summary>
public static partial class PaginaAceite
{
    public const string PrefixoMidia = "aralu-midia:";
    public const string PrefixoResposta = "aralu-resposta:";

    public static readonly IReadOnlyList<string> Componentes =
    [
        "{{logo}}", "{{imagem:nome}}", "{{galeria:nome}}", "{{carrossel:nome}}", "{{video:link}}",
        "{{mapa:local_cerimonia}}", "{{mapa:local_recepcao}}", "{{depoimentos}}", "{{botao_whatsapp}}",
    ];

    public static readonly IReadOnlyList<string> Blocos = ["{{bloco_proposta}}", "{{bloco_valor}}", "{{botoes_resposta}}"];

    public static bool EspacoValido(string? espaco) =>
        espaco is not null && Espaco().IsMatch(espaco.Trim().ToLowerInvariant());

    public static string Montar(DadosPaginaAceite dados)
    {
        var pt = CultureInfo.GetCultureInfo("pt-BR");
        var html = HtmlSeguro.SanitizarPagina(dados.Html);
        var usouBotoes = false;
        var corpo = TagPagina().Replace(html, m =>
        {
            var nome = m.Groups["n"].Value.ToLowerInvariant();
            var arg = WebUtility.HtmlDecode(m.Groups["a"].Value).Trim();
            if (DentroDeTag(html, m.Index))
            {
                // Em atributo (alt, title, href do WhatsApp...): só dados, em texto puro.
                return m.Groups["a"].Success ? "" : dados.Valores.TryGetValue(nome, out var v) ? WebUtility.HtmlEncode(v) : m.Value;
            }

            if (!m.Groups["a"].Success && dados.Valores.TryGetValue(nome, out var valor))
            {
                var texto = WebUtility.HtmlEncode(valor);
                return dados.Previa ? $"<mark class=\"aralu-exemplo\">{texto}</mark>" : texto;
            }

            if (nome == "botoes_resposta")
            {
                usouBotoes = true;
            }

            return Componente(nome, m.Groups["a"].Success ? arg : null, dados, pt) ?? m.Value;
        });

        // HTML sem nenhum bloco (como os da SPEC-057): proposta e valor entram depois dele, como antes.
        if (!BlocoUsado().IsMatch(html))
        {
            corpo += Componente("bloco_proposta", null, dados, pt) + Componente("bloco_valor", null, dados, pt);
        }

        if (!usouBotoes)
        {
            corpo += Botoes(dados.Previa);
        }

        return Documento(corpo, dados.CorPrimaria, dados.CorSecundaria);
    }

    /// <summary>Espaços de foto que o HTML usa (para o assistente de mídia).</summary>
    public static IReadOnlyList<string> EspacosUsados(string? html) =>
        TagPagina().Matches(html ?? "")
            .Select(m => (n: m.Groups["n"].Value.ToLowerInvariant(), a: m.Groups["a"].Value.Trim().ToLowerInvariant()))
            .Select(t => t.n == "logo" ? "logo" : t.n is "imagem" or "galeria" or "carrossel" ? $"{t.n}:{t.a}" : null)
            .Where(e => e is not null && EspacoValido(e))
            .Select(e => e!)
            .Distinct()
            .ToArray();

    private static string? Componente(string nome, string? arg, DadosPaginaAceite dados, CultureInfo pt)
    {
        switch (nome)
        {
            case "logo" when arg is null:
            {
                var id = Fotos(dados, "logo") is [var logo, ..] ? logo : dados.LogoPerfil;
                return id is Guid g ? $"<img class=\"aralu-logo\" src=\"{PrefixoMidia}{g}\" alt=\"Logo\">" : Vazio(dados, "Logo", "Envie o logo");
            }

            case "imagem" or "galeria" or "carrossel" when arg is not null:
            {
                var espaco = $"{nome}:{arg.ToLowerInvariant()}";
                if (!EspacoValido(espaco))
                {
                    return null;
                }

                var fotos = Fotos(dados, espaco);
                if (fotos.Count == 0)
                {
                    return Vazio(dados, Rotulo(nome, arg), nome == "imagem" ? "Envie a foto" : "Envie as fotos");
                }

                return nome switch
                {
                    "imagem" => $"<img class=\"aralu-imagem aralu-imagem-{arg}\" src=\"{PrefixoMidia}{fotos[0]}\" alt=\"\">",
                    "galeria" => $"<div class=\"aralu-galeria aralu-galeria-{arg}\">" +
                        string.Concat(fotos.Select(f => $"<figure><img src=\"{PrefixoMidia}{f}\" alt=\"\" loading=\"lazy\"></figure>")) + "</div>",
                    _ => Carrossel(arg, fotos),
                };
            }

            case "video" when arg is not null:
                return Video(arg);

            case "mapa" when arg is "local_cerimonia" or "local_recepcao":
            {
                var local = dados.Valores.GetValueOrDefault(arg) ?? "";
                var endereco = dados.Valores.GetValueOrDefault(arg == "local_cerimonia" ? "endereco_cerimonia" : "endereco_recepcao") ?? "";
                var busca = string.Join(", ", new[] { local, endereco }.Where(t => t.Length > 0));
                if (busca.Length == 0)
                {
                    return dados.Previa ? Vazio(dados, "Mapa", "Informe o local na oportunidade") : "";
                }

                var url = "https://www.google.com/maps/search/?api=1&query=" + Uri.EscapeDataString(busca);
                return $"<a class=\"aralu-mapa\" href=\"{WebUtility.HtmlEncode(url)}\" target=\"_blank\" rel=\"noopener noreferrer\">" +
                    $"<strong>{WebUtility.HtmlEncode(local)}</strong><span>{WebUtility.HtmlEncode(endereco)}</span><em>Ver no mapa</em></a>";
            }

            case "depoimentos" when arg is null:
                return dados.Extras.Depoimentos.Count == 0
                    ? Vazio(dados, "Depoimentos", "Cadastre depoimentos no modelo")
                    : "<div class=\"aralu-depoimentos\">" + string.Concat(dados.Extras.Depoimentos.Select(d =>
                        $"<blockquote><p>{WebUtility.HtmlEncode(d.Texto)}</p>{(d.Autor is null ? "" : $"<cite>{WebUtility.HtmlEncode(d.Autor)}</cite>")}</blockquote>")) + "</div>";

            case "botao_whatsapp" when arg is null:
            {
                var link = dados.Valores.GetValueOrDefault("link_whatsapp");
                return string.IsNullOrEmpty(link)
                    ? Vazio(dados, "WhatsApp", "Informe o celular no perfil")
                    : $"<a class=\"aralu-whatsapp\" href=\"{WebUtility.HtmlEncode(link)}\" target=\"_blank\" rel=\"noopener noreferrer\">Falar no WhatsApp</a>";
            }

            case "bloco_proposta" when arg is null:
                return string.IsNullOrWhiteSpace(dados.Proposta)
                    ? ""
                    : "<div class=\"aralu-proposta\">" + (HtmlSeguro.EhHtml(dados.Proposta)
                        ? HtmlSeguro.Sanitizar(dados.Proposta, HtmlSeguro.LimiteContrato)
                        : WebUtility.HtmlEncode(dados.Proposta).Replace("\n", "<br>")) + "</div>";

            case "bloco_valor" when arg is null:
                return BlocoValor(dados, pt);

            case "botoes_resposta" when arg is null:
                return Botoes(dados.Previa);
        }

        return null;
    }

    private static IReadOnlyList<Guid> Fotos(DadosPaginaAceite dados, string espaco) =>
        dados.Extras.Midias.Where(m => m.Espaco == espaco).OrderBy(m => m.Ordem).Select(m => m.ArquivoId).ToArray();

    private static string Vazio(DadosPaginaAceite dados, string rotulo, string dica) =>
        dados.Previa ? $"<div class=\"aralu-vazio\"><strong>{WebUtility.HtmlEncode(rotulo)}</strong><span>{WebUtility.HtmlEncode(dica)}</span></div>" : "";

    private static string Rotulo(string tipo, string nome) =>
        $"{char.ToUpperInvariant(tipo[0])}{tipo[1..]} · {nome.Replace('_', ' ')}";

    /// <summary>
    /// Carrossel só com CSS: um rádio por foto; setas e pontos são &lt;label&gt; que marcam o rádio. Sem links "#",
    /// que no iframe srcdoc apontariam para a página de fora e carregariam o app dentro do iframe.
    /// </summary>
    private static string Carrossel(string nome, IReadOnlyList<Guid> fotos)
    {
        var id = $"aralu-c-{nome}-{Guid.NewGuid().ToString("N")[..6]}";
        var n = fotos.Count;
        var css = new StringBuilder();
        var sb = new StringBuilder($"<div class=\"aralu-carrossel aralu-carrossel-{nome}\" id=\"{id}\">");
        for (var i = 1; i <= n; i++)
        {
            sb.Append($"<input class=\"aralu-carrossel-radio\" type=\"radio\" name=\"{id}\" id=\"{id}-{i}\"{(i == 1 ? " checked" : "")} aria-label=\"Foto {i}\">");
            css.Append($"#{id}-{i}:checked~.aralu-carrossel-janela .aralu-carrossel-trilho{{transform:translateX(-{(i - 1) * 100}%)}}");
            css.Append($"#{id}-{i}:checked~.aralu-carrossel-janela .aralu-setas-{i}{{display:block}}");
            css.Append($"#{id}-{i}:checked~.aralu-carrossel-pontos label:nth-child({i}){{opacity:1}}");
        }

        sb.Append($"<style>{css}</style><div class=\"aralu-carrossel-janela\"><div class=\"aralu-carrossel-trilho\">");
        foreach (var foto in fotos)
        {
            sb.Append($"<figure class=\"aralu-slide\"><img src=\"{PrefixoMidia}{foto}\" alt=\"\"></figure>");
        }

        sb.Append("</div>");
        if (n > 1)
        {
            for (var i = 1; i <= n; i++)
            {
                var anterior = i == 1 ? n : i - 1;
                var proximo = i == n ? 1 : i + 1;
                sb.Append($"<div class=\"aralu-setas aralu-setas-{i}\">");
                sb.Append($"<label class=\"aralu-seta aralu-seta-anterior\" for=\"{id}-{anterior}\" aria-label=\"Foto anterior\">&#8249;</label>");
                sb.Append($"<label class=\"aralu-seta aralu-seta-proxima\" for=\"{id}-{proximo}\" aria-label=\"Próxima foto\">&#8250;</label></div>");
            }
        }

        sb.Append("</div>");
        if (n > 1)
        {
            sb.Append("<div class=\"aralu-carrossel-pontos\">");
            for (var i = 1; i <= n; i++)
            {
                sb.Append($"<label for=\"{id}-{i}\" aria-label=\"Foto {i}\"></label>");
            }

            sb.Append("</div>");
        }

        return sb.Append("</div>").ToString();
    }

    /// <summary>
    /// Vídeo vira capa com link (o iframe da página não roda scripts, e players embutidos precisam deles).
    /// Só YouTube e Vimeo.
    /// </summary>
    private static string Video(string link)
    {
        var yt = YouTube().Match(link);
        if (yt.Success)
        {
            var idVideo = yt.Groups[1].Value;
            return $"<a class=\"aralu-video\" href=\"https://www.youtube.com/watch?v={idVideo}\" target=\"_blank\" rel=\"noopener noreferrer\">" +
                $"<img src=\"https://i.ytimg.com/vi/{idVideo}/hqdefault.jpg\" alt=\"\" loading=\"lazy\"><span>&#9654; Assistir ao vídeo</span></a>";
        }

        var vimeo = Vimeo().Match(link);
        return vimeo.Success
            ? $"<a class=\"aralu-video aralu-video-sem-capa\" href=\"https://vimeo.com/{vimeo.Groups[1].Value}\" target=\"_blank\" rel=\"noopener noreferrer\"><span>&#9654; Assistir ao vídeo</span></a>"
            : "";
    }

    private static string BlocoValor(DadosPaginaAceite dados, CultureInfo pt)
    {
        if (dados.Valor is null && dados.Parcelas.Count == 0)
        {
            return "";
        }

        var sb = new StringBuilder("<div class=\"aralu-valor\">");
        if (dados.Valor is decimal valor)
        {
            sb.Append($"<div class=\"aralu-valor-total\"><span>Investimento</span><strong>{WebUtility.HtmlEncode(valor.ToString("C", pt))}</strong></div>");
        }

        if (dados.Parcelas.Count > 0)
        {
            sb.Append("<ul class=\"aralu-parcelas\">");
            foreach (var p in dados.Parcelas.OrderBy(p => p.Numero))
            {
                var rotulo = p.Entrada ? "Entrada" : $"Parcela {p.Numero}";
                sb.Append($"<li><span>{rotulo} · {p.Vencimento.ToString("dd/MM/yyyy", pt)}</span><strong>{WebUtility.HtmlEncode(p.Valor.ToString("C", pt))}</strong></li>");
            }

            sb.Append("</ul>");
        }

        return sb.Append("</div>").ToString();
    }

    private static string Botoes(bool previa)
    {
        // No Live Preview os botões não navegam (link "#" no srcdoc carregaria a página de fora no iframe).
        string Link(string tipo, string classe, string texto) => previa
            ? $"<a class=\"aralu-botao {classe}\" role=\"button\">{texto}</a>"
            : $"<a class=\"aralu-botao {classe}\" href=\"{PrefixoResposta}{tipo}\" target=\"_top\">{texto}</a>";

        return "<div class=\"aralu-botoes\" id=\"aralu-botoes\"><p>O que você achou?</p><div>" +
            Link("Aceitar", "aralu-aceitar", "Aceitar proposta") +
            Link("Duvidas", "aralu-duvidas", "Tenho dúvidas") +
            Link("Recusar", "aralu-recusar", "Não vou seguir") +
            "</div></div>";
    }

    private static string Documento(string corpo, string? cor1, string? cor2)
    {
        var primaria = CorSegura(cor1) ?? "#534AB7";
        var secundaria = CorSegura(cor2) ?? "#EEEDFE";
        return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
            "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com\">" +
            "<base target=\"_blank\">" +
            $"<style>:root{{--aralu-primaria:{primaria};--aralu-secundaria:{secundaria}}}{EstiloBase}</style></head><body>" +
            corpo + "</body></html>";
    }

    private static string? CorSegura(string? cor) =>
        cor is not null && CorHex().IsMatch(cor) ? cor : null;

    private static bool DentroDeTag(string html, int indice)
    {
        var abre = html.LastIndexOf('<', Math.Max(0, indice - 1));
        var fecha = html.LastIndexOf('>', Math.Max(0, indice - 1));
        return abre > fecha;
    }

    private const string EstiloBase =
        "*,*::before,*::after{box-sizing:border-box}" +
        "body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#2C2C2A;background:#fff}" +
        "img{max-width:100%;height:auto}" +
        ".aralu-logo{display:block;max-height:96px;width:auto;margin:0 auto}" +
        ".aralu-imagem{display:block;width:100%;object-fit:cover}" +
        ".aralu-galeria{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}" +
        ".aralu-galeria figure{margin:0}.aralu-galeria img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px}" +
        ".aralu-carrossel{position:relative}" +
        ".aralu-carrossel-radio{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}" +
        ".aralu-carrossel-janela{position:relative;overflow:hidden;border-radius:12px}" +
        ".aralu-carrossel-trilho{display:flex;transition:transform .45s ease}" +
        ".aralu-slide{flex:0 0 100%;margin:0}" +
        ".aralu-slide img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}" +
        ".aralu-setas{display:none}" +
        ".aralu-seta{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.88);color:#2C2C2A;display:flex;align-items:center;justify-content:center;font-size:30px;line-height:1;cursor:pointer;user-select:none}" +
        ".aralu-seta:hover{background:#fff}" +
        ".aralu-seta-anterior{left:12px}.aralu-seta-proxima{right:12px}" +
        ".aralu-carrossel-pontos{display:flex;justify-content:center;gap:8px;margin-top:10px}" +
        ".aralu-carrossel-pontos label{width:10px;height:10px;border-radius:50%;background:var(--aralu-primaria);opacity:.3;cursor:pointer}" +
        ".aralu-carrossel-radio:focus-visible~.aralu-carrossel-janela{outline:2px solid var(--aralu-primaria);outline-offset:2px}" +
        ".aralu-video{position:relative;display:block;border-radius:12px;overflow:hidden;background:#2C2C2A;color:#fff;text-decoration:none;min-height:80px}" +
        ".aralu-video img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;opacity:.85}" +
        ".aralu-video span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.6);padding:10px 18px;border-radius:999px;font-weight:600}" +
        ".aralu-mapa{display:flex;flex-direction:column;gap:2px;padding:16px;border:1px solid rgba(0,0,0,.12);border-radius:12px;color:inherit;text-decoration:none}" +
        ".aralu-mapa em{color:var(--aralu-primaria);font-style:normal;font-weight:600}" +
        ".aralu-depoimentos{display:grid;gap:12px}.aralu-depoimentos blockquote{margin:0;padding:16px 20px;border-left:3px solid var(--aralu-primaria);background:rgba(0,0,0,.03)}" +
        ".aralu-depoimentos cite{display:block;margin-top:6px;font-style:normal;opacity:.75}" +
        ".aralu-whatsapp{display:inline-block;padding:12px 22px;border-radius:999px;background:#1D9E75;color:#fff;text-decoration:none;font-weight:600}" +
        ".aralu-proposta{max-width:760px;margin:0 auto;padding:24px 20px}" +
        ".aralu-valor{max-width:560px;margin:0 auto;padding:20px}" +
        ".aralu-valor-total{display:flex;justify-content:space-between;align-items:baseline;font-size:1.25em;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,.12)}" +
        ".aralu-parcelas{list-style:none;margin:10px 0 0;padding:0}.aralu-parcelas li{display:flex;justify-content:space-between;padding:4px 0;opacity:.85}" +
        ".aralu-botoes{text-align:center;padding:32px 20px}.aralu-botoes p{margin:0 0 14px;font-size:1.15em}" +
        ".aralu-botoes div{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}" +
        ".aralu-botao{display:inline-block;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;border:1.5px solid var(--aralu-primaria);color:var(--aralu-primaria)}" +
        ".aralu-aceitar{background:var(--aralu-primaria);color:#fff}.aralu-recusar{border-color:transparent;opacity:.75}" +
        ".aralu-vazio{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:120px;padding:16px;border:2px dashed #BA7517;border-radius:12px;background:#FAEEDA;color:#633806;font:14px system-ui,sans-serif;text-align:center}" +
        ".aralu-exemplo{background:#FAC775;color:inherit;padding:0 2px;border-radius:3px}";

    [GeneratedRegex(@"\{\{\s*(?<n>[A-Za-z_]+)(?::(?<a>[^{}<>""]{1,300}))?\s*\}\}")]
    private static partial Regex TagPagina();

    [GeneratedRegex(@"\{\{\s*(bloco_proposta|bloco_valor|botoes_resposta)\s*\}\}", RegexOptions.IgnoreCase)]
    private static partial Regex BlocoUsado();

    [GeneratedRegex("^(logo|(imagem|galeria|carrossel):[a-z0-9_]{1,40})$")]
    private static partial Regex Espaco();

    [GeneratedRegex(@"(?:youtube\.com/(?:watch\?(?:.*&)?v=|shorts/|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})")]
    private static partial Regex YouTube();

    [GeneratedRegex(@"vimeo\.com/(?:video/)?([0-9]{6,12})")]
    private static partial Regex Vimeo();

    [GeneratedRegex("^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$")]
    private static partial Regex CorHex();
}
