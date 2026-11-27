using System.Security.Cryptography;
using System.Text;
using Project.Application.Comum;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

/// <summary>E-mail de cliente do evento como a página do link vê: só mascarado (SPEC-063 R2).</summary>
public sealed record EmailDoLink(Guid ClienteId, string Email);

/// <summary>
/// O que a página do link recebe antes do código (SPEC-063 §6.1). <paramref name="AguardarSegundos"/> é o tempo
/// até poder pedir outro código (0 = pode pedir agora).
/// </summary>
public sealed record AcessoLinkLeitura(
    string Evento,
    IReadOnlyList<EmailDoLink> Emails,
    bool SessaoValida,
    int AguardarSegundos,
    bool CodigoEnviado = false,
    string? EnviadoPara = null);

public sealed record PedirCodigoLink(Guid? ClienteId);

public sealed record ConfirmarCodigoLink(string? Codigo);

/// <summary>Sessão aberta: o token vai só no cookie do navegador; o banco guarda o hash.</summary>
public sealed record SessaoAberta(string Token, DateTimeOffset ExpiraEm);

public interface IDadosAcessoLinkCliente
{
    Task<IReadOnlyList<(Guid ClienteId, string Email)>> ListarEmailsClientesAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<CodigoAcessoCliente>> ListarCodigosAsync(Guid linkId, DateTimeOffset desde, CancellationToken ct);

    Task<SessaoLinkCliente?> ObterSessaoAsync(Guid linkId, string tokenHash, CancellationToken ct);

    Task InserirCodigoAsync(CodigoAcessoCliente codigo, CancellationToken ct);

    Task InserirSessaoAsync(SessaoLinkCliente sessao, CancellationToken ct);

