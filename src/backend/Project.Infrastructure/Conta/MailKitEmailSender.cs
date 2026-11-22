using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MimeKit;
using Project.Application.Negocio;

namespace Project.Infrastructure.Conta;

public sealed class MailKitEmailSender : IEmailSender<ApplicationUser>
{
    private readonly EmailOpcoes _opcoes;
    private readonly ILogger _log;
    private readonly string? _urlPublica;

    public MailKitEmailSender(IOptions<EmailOpcoes> opcoes, ILogger<MailKitEmailSender>? log = null, IConfiguration? configuracao = null)
    {
        _opcoes = opcoes.Value;
        _urlPublica = configuracao?["PublicUrl"];
        _log = (ILogger?)log ?? NullLogger.Instance;
    }

    public Task SendConfirmationLinkAsync(ApplicationUser user, string email, string confirmationLink)
    {
        return EnviarAsync(email, EmailMensagens.ConfirmacaoDeEmail(email, confirmationLink), CancellationToken.None);
    }

    public Task SendPasswordResetLinkAsync(ApplicationUser user, string email, string resetLink)
    {
        return EnviarAsync(email, EmailMensagens.RedefinicaoDeSenha(email, resetLink), CancellationToken.None);
    }

    public Task SendPasswordResetCodeAsync(ApplicationUser user, string email, string resetCode)
    {
        return EnviarAsync(email, EmailMensagens.CodigoDeRedefinicao(email, resetCode), CancellationToken.None);
    }

    internal async Task EnviarAsync(string email, EmailConteudo conteudo, CancellationToken cancellationToken)
    {
        var assunto = conteudo.Assunto;
        try
        {
            await EnviarSemRegistroAsync(email, conteudo, cancellationToken);
            _log.LogInformation(
                "E-mail aceito pelo SMTP ({Autenticacao}, caixa {Caixa}, assunto \"{Assunto}\").",
                _opcoes.UsaOAuth ? "OAuth2" : "senha",
                _opcoes.Username,
                assunto);
        }
        catch (Exception ex)
        {
            // Registra aqui para que todo caminho de envio deixe a causa no log, mesmo quando o
            // chamador engole a falha. Não entram senha, secret, token nem o corpo da mensagem.
            _log.LogError(
                ex,
                "Falha ao enviar e-mail ({Autenticacao}, {Host}:{Porta}, caixa {Caixa}, assunto \"{Assunto}\"): {Detalhe}",
                _opcoes.UsaOAuth ? "OAuth2" : "senha",
                _opcoes.Host,
                _opcoes.Port,
                _opcoes.Username,
                assunto,
                ex.Message);
            throw;
        }
    }

    private async Task EnviarSemRegistroAsync(string email, EmailConteudo conteudo, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_opcoes.Host)
            || string.IsNullOrWhiteSpace(_opcoes.From)
            || (!_opcoes.UsaOAuth && string.IsNullOrWhiteSpace(_opcoes.Password)))
        {
            throw new InvalidOperationException("O envio de e-mail não está configurado.");
        }

        var mensagem = new MimeMessage();
        mensagem.From.Add(MailboxAddress.Parse(_opcoes.From));
        mensagem.To.Add(MailboxAddress.Parse(email));
        mensagem.Subject = conteudo.Assunto;
        mensagem.Body = Corpo(conteudo, _urlPublica);

        using var cliente = new SmtpClient();
        var soquete = _opcoes.StartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await cliente.ConnectAsync(_opcoes.Host, _opcoes.Port, soquete, cancellationToken);
        if (_opcoes.UsaOAuth)
        {
            var token = await TokenSmtpEntra.ObterAsync(_opcoes, cancellationToken);
            await cliente.AuthenticateAsync(new SaslMechanismOAuth2(_opcoes.Username, token), cancellationToken);
        }
        else
        {
            await cliente.AuthenticateAsync(_opcoes.Username, _opcoes.Password, cancellationToken);
        }
        await cliente.SendAsync(mensagem, cancellationToken);
        await cliente.DisconnectAsync(true, cancellationToken);
    }

    /// <summary>HTML com o layout da marca e a mesma mensagem em texto puro (multipart/alternative).</summary>
    public static MimeEntity Corpo(EmailConteudo conteudo, string? urlPublica) =>
        new BodyBuilder
        {
            HtmlBody = EmailModelo.Html(conteudo, urlPublica),
            TextBody = EmailModelo.Texto(conteudo),
        }.ToMessageBody();
}
