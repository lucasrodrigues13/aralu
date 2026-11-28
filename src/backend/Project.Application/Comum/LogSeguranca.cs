using System.Text;
using Microsoft.Extensions.Logging;
using Project.Domain.Eventos;

namespace Project.Application.Comum;

/// <summary>Motivo de <c>login_falhou</c> (A09-001).</summary>
public enum MotivoLoginFalhou
{
    Inexistente,
    Senha,
    SemMembro,
}

/// <summary>
/// Eventos de segurança (A09-001) na categoria <see cref="Categoria"/>, sempre com <see cref="EventId"/> fixo e
/// campos estruturados. Nunca leva senha, token nem código; e-mail só mascarado. A mensagem é um modelo fixo:
/// entrada do usuário só entra como valor de campo, já sem caracteres de controle (CWE-117).
/// </summary>
public sealed class LogSeguranca
{
    public const string Categoria = "aralu.seguranca";

    public static class Eventos
    {
        public static readonly EventId LoginFalhou = new(9001, "login_falhou");
        public static readonly EventId LoginBloqueado = new(9002, "login_bloqueado");
        public static readonly EventId LoginOk = new(9003, "login_ok");
        public static readonly EventId SenhaRedefinida = new(9004, "senha_redefinida");
        public static readonly EventId SenhaTrocada = new(9005, "senha_trocada");
        public static readonly EventId SessaoEncerrada = new(9006, "sessao_encerrada");
        public static readonly EventId AdminOperouConta = new(9007, "admin_operou_conta");
        public static readonly EventId RateLimit = new(9008, "rate_limit");
        public static readonly EventId CodigoLinkEsgotado = new(9009, "codigo_link_esgotado");
    }

    private static readonly Action<ILogger, string, string, string, Exception?> LoginFalhouMsg =
        LoggerMessage.Define<string, string, string>(LogLevel.Warning, Eventos.LoginFalhou,
            "login_falhou {Email} {Ip} {Motivo}");

    private static readonly Action<ILogger, string, string, string, Exception?> LoginBloqueadoMsg =
        LoggerMessage.Define<string, string, string>(LogLevel.Warning, Eventos.LoginBloqueado,
            "login_bloqueado {UsuarioId} {Email} {Ip}");

    private static readonly Action<ILogger, string, string, Exception?> LoginOkMsg =
        LoggerMessage.Define<string, string>(LogLevel.Information, Eventos.LoginOk, "login_ok {UsuarioId} {Ip}");

    private static readonly Action<ILogger, string, Exception?> SenhaRedefinidaMsg =
        LoggerMessage.Define<string>(LogLevel.Information, Eventos.SenhaRedefinida, "senha_redefinida {UsuarioId}");

    private static readonly Action<ILogger, string, Exception?> SenhaTrocadaMsg =
        LoggerMessage.Define<string>(LogLevel.Information, Eventos.SenhaTrocada, "senha_trocada {UsuarioId}");

    private static readonly Action<ILogger, string, string, Exception?> SessaoEncerradaMsg =
        LoggerMessage.Define<string, string>(LogLevel.Information, Eventos.SessaoEncerrada,
            "sessao_encerrada {UsuarioId} {Motivo}");

    private static readonly Action<ILogger, string, string, string, string, Exception?> AdminOperouContaMsg =
        LoggerMessage.Define<string, string, string, string>(LogLevel.Information, Eventos.AdminOperouConta,
            "admin_operou_conta {AdminId} {ContaId} {Metodo} {Rota}");

    private static readonly Action<ILogger, string, string, string, Exception?> RateLimitMsg =
        LoggerMessage.Define<string, string, string>(LogLevel.Warning, Eventos.RateLimit,
            "rate_limit {Politica} {Ip} {Rota}");

    private static readonly Action<ILogger, string, string, Exception?> CodigoLinkEsgotadoMsg =
        LoggerMessage.Define<string, string>(LogLevel.Warning, Eventos.CodigoLinkEsgotado,
            "codigo_link_esgotado {Tipo} {LinkId}");

    private readonly ILogger _log;

    public LogSeguranca(ILoggerFactory fabrica) => _log = fabrica.CreateLogger(Categoria);

    public void LoginFalhou(string? email, string? ip, MotivoLoginFalhou motivo) =>
        LoginFalhouMsg(_log, EmailMascarado(email), Limpo(ip), NomeDoMotivo(motivo), null);

    public void LoginBloqueado(string usuarioId, string? email, string? ip) =>
        LoginBloqueadoMsg(_log, Limpo(usuarioId), EmailMascarado(email), Limpo(ip), null);

    public void LoginOk(string usuarioId, string? ip) => LoginOkMsg(_log, Limpo(usuarioId), Limpo(ip), null);

    public void SenhaRedefinida(string usuarioId) => SenhaRedefinidaMsg(_log, Limpo(usuarioId), null);

    public void SenhaTrocada(string usuarioId) => SenhaTrocadaMsg(_log, Limpo(usuarioId), null);

    public void SessaoEncerrada(string usuarioId, string motivo) =>
        SessaoEncerradaMsg(_log, Limpo(usuarioId), Limpo(motivo), null);

    public void AdminOperouConta(string? adminId, string contaId, string metodo, string? rota) =>
        AdminOperouContaMsg(_log, Limpo(adminId), Limpo(contaId), Limpo(metodo), Limpo(rota), null);

    public void RateLimit(string? politica, string? ip, string? rota) =>
        RateLimitMsg(_log, Limpo(politica), Limpo(ip), Limpo(rota), null);

    /// <summary><paramref name="tipo"/>: <c>link_cliente</c> ou <c>briefing</c>.</summary>
    public void CodigoLinkEsgotado(string tipo, Guid linkId) =>
        CodigoLinkEsgotadoMsg(_log, Limpo(tipo), linkId.ToString(), null);

    public static string NomeDoMotivo(MotivoLoginFalhou motivo) => motivo switch
    {
        MotivoLoginFalhou.Inexistente => "inexistente",
        MotivoLoginFalhou.Senha => "senha",
        _ => "sem_membro",
    };

    /// <summary>E-mail mascarado (<see cref="RegrasAcessoCliente.Mascarar"/>), limpo e curto.</summary>
    public static string EmailMascarado(string? email) =>
        string.IsNullOrWhiteSpace(email) ? "-" : Limpo(RegrasAcessoCliente.Mascarar(email.Trim()));

    /// <summary>Tira caracteres de controle (quebra de linha etc.) e limita o tamanho (CWE-117).</summary>
    public static string Limpo(string? valor)
    {
        if (string.IsNullOrEmpty(valor))
        {
            return "-";
        }

        var texto = new StringBuilder(Math.Min(valor.Length, 200));
        foreach (var caractere in valor)
        {
            if (texto.Length >= 200)
            {
                break;
            }

            texto.Append(char.IsControl(caractere) || caractere is (char)0x2028 or (char)0x2029 ? '_' : caractere);
        }

        return texto.ToString();
    }
}