    /// <summary>Derruba códigos e sessões do link (link gerado de novo, SPEC-063 R6).</summary>
    Task RemoverAcessosAsync(Guid linkId, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>
/// Código de acesso do link do cliente (SPEC-063): todo link só abre depois que o cliente digita o código enviado
/// para o e-mail de um cliente do evento. O cliente continua sem login (SPEC-060).
/// </summary>
public sealed class AcessoLinkClienteServico(
    IDadosLinkCliente links,
    IDadosAcessoLinkCliente dados,
    IEnvioEmail email,
    LogSeguranca? seguranca = null)
{
    public const string SemEmail = "Fale com a organizadora do evento.";
    public const string ForaDaLista = "Escolha um dos e-mails da lista.";
    public const string Incorreto = "Código incorreto. Você tem mais {0} tentativas.";
    public const string Esgotado = "Este código não vale mais. Peça um novo.";
    public const string Expirado = "Este código expirou. Peça um novo.";
    public const string SessaoVencida = "Para sua segurança, digite o código enviado ao seu e-mail.";

    public async Task<Resultado<AcessoLinkLeitura>> LerAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var (link, evento) = await ResolverAsync(token, ct);
        if (link is null || evento is null)
        {
            return Resultado<AcessoLinkLeitura>.Erro(Codigos.Indisponivel, "Link inválido.");
        }

        var valida = await SessaoValidaAsync(link, sessao, agora, ct);
        var emails = await EmailsAsync(link, ct);
        var codigos = await dados.ListarCodigosAsync(link.Id, agora - TimeSpan.FromHours(1), ct);
        var pendente = codigos.Any(item => !item.Invalidado && item.UsadoEm is null && item.ExpiraEm > agora && item.Tentativas < RegrasAcessoCliente.TentativasMaximas);
        return Resultado<AcessoLinkLeitura>.Sucesso(new AcessoLinkLeitura(
            evento.Nome,
            emails.Select(item => new EmailDoLink(item.ClienteId, RegrasAcessoCliente.Mascarar(item.Email))).ToArray(),
            valida,
            Aguardar(codigos, agora),
            pendente));
    }

    /// <summary>Envia um código de 6 dígitos (SPEC-063 §6.3). Recusa e-mail fora da lista e pedidos rápidos demais (R5).</summary>
    public async Task<Resultado<AcessoLinkLeitura>> PedirCodigoAsync(string token, PedirCodigoLink pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var (link, evento) = await ResolverAsync(token, ct);
        if (link is null || evento is null)
        {
            return Resultado<AcessoLinkLeitura>.Erro(Codigos.Indisponivel, "Link inválido.");
        }

        var emails = await EmailsAsync(link, ct);
        if (emails.Count == 0)
        {
            return Resultado<AcessoLinkLeitura>.Erro(Codigos.Validacao, SemEmail);
        }

        var destino = emails.FirstOrDefault(item => item.ClienteId == pedido.ClienteId);
        if (destino.Email is null)
        {
            return Resultado<AcessoLinkLeitura>.Erro(Codigos.Validacao, ForaDaLista);
        }

        var codigos = await dados.ListarCodigosAsync(link.Id, agora - TimeSpan.FromHours(1), ct);
        if (RegrasAcessoCliente.ProximoPedido(codigos.Select(item => item.CriadoEm), agora) is { } bloqueio)
        {
            var falta = bloqueio.Liberado - agora;
            return Resultado<AcessoLinkLeitura>.Erro(
                Codigos.Validacao,
                bloqueio.Espera
                    ? $"Você pediu vários códigos. Aguarde {Math.Max(1, (int)Math.Ceiling(falta.TotalMinutes))} minutos para pedir outro."
                    : $"Aguarde {Math.Max(1, (int)Math.Ceiling(falta.TotalSeconds))} segundos para pedir outro código.");
        }

        foreach (var anterior in codigos)
        {
            anterior.Invalidado = true;
        }

        var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var novo = new CodigoAcessoCliente
        {
            Id = Guid.NewGuid(),
            LinkId = link.Id,
            ContaId = link.ContaId,
            Email = destino.Email,
            CodigoHash = Hash(link.Id, codigo),
            CriadoEm = agora,
            ExpiraEm = agora + RegrasAcessoCliente.ValidadeCodigo,
        };
        await dados.InserirCodigoAsync(novo, ct);
        await dados.SalvarAsync(ct);

        var minutos = (int)RegrasAcessoCliente.ValidadeCodigo.TotalMinutes;
        await email.EnviarAsync(
            destino.Email,
            new EmailConteudo(
                "Seu código para abrir o link do evento",
                $"Use o código {codigo} para abrir o link de {evento.Nome}.",
                "Seu código de acesso",
                [
                    $"Use este código para abrir o link do evento {evento.Nome}:",
                    codigo,
                    $"O código vale {minutos} minutos.",
                ],
                Nota: "Se você não pediu este código, ignore este e-mail."),
            ct);

        var todos = codigos.Append(novo).ToArray();
        return Resultado<AcessoLinkLeitura>.Sucesso(new AcessoLinkLeitura(
            evento.Nome,
            emails.Select(item => new EmailDoLink(item.ClienteId, RegrasAcessoCliente.Mascarar(item.Email))).ToArray(),
            false,
            Aguardar(todos, agora),
            true,
            RegrasAcessoCliente.Mascarar(destino.Email)));
    }

    /// <summary>Confere o código (R4) e abre a sessão de 7 dias (R6).</summary>
    public async Task<Resultado<SessaoAberta>> ConfirmarAsync(string token, ConfirmarCodigoLink pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var (link, evento) = await ResolverAsync(token, ct);
        if (link is null || evento is null)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Indisponivel, "Link inválido.");
        }

