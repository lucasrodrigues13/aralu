using Project.Application.Negocio;

namespace Project.Tests.Negocio;

/// <summary>SPEC-061: sanitização da página de aceite e montagem dos componentes.</summary>
public class PaginaAceiteTests
{
    private static readonly Guid Foto1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Foto2 = Guid.Parse("22222222-2222-2222-2222-222222222222");

    /// <summary>Só o que vem depois do CSS base (que cita todas as classes aralu-*).</summary>
    private static string Corpo(DadosPaginaAceite dados)
    {
        var pagina = PaginaAceite.Montar(dados);
        return pagina[(pagina.IndexOf("<body>", StringComparison.Ordinal) + 6)..];
    }

    private static DadosPaginaAceite Dados(string html, ExtrasAceite? extras = null, bool previa = false, Guid? logo = null) =>
        new(html,
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["nome_oportunidade"] = "Ana & Pedro",
                ["local_cerimonia"] = "Igreja Matriz",
                ["endereco_cerimonia"] = "Rua A, 1",
                ["link_whatsapp"] = "https://wa.me/5511988887777",
            },
            extras ?? ExtrasAceite.Vazio,
            logo,
            "<p>Texto da proposta</p>",
            8500m,
            [new(1, new DateOnly(2027, 1, 15), 2500m, true)],
            "#112233",
            null,
            previa);

    [Fact]
    public void Pagina_mantem_style_class_id_e_secoes()
    {
        var html = HtmlSeguro.SanitizarPagina("<style>.capa{color:red}</style><header class=\"capa x\" id=\"topo\" style=\"padding:4px\"><h1>Oi</h1></header><section>a</section>");

        Assert.Contains("<style>.capa{color:red}</style>", html);
        Assert.Contains("<header class=\"capa x\" id=\"topo\" style=\"padding:4px\">", html);
        Assert.Contains("<section>a</section>", html);
    }

    [Fact]
    public void Texto_rico_continua_sem_style_e_sem_secoes()
    {
        var html = HtmlSeguro.Sanitizar("<style>p{}</style><section class=\"x\" style=\"color:red\"><p>a</p></section>");

        Assert.Equal("<p>a</p>", html);
    }

    [Theory]
    [InlineData("<script>alert(1)</script><p>a</p>", "script")]
    [InlineData("<p onclick=\"alert(1)\">a</p>", "onclick")]
    [InlineData("<iframe src=\"https://x.com\"></iframe><p>a</p>", "iframe")]
    [InlineData("<form><input></form><p>a</p>", "input")]
    [InlineData("<a href=\"javascript:alert(1)\">a</a>", "javascript")]
    public void Pagina_continua_sem_conteudo_perigoso(string entrada, string proibido)
    {
        Assert.DoesNotContain(proibido, HtmlSeguro.SanitizarPagina(entrada), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("a{background:url(javascript:alert(1))}")]
    [InlineData("a{background:url('data:text/html,x')}")]
    [InlineData("a{width:expression(alert(1))}")]
    [InlineData("a{behavior:url(x.htc)}")]
    [InlineData("a{-moz-binding:url(x)}")]
    [InlineData("@import url(https://evil.com/x.css);")]
    [InlineData("a{background:u\\72l(javascript:x)}")]
    public void Css_perigoso_some(string css)
    {
        var limpo = HtmlSeguro.CssSeguro(css);

        Assert.DoesNotContain("javascript", limpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("data:", limpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("expression(", limpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("behavior", limpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("binding", limpo, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("evil.com", limpo, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Css_aceita_google_fonts_e_url_https()
    {
        var limpo = HtmlSeguro.CssSeguro("@import url('https://fonts.googleapis.com/css2?family=Lora');.c{background:url(https://site.com/a.jpg)}");

        Assert.Contains("@import url(\"https://fonts.googleapis.com/css2?family=Lora\");", limpo);
        Assert.Contains("url(\"https://site.com/a.jpg\")", limpo);
    }

    [Fact]
    public void Style_nao_consegue_fechar_a_tag()
    {
        var html = HtmlSeguro.SanitizarPagina("<style>a{}</style ><script>x</script></style><p>b</p>");

        Assert.DoesNotContain("<script", html);
        Assert.Contains("<p>b</p>", html);
    }

    [Fact]
    public void Link_do_google_fonts_vira_import_e_head_nao_apaga_estilos()
    {
        var html = HtmlSeguro.SanitizarPagina("<html><head><link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Lora\"><style>h1{color:red}</style></head><body><h1>Oi</h1></body></html>");

        Assert.Contains("@import url(\"https://fonts.googleapis.com/css2?family=Lora\");", html);
        Assert.Contains("h1{color:red}", html);
        Assert.Contains("<h1>Oi</h1>", html);
    }

    [Fact]
    public void Sanitizacao_da_pagina_e_idempotente()
    {
        const string entrada = "<style>@import url(https://fonts.googleapis.com/css2?family=Lora);.a{background:url('https://x.com/a.png')}</style><div class=\"a\" style=\"color:#fff\"><a href=\"{{link_whatsapp}}\">Zap</a> {{galeria:dia}}</div>";
        var uma = HtmlSeguro.SanitizarPagina(entrada);

        Assert.Equal(uma, HtmlSeguro.SanitizarPagina(uma));
    }

    [Fact]
    public void Tags_de_dados_entram_escapadas_e_no_preview_marcadas()
    {
        Assert.Contains("<h1>Ana &amp; Pedro</h1>", Corpo(Dados("<h1>{{nome_oportunidade}}</h1>")));
        Assert.Contains("<mark class=\"aralu-exemplo\">Ana &amp; Pedro</mark>", Corpo(Dados("<h1>{{nome_oportunidade}}</h1>", previa: true)));
    }

    [Fact]
    public void Galeria_e_carrossel_usam_as_fotos_do_espaco_na_ordem()
    {
        var extras = new ExtrasAceite([new("galeria:dia", Foto2, 1), new("galeria:dia", Foto1, 0), new("carrossel:festa", Foto1, 0), new("carrossel:festa", Foto2, 1)], []);
        var pagina = Corpo(Dados("{{galeria:dia}}{{carrossel:festa}}", extras));

        Assert.Contains("class=\"aralu-galeria aralu-galeria-dia\"", pagina);
        Assert.True(pagina.IndexOf($"aralu-midia:{Foto1}", StringComparison.Ordinal) < pagina.IndexOf($"aralu-midia:{Foto2}", StringComparison.Ordinal));
        Assert.Contains("class=\"aralu-carrossel aralu-carrossel-festa\"", pagina);
        Assert.Matches("<input class=\"aralu-carrossel-radio\" type=\"radio\" name=\"aralu-c-festa-[0-9a-f]{6}\" id=\"aralu-c-festa-[0-9a-f]{6}-1\" checked", pagina);
        Assert.Matches("<label class=\"aralu-seta aralu-seta-proxima\" for=\"aralu-c-festa-[0-9a-f]{6}-2\"", pagina);
    }

    [Fact]
    public void Carrossel_e_botoes_do_preview_nao_tem_links_com_cerquilha()
    {
        // No iframe srcdoc, "#x" aponta para a página de fora e carrega o app dentro do iframe.
        var extras = new ExtrasAceite([new("carrossel:festa", Foto1, 0), new("carrossel:festa", Foto2, 1)], []);
        var pagina = Corpo(Dados("{{carrossel:festa}}{{botoes_resposta}}", extras, previa: true));

        Assert.DoesNotContain("href=\"#", pagina);
        Assert.DoesNotContain("aralu-resposta:", pagina);
    }

    [Fact]
    public void Espaco_sem_foto_some_para_o_cliente_e_aparece_no_preview()
    {
        Assert.DoesNotContain("aralu-vazio", Corpo(Dados("{{galeria:dia}}")));
        Assert.Contains("aralu-vazio", Corpo(Dados("{{galeria:dia}}", previa: true)));
    }

    [Fact]
    public void Logo_vem_do_modelo_ou_do_perfil()
    {
        Assert.Contains($"aralu-midia:{Foto2}", Corpo(Dados("{{logo}}", logo: Foto2)));
        Assert.Contains($"aralu-midia:{Foto1}", Corpo(Dados("{{logo}}", new ExtrasAceite([new("logo", Foto1, 0)], []), logo: Foto2)));
    }

    [Fact]
    public void Botoes_entram_no_fim_quando_faltam_e_levam_a_pagina_do_aralu()
    {
        var pagina = Corpo(Dados("<h1>Oi</h1>"));

        Assert.Contains("href=\"aralu-resposta:Aceitar\" target=\"_top\"", pagina);
        Assert.True(pagina.IndexOf("<h1>Oi</h1>", StringComparison.Ordinal) < pagina.IndexOf("aralu-botoes", StringComparison.Ordinal));
    }

    [Fact]
    public void Html_sem_blocos_recebe_proposta_e_valor_html_com_blocos_nao()
    {
        var antigo = Corpo(Dados("<p>Por que nos escolher</p>"));
        Assert.Contains("aralu-proposta", antigo);
        Assert.Contains("aralu-valor", antigo);

        var novo = Corpo(Dados("<p>Oi</p>{{botoes_resposta}}"));
        Assert.DoesNotContain("aralu-proposta", novo);
        Assert.Equal(1, novo.Split("id=\"aralu-botoes\"").Length - 1);
    }

    [Fact]
    public void Video_vira_capa_com_link_e_mapa_vira_link_do_google()
    {
        var pagina = Corpo(Dados("{{video:https://youtu.be/dQw4w9WgXcQ}}{{mapa:local_cerimonia}}{{video:https://evil.com/x}}"));

        Assert.Contains("https://www.youtube.com/watch?v=dQw4w9WgXcQ", pagina);
        Assert.Contains("https://www.google.com/maps/search/?api=1&amp;query=Igreja%20Matriz%2C%20Rua%20A%2C%201", pagina);
        Assert.DoesNotContain("evil.com", pagina);
        Assert.DoesNotContain("<iframe", pagina);
    }

    [Fact]
    public void Tag_dentro_de_atributo_so_recebe_texto()
    {
        var pagina = Corpo(Dados("<a href=\"{{link_whatsapp}}\" title=\"{{nome_oportunidade}} {{galeria:dia}}\">Zap</a>"));

        Assert.Contains("href=\"https://wa.me/5511988887777\"", pagina);
        Assert.Contains("title=\"Ana &amp; Pedro \"", pagina);
    }

    [Fact]
    public void Documento_tem_csp_sem_scripts()
    {
        var pagina = PaginaAceite.Montar(Dados("<p>a</p>"));

        Assert.Contains("Content-Security-Policy", pagina);
        Assert.Contains("default-src 'none'", pagina);
        Assert.DoesNotContain("script-src", pagina);
    }

    [Fact]
    public void Espacos_usados_lista_logo_e_fotos()
    {
        var espacos = PaginaAceite.EspacosUsados("{{logo}} {{imagem:capa}} {{galeria:dia}} {{carrossel:festa}} {{video:x}} {{galeria:Inválido!}}");

        Assert.Equal(["logo", "imagem:capa", "galeria:dia", "carrossel:festa"], espacos);
    }

    [Fact]
    public void Extras_recusam_espaco_invalido_e_limitam_quantidade()
    {
        Assert.False(ExtrasAceite.Montar([new("galeria:<x>", Foto1, 0)], null).Ok);
        Assert.False(ExtrasAceite.Montar(Enumerable.Range(0, 41).Select(i => new MidiaAceite("galeria:a", Guid.NewGuid(), i)).ToArray(), null).Ok);

        var ok = ExtrasAceite.Montar([new("Galeria:A", Foto1, 5)], [new("  Amei  ", " Júlia ")]);
        Assert.True(ok.Ok);
        Assert.Equal("galeria:a", ok.Valor!.Midias[0].Espaco);
        Assert.Equal(0, ok.Valor.Midias[0].Ordem);
        Assert.Equal(new DepoimentoAceite("Amei", "Júlia"), ok.Valor.Depoimentos[0]);
        var relido = ExtrasAceite.Ler(ok.Valor.Gravar());
        Assert.Equal(ok.Valor.Midias, relido.Midias);
        Assert.Equal(ok.Valor.Depoimentos, relido.Depoimentos);
    }
}
