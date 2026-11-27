using System.Threading.RateLimiting;

namespace Project.Api.Conta;

// Política "login-email" (A06-001): o corpo só é lido no handler, então o limite por e-mail
// é aplicado à mão no Entrar, depois de normalizar o endereço.
public sealed class LimiteLoginPorEmail : IDisposable
{
    private readonly PartitionedRateLimiter<string> _limitador;

    public LimiteLoginPorEmail(int tentativas, TimeSpan janela)
    {
        _limitador = PartitionedRateLimiter.Create<string, string>(email =>
            RateLimitPartition.GetFixedWindowLimiter(
                email,
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = tentativas,
                    Window = janela,
                    QueueLimit = 0,
                }));
    }

    public RateLimitLease Tentar(string emailNormalizado) => _limitador.AttemptAcquire(emailNormalizado.ToUpperInvariant());

    public void Dispose() => _limitador.Dispose();
}