        var codigos = await dados.ListarCodigosAsync(link.Id, agora - TimeSpan.FromHours(1), ct);
        var atual = codigos.Where(item => !item.Invalidado && item.UsadoEm is null).MaxBy(item => item.CriadoEm);
        if (atual is null || atual.Tentativas >= RegrasAcessoCliente.TentativasMaximas)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Validacao, atual is null ? Expirado : Esgotado);
        }

        if (agora >= atual.ExpiraEm)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Validacao, Expirado);
        }

        var digitado = new string((pedido.Codigo ?? "").Where(char.IsDigit).ToArray());
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Hash(link.Id, digitado)), Encoding.ASCII.GetBytes(atual.CodigoHash)))
        {
            atual.Tentativas++;
            await dados.SalvarAsync(ct);
            var restam = RegrasAcessoCliente.TentativasMaximas - atual.Tentativas;
            if (restam <= 0)
            {
                seguranca?.CodigoLinkEsgotado("link_cliente", link.Id);
            }

            return Resultado<SessaoAberta>.Erro(Codigos.Validacao, restam > 0 ? string.Format(Incorreto, restam) : Esgotado);
        }

        atual.UsadoEm = agora;
        var sessaoToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var sessao = new SessaoLinkCliente
        {
            Id = Guid.NewGuid(),
            LinkId = link.Id,
            ContaId = link.ContaId,
            TokenHash = Hash(link.Id, sessaoToken),
            CriadaEm = agora,
            UltimoAcesso = agora,
            ExpiraEm = agora + RegrasAcessoCliente.ValidadeSessao,
        };
        await dados.InserirSessaoAsync(sessao, ct);
        await dados.SalvarAsync(ct);
        return Resultado<SessaoAberta>.Sucesso(new SessaoAberta(sessaoToken, sessao.ExpiraEm));
    }

    /// <summary>
    /// Confere a sessão do navegador em toda rota do link (R1) e renova a validade a cada uso (R6).
    /// Devolve a nova expiração, ou nulo quando não há sessão válida. Link que não existe passa como
    /// <paramref name="LinkExiste"/> falso, para a rota responder "Link inválido".
    /// </summary>
    public async Task<(bool LinkExiste, DateTimeOffset? Expira)> ValidarSessaoAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var link = string.IsNullOrWhiteSpace(token) ? null : await links.ObterPorTokenAsync(token, ct);
        if (link is null)
        {
            return (false, null);
        }

        if (string.IsNullOrWhiteSpace(sessao))
        {
            return (true, null);
        }

        var registro = await dados.ObterSessaoAsync(link.Id, Hash(link.Id, sessao), ct);
        if (registro is null || registro.ExpiraEm <= agora)
        {
            return (true, null);
        }

        registro.UltimoAcesso = agora;
        registro.ExpiraEm = agora + RegrasAcessoCliente.ValidadeSessao;
        await dados.SalvarAsync(ct);
        return (true, registro.ExpiraEm);
    }

    /// <summary>Se algum cliente do evento tem e-mail (aviso da janela "Link do cliente", SPEC-063 §7).</summary>
    public async Task<bool> TemClienteComEmailAsync(Guid contaId, Guid eventoId, CancellationToken ct) =>
        (await dados.ListarEmailsClientesAsync(contaId, eventoId, ct)).Count > 0;

    private async Task<bool> SessaoValidaAsync(LinkCliente link, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(sessao))
        {
            return false;
        }

        var registro = await dados.ObterSessaoAsync(link.Id, Hash(link.Id, sessao), ct);
        return registro is not null && registro.ExpiraEm > agora;
    }

    private async Task<(LinkCliente? Link, EventoDoLink? Evento)> ResolverAsync(string token, CancellationToken ct)
    {
        var link = string.IsNullOrWhiteSpace(token) ? null : await links.ObterPorTokenAsync(token, ct);
        var evento = link is null ? null : await links.ObterEventoAsync(link.ContaId, link.EventoId, ct);
        return (link, evento);
    }

    private Task<IReadOnlyList<(Guid ClienteId, string Email)>> EmailsAsync(LinkCliente link, CancellationToken ct) =>
        dados.ListarEmailsClientesAsync(link.ContaId, link.EventoId, ct);

    private static int Aguardar(IEnumerable<CodigoAcessoCliente> codigos, DateTimeOffset agora) =>
        RegrasAcessoCliente.ProximoPedido(codigos.Select(item => item.CriadoEm), agora) is { } bloqueio
            ? Math.Max(1, (int)Math.Ceiling((bloqueio.Liberado - agora).TotalSeconds))
            : 0;

    private static string Hash(Guid linkId, string valor) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{linkId:N}:{valor}")));
}
