using Project.Application.Negocio;
using Project.Infrastructure.Conta;

namespace Project.Tests.Conta;

public class EmailModeloTests
{
    private const string Publico = "https://app.aralu.com.br/";

    [Fact]
    public void Html_tem_logo_titulo_botao_e_link_alternativo()
    {
        var conteudo = EmailMensagens.ConfirmacaoDeEmail("ana@exemplo.com", "https://app.aralu.com.br/confirmar-email?usuarioId=1&token=a+b");

        var html = EmailModelo.Html(conteudo, Publico);

        Assert.Contains("""src="https://app.aralu.com.br/marca/aralu-email.png" """.TrimEnd(), html, StringComparison.Ordinal);
        Assert.Contains(">Confirme seu e-mail</h1>", html, StringComparison.Ordinal);
        Assert.Contains(">Confirmar e-mail</a>", html, StringComparison.Ordinal);
        // O & do link vira &amp; no atributo; o botão e o link alternativo apontam para o mesmo endereço.
        Assert.Equal(2, Ocorrencias(html, """href="https://app.aralu.com.br/confirmar-email?usuarioId=1&amp;token=a+b" """.TrimEnd()));
        Assert.Contains("Arial, Helvetica, sans-serif", html, StringComparison.Ordinal);
        Assert.DoesNotContain("<link", html, StringComparison.Ordinal);
    }

    [Fact]
    public void Html_escapa_o_texto_vindo_do_cadastro()
    {
        var conteudo = EmailMensagens.ConviteDeAssistente("<b>Bia</b>", "Cerimonial \"A&B\"", "https://x/convite");

        var html = EmailModelo.Html(conteudo, Publico);

        Assert.DoesNotContain("<b>Bia</b>", html, StringComparison.Ordinal);
        Assert.Contains("&lt;b&gt;Bia&lt;/b&gt;", html, StringComparison.Ordinal);
        Assert.Contains("Cerimonial &quot;A&amp;B&quot;", html, StringComparison.Ordinal);
    }

    [Fact]
    public void Sem_url_publica_o_logo_vira_texto()
    {
        var html = EmailModelo.Html(EmailMensagens.RedefinicaoDeSenha("ana@exemplo.com", "https://x/r"), null);

        Assert.DoesNotContain("<img", html, StringComparison.Ordinal);
        Assert.Contains(">aralu</span>", html, StringComparison.Ordinal);
    }

    [Fact]
    public void Texto_puro_tem_a_mesma_mensagem_e_o_link_completo()
    {
        var texto = EmailModelo.Texto(EmailMensagens.ConviteDeAssistente("Bia", "Cerimonial Luz", "https://x/convite?token=1"));

        Assert.StartsWith("Convite para a equipe de Cerimonial Luz\n", texto, StringComparison.Ordinal);
        Assert.Contains("Olá, Bia.", texto, StringComparison.Ordinal);
        Assert.Contains("Criar senha: https://x/convite?token=1", texto, StringComparison.Ordinal);
        Assert.Contains("O link vale por 7 dias.", texto, StringComparison.Ordinal);
        Assert.Contains("Aralu · Tudo em dia", texto, StringComparison.Ordinal);
    }

    [Fact]
    public void Corpo_e_multipart_alternative_com_texto_e_html()
    {
        var corpo = MailKitEmailSender.Corpo(EmailMensagens.CodigoDeRedefinicao("ana@exemplo.com", "123456"), Publico);

        Assert.Equal("multipart/alternative", corpo.ContentType.MimeType);
        Assert.Contains("123456", corpo.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Mensagens_seguem_a_voz_da_marca()
    {
        EmailConteudo[] todas =
        [
            EmailMensagens.ConfirmacaoDeEmail("a@b.c", "https://x"),
            EmailMensagens.RedefinicaoDeSenha("a@b.c", "https://x"),
            EmailMensagens.CodigoDeRedefinicao("a@b.c", "1"),
            EmailMensagens.ConviteDeAssistente("Bia", "Cerimonial Luz", "https://x"),
        ];

        foreach (var conteudo in todas)
        {
            var textos = new[] { conteudo.Assunto, conteudo.Titulo, conteudo.Botao?.Texto ?? "" };
            Assert.All(textos, texto => Assert.False(texto.EndsWith('.') || texto.Contains('!'), texto));
            var tudo = EmailModelo.Texto(conteudo);
            foreach (var proibida in new[] { "clique aqui", "usuário", "URGENTE", "Ops", "querida", "Bem-vinda" })
            {
                Assert.DoesNotContain(proibida, tudo, StringComparison.OrdinalIgnoreCase);
            }
        }
    }

    /// <summary>
    /// Gera os e-mails em HTML para revisar no navegador: defina ARALU_PREVIA_EMAILS com uma pasta
    /// e rode este teste. Sem a variável, não faz nada.
    /// </summary>
    [Fact]
    public void Gera_previas_quando_pedido()
    {
        var pasta = Environment.GetEnvironmentVariable("ARALU_PREVIA_EMAILS");
        if (string.IsNullOrWhiteSpace(pasta))
        {
            return;
        }

        Directory.CreateDirectory(pasta);
        var publico = Environment.GetEnvironmentVariable("ARALU_PREVIA_URL") ?? Publico;
        var link = $"{publico.TrimEnd('/')}/exemplo?usuarioId=0f4d5c&token=CfDJ8Exemplo";
        var previas = new Dictionary<string, EmailConteudo>
        {
            ["confirmacao"] = EmailMensagens.ConfirmacaoDeEmail("ana@exemplo.com", link),
            ["redefinicao"] = EmailMensagens.RedefinicaoDeSenha("ana@exemplo.com", link),
            ["codigo"] = EmailMensagens.CodigoDeRedefinicao("ana@exemplo.com", "482913"),
            ["convite-assistente"] = EmailMensagens.ConviteDeAssistente("Beatriz", "Cerimonial Luz do Dia", link),
        };
        foreach (var (nome, conteudo) in previas)
        {
            File.WriteAllText(Path.Combine(pasta, $"{nome}.html"), EmailModelo.Html(conteudo, publico));
            File.WriteAllText(Path.Combine(pasta, $"{nome}.txt"), EmailModelo.Texto(conteudo));
        }
    }

    private static int Ocorrencias(string texto, string trecho)
    {
        var total = 0;
        for (var i = texto.IndexOf(trecho, StringComparison.Ordinal); i >= 0; i = texto.IndexOf(trecho, i + trecho.Length, StringComparison.Ordinal))
        {
            total++;
        }

        return total;
    }
}
