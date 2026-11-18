using Microsoft.Extensions.Options;
using Project.Application.Negocio;

namespace Project.Infrastructure.Conta;

/// <summary>Envio de e-mail em texto puro pelo mesmo SMTP da conta (SPEC-030: link de leitura do contrato).</summary>
public sealed class MailKitEnvioEmail(IOptions<EmailOpcoes> opcoes) : IEnvioEmail
{
    private readonly MailKitEmailSender _remetente = new(opcoes);

    public Task EnviarAsync(string email, string assunto, string texto, CancellationToken ct) =>
        _remetente.EnviarAsync(email, assunto, texto, ct);
}
