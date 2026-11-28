using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Project.Application.Negocio;

namespace Project.Infrastructure.Conta;

/// <summary>Envio de e-mail do sistema pelo mesmo SMTP da conta, com o layout da marca (EmailModelo).</summary>
public sealed class MailKitEnvioEmail(IOptions<EmailOpcoes> opcoes, ILogger<MailKitEmailSender> log, IConfiguration configuracao) : IEnvioEmail
{
    private readonly MailKitEmailSender _remetente = new(opcoes, log, configuracao);

    public Task EnviarAsync(string email, EmailConteudo conteudo, CancellationToken ct) =>
        _remetente.EnviarAsync(email, conteudo, ct);
}
