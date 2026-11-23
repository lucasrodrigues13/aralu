using Project.Application.Negocio;

namespace Project.Tests.Negocio;

/// <summary>Sanitização do HTML da tela de aceite (SPEC-057): casos de ataque e HTML legítimo.</summary>
public class HtmlSeguroTests
{
    [Theory]
    [InlineData("<script>alert(1)</script><p>ok</p>")]
    [InlineData("<SCRIPT SRC=https://evil.test/x.js></SCRIPT><p>ok</p>")]
    [InlineData("<iframe src=\"https://evil.test\"></iframe><p>ok</p>")]
    [InlineData("<object data=\"x\"></object><embed src=\"x\"><p>ok</p>")]
    [InlineData("<style>body{display:none}</style><p>ok</p>")]
    [InlineData("<svg onload=alert(1)><circle/></svg><p>ok</p>")]
    [InlineData("<math><mi xlink:href=\"javascript:alert(1)\">x</mi></math><p>ok</p>")]
    [InlineData("<form action=\"https://evil.test\"><input name=cpf></form><p>ok</p>")]
    [InlineData("<link rel=stylesheet href=\"https://evil.test/a.css\"><p>ok</p>")]
    [InlineData("<meta http-equiv=refresh content=\"0;url=https://evil.test\"><p>ok</p>")]
    [InlineData("<base href=\"https://evil.test/\"><p>ok</p>")]
    [InlineData("<!-- <script>alert(1)</script> --><p>ok</p>")]
    public void Remove_tags_perigosas_e_o_que_tem_dentro_delas(string entrada)
    {
        var saida = HtmlSeguro.Sanitizar(entrada);

        Assert.DoesNotContain("<script", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<iframe", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<style", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<svg", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<form", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<link", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<meta", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<base", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<object", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<embed", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("alert(1)", saida);
        Assert.DoesNotContain("evil.test", saida);
        Assert.Contains("<p>ok</p>", saida);
    }

    [Theory]
    [InlineData("<p onclick=\"alert(1)\">oi</p>")]
    [InlineData("<p onmouseover=alert(1)>oi</p>")]
    [InlineData("<img src=\"https://x.test/a.png\" onerror=\"alert(1)\">")]
    [InlineData("<a href=\"https://x.test\" onfocus='alert(1)' autofocus>oi</a>")]
    [InlineData("<p style=\"background:url(javascript:alert(1))\">oi</p>")]
    [InlineData("<p class=\"x\" id=\"y\" data-a=\"1\">oi</p>")]
    public void Remove_manipuladores_de_evento_estilo_e_atributos_fora_da_lista(string entrada)
    {
        var saida = HtmlSeguro.Sanitizar(entrada);

        Assert.DoesNotContain("onclick", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onmouseover", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onerror", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onfocus", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("autofocus", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("style", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("alert", saida);
        Assert.DoesNotContain(" class=", saida);
        Assert.DoesNotContain(" id=", saida);
        Assert.DoesNotContain("data-", saida);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("JaVaScRiPt:alert(1)")]
    [InlineData("  javascript:alert(1)")]
    [InlineData("java\tscript:alert(1)")]
    [InlineData("java&#x0A;script:alert(1)")]
    [InlineData("&#106;avascript:alert(1)")]
    [InlineData("&#x6A;avascript&colon;alert(1)")]
    [InlineData("vbscript:msgbox(1)")]
    [InlineData("data:text/html,<script>alert(1)</script>")]
    [InlineData("file:///etc/passwd")]
    [InlineData("//evil.test/x")]
    [InlineData("/relativo")]
    public void Link_com_url_perigosa_perde_o_href(string url)
    {
        var saida = HtmlSeguro.Sanitizar($"<a href=\"{url}\">clique</a>");

        Assert.DoesNotContain("href", saida);
        Assert.DoesNotContain("javascript", saida, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("data:", saida, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("clique", saida);
    }

    [Theory]
    [InlineData("http://x.test/a.png")]
    [InlineData("data:image/svg+xml;base64,PHN2Zz4=")]
    [InlineData("javascript:alert(1)")]
    [InlineData("/local.png")]
    public void Imagem_so_com_https_senao_some(string url)
    {
        var saida = HtmlSeguro.Sanitizar($"<p>a</p><img src=\"{url}\"><p>b</p>");

        Assert.DoesNotContain("<img", saida);
        Assert.Equal("<p>a</p><p>b</p>", saida);
    }

    [Fact]
    public void Aceita_html_legitimo_e_forca_rel_nos_links()
    {
        var saida = HtmlSeguro.Sanitizar(
            "<h2>Por que nos escolher</h2><p>Texto <strong>forte</strong> e <em>ênfase</em>.</p>" +
            "<ul><li>Um</li><li>Dois</li></ul>" +
            "<a href=\"https://exemplo.com/portfolio\" target=\"_self\" rel=\"opener\">Portfólio</a>" +
            "<img src=\"https://exemplo.com/foto.jpg\" alt=\"Foto\" width=\"300\">" +
            "<table><tr><td colspan=\"2\">x</td></tr></table>");

        Assert.Contains("<h2>Por que nos escolher</h2>", saida);
        Assert.Contains("<strong>forte</strong>", saida);
        Assert.Contains("<li>Dois</li>", saida);
        Assert.Contains("<a href=\"https://exemplo.com/portfolio\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">Portfólio</a>", saida);
        Assert.DoesNotContain("opener\"", saida.Replace("noopener", ""));
        Assert.Contains("<img src=\"https://exemplo.com/foto.jpg\" alt=\"Foto\" width=\"300\">", saida);
        Assert.Contains("<td colspan=\"2\">x</td>", saida);
    }

    [Fact]
    public void Tag_script_quebrada_no_meio_vira_so_texto_inerte()
    {
        var saida = HtmlSeguro.Sanitizar("<scr<script>ipt>alert(1)</scr</script>ipt><p>ok</p>");

        Assert.DoesNotContain("<script", saida, StringComparison.OrdinalIgnoreCase);
        Assert.EndsWith("<p>ok</p>", saida);
        Assert.Equal(1, saida.Count(c => c == '<') / 2);
    }

    [Fact]
    public void Atributo_com_aspas_e_html_dentro_nao_escapa_do_atributo()
    {
        var saida = HtmlSeguro.Sanitizar("<a href=\"https://x.test/?a=1\" title=\"&quot;><script>alert(1)</script>\">l</a>");

        Assert.DoesNotContain("<script", saida);
        Assert.Contains("&quot;&gt;&lt;script&gt;", saida);
    }

    [Fact]
    public void Texto_e_escapado_e_menor_que_solto_nao_vira_tag()
    {
        var saida = HtmlSeguro.Sanitizar("<p>1 < 2 && 3 > 2 <3 &amp; &lt;b&gt;</p>");

        Assert.DoesNotContain("<3", saida);
        Assert.Equal("<p>1 &lt; 2 &amp;&amp; 3 &gt; 2 &lt;3 &amp; &lt;b&gt;</p>", saida);
    }

    [Fact]
    public void Tag_sem_fechamento_vira_texto_escapado()
    {
        var saida = HtmlSeguro.Sanitizar("<p>oi</p><img src=\"https://x.test/a.png\" onerror=alert(1)");

        Assert.DoesNotContain("<img", saida);
        Assert.Contains("&lt;img", saida);
    }

    [Fact]
    public void Fecha_as_tags_abertas_e_ignora_fechamento_sem_abertura()
    {
        Assert.Equal("<p>a <strong>b</strong></p>", HtmlSeguro.Sanitizar("<p>a <strong>b"));
        Assert.Equal("<p>a</p>", HtmlSeguro.Sanitizar("</div></script><p>a</p></span>"));
    }

    [Fact]
    public void Tag_desconhecida_some_mas_o_texto_fica()
    {
        Assert.Equal("<p>meu texto</p>", HtmlSeguro.Sanitizar("<p><blink>meu texto</blink></p>"));
    }

    [Fact]
    public void Sem_conteudo_devolve_vazio_e_limita_a_entrada()
    {
        Assert.Equal("", HtmlSeguro.Sanitizar(null));
        Assert.Equal("", HtmlSeguro.Sanitizar("   "));
        Assert.Equal("", HtmlSeguro.Sanitizar("<script>x</script>"));
        var enorme = new string('a', HtmlSeguro.LimiteEntrada + 1000);
        Assert.Equal(HtmlSeguro.LimiteEntrada, HtmlSeguro.Sanitizar(enorme).Length);
    }

    [Fact]
    public void Aninhamento_muito_fundo_nao_estoura()
    {
        var entrada = string.Concat(Enumerable.Repeat("<div>", 5000)) + "x";

        var saida = HtmlSeguro.Sanitizar(entrada);

        Assert.True(saida.Split("<div>").Length - 1 <= 40);
    }

    [Fact]
    public void Resultado_ja_sanitizado_nao_muda_ao_sanitizar_de_novo()
    {
        var uma = HtmlSeguro.Sanitizar("<p>oi <a href=\"https://x.test/?a=1&b=2\">l</a> <img src=\"https://x.test/a.png\" alt=\"a &amp; b\"></p>");

        Assert.Equal(uma, HtmlSeguro.Sanitizar(uma));
    }

    [Fact]
    public void Mantem_alinhamento_e_listas_do_editor_e_descarta_outras_classes()
    {
        var html = HtmlSeguro.Sanitizar("<p class=\"ql-align-center x\">a</p><ol start=\"3\"><li data-list=\"bullet\" class=\"evil\">b</li></ol>");

        Assert.Equal("<p class=\"ql-align-center\">a</p><ol start=\"3\"><li data-list=\"bullet\">b</li></ol>", html);
    }

    [Theory]
    [InlineData("<p><br></p>", false)]
    [InlineData("<p>&nbsp;</p>", false)]
    [InlineData("<p>oi</p>", true)]
    public void TemTexto_ignora_paragrafo_vazio(string html, bool esperado) =>
        Assert.Equal(esperado, HtmlSeguro.TemTexto(html));

    [Theory]
    [InlineData("  texto antigo  ", "texto antigo")]
    [InlineData("<p><br></p>", null)]
    [InlineData("<p onclick=\"x()\">oi<script>a()</script></p>", "<p>oi</p>")]
    [InlineData("   ", null)]
    public void LimparRico_sanitiza_html_e_preserva_texto_antigo(string entrada, string? esperado) =>
        Assert.Equal(esperado, HtmlSeguro.LimparRico(entrada));
}
