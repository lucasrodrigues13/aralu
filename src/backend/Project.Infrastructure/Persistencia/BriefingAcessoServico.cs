using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Eventos;
using Project.Domain.Funil;

namespace Project.Infrastructure.Persistencia;

/// <summary>E-mail do lead como a página vê: só mascarado.</summary>
public sealed record EmailDoBriefing(Guid Id, string Email);

/// <summary>O que a página recebe antes do código (SPEC-066 §5, mesmas regras da SPEC-063 §6.1).</summary>
public sealed record AcessoBriefingLeitura(
    string? Empresa,
    string Nome,
    IReadOnlyList<EmailDoBriefing> Emails,
    bool SessaoValida,
    int AguardarSegundos,
    bool CodigoEnviado = false,
    string? EnviadoPara = null);

public sealed record PedirCodigoBriefing(Guid? EmailId);

public sealed record ConfirmarCodigoBriefing(string? Codigo);

/// <summary>Briefing aberto pelo cliente depois do código.</summary>
public sealed record BriefingPublicoLeitura(
    string? Empresa,
    string Nome,
    IReadOnlyList<ItemBriefingLeadLeitura> Itens,
    DateTimeOffset? RespondidoEm,
    DateTimeOffset? ValidoAte);

public sealed record ResponderBriefingPublico(IReadOnlyList<RespostaBriefingLead>? Respostas, bool Concluir = false);

/// <summary>
/// Briefing preenchido pelo cliente (SPEC-066): o link só abre depois do código enviado ao e-mail de um contato
/// do lead. Reaproveita as regras do link do cliente (<see cref="RegrasAcessoCliente"/>): 6 dígitos, 10 minutos,
/// 5 tentativas, 1 pedido a cada 2 minutos com espera de 15 depois de 3, sessão de 7 dias.
/// </summary>
public sealed class BriefingAcessoServico(AppDbContext banco, IEnvioEmail email)
{
    public const string Indisponivel = "Este briefing não está disponível. Fale com a assessoria.";
    public const string Concluido = "Este briefing já foi enviado. Obrigado! Se precisar mudar algo, fale com a assessoria.";
    public const string SessaoVencida = "Para sua segurança, digite o código enviado ao seu e-mail.";

    public async Task<Resultado<AcessoBriefingLeitura>> LerAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var (briefing, erro) = await AbertoAsync(token, agora, ct);
        if (briefing is null)
        {
            return Resultado<AcessoBriefingLeitura>.Erro(Codigos.Indisponivel, erro!);
        }

        var codigos = await CodigosAsync(briefing.Id, agora, ct);
        var pendente = codigos.Any(item => !item.Invalidado && item.UsadoEm is null && item.ExpiraEm > agora && item.Tentativas < RegrasAcessoCliente.TentativasMaximas);
        var (empresa, nome) = await CabecalhoAsync(briefing, ct);
        return Resultado<AcessoBriefingLeitura>.Sucesso(new AcessoBriefingLeitura(
            empresa,
            nome,
            await EmailsMascaradosAsync(briefing, ct),
            await SessaoAsync(briefing, sessao, agora, ct) is not null,
            Aguardar(codigos, agora),
            pendente));
    }

    public async Task<Resultado<AcessoBriefingLeitura>> PedirCodigoAsync(string token, PedirCodigoBriefing pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var (briefing, erro) = await AbertoAsync(token, agora, ct);
        if (briefing is null)
        {
            return Resultado<AcessoBriefingLeitura>.Erro(Codigos.Indisponivel, erro!);
        }

        var emails = await EmailsDoLeadAsync(banco, briefing.OportunidadeId, ct);
        var destino = emails.FirstOrDefault(item => item.Id == pedido.EmailId);
        if (destino is null)
        {
            return Resultado<AcessoBriefingLeitura>.Erro(Codigos.Validacao, emails.Count == 0 ? Indisponivel : "Escolha um dos e-mails da lista.");
        }

        var codigos = await CodigosAsync(briefing.Id, agora, ct);
        if (RegrasAcessoCliente.ProximoPedido(codigos.Select(item => item.CriadoEm), agora) is { } bloqueio)
        {
            var falta = bloqueio.Liberado - agora;
            return Resultado<AcessoBriefingLeitura>.Erro(
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
        var novo = new CodigoAcessoBriefing
        {
            Id = Guid.NewGuid(),
            BriefingId = briefing.Id,
            ContaId = briefing.ContaId,
            Email = destino.Email,
            CodigoHash = Hash(briefing.Id, codigo),
            CriadoEm = agora,
            ExpiraEm = agora + RegrasAcessoCliente.ValidadeCodigo,
        };
        banco.CodigosAcessoBriefing.Add(novo);
        await banco.SaveChangesAsync(ct);

        var (empresa, nome) = await CabecalhoAsync(briefing, ct);
        var de = string.IsNullOrWhiteSpace(empresa) ? "da assessoria" : $"de {empresa}";
        var minutos = (int)RegrasAcessoCliente.ValidadeCodigo.TotalMinutes;
        await email.EnviarAsync(
            destino.Email,
            new EmailConteudo(
                "Seu código para abrir o briefing",
                $"Use o código {codigo} para abrir o briefing {de}.",
                "Seu código de acesso",
                [
                    $"Use este código para abrir o briefing {de}:",
                    codigo,
                    $"O código vale {minutos} minutos.",
                ],
                Nota: "Se você não pediu este código, ignore este e-mail."),
            ct);

        return Resultado<AcessoBriefingLeitura>.Sucesso(new AcessoBriefingLeitura(
            empresa,
            nome,
            await EmailsMascaradosAsync(briefing, ct),
            false,
            Aguardar(codigos.Append(novo), agora),
            true,
            RegrasAcessoCliente.Mascarar(destino.Email)));
    }

    /// <summary>Confere o código e abre a sessão. Devolve o token da sessão (vai só no cookie).</summary>
    public async Task<Resultado<SessaoAberta>> ConfirmarAsync(string token, ConfirmarCodigoBriefing pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var (briefing, erro) = await AbertoAsync(token, agora, ct);
        if (briefing is null)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Indisponivel, erro!);
        }

        var codigos = await CodigosAsync(briefing.Id, agora, ct);
        var atual = codigos.Where(item => !item.Invalidado && item.UsadoEm is null).MaxBy(item => item.CriadoEm);
        if (atual is null || agora >= atual.ExpiraEm)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Validacao, AcessoLinkClienteServico.Expirado);
        }

        if (atual.Tentativas >= RegrasAcessoCliente.TentativasMaximas)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Validacao, AcessoLinkClienteServico.Esgotado);
        }

        var digitado = new string((pedido.Codigo ?? "").Where(char.IsDigit).ToArray());
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Hash(briefing.Id, digitado)), Encoding.ASCII.GetBytes(atual.CodigoHash)))
        {
            atual.Tentativas++;
            await banco.SaveChangesAsync(ct);
            var restam = RegrasAcessoCliente.TentativasMaximas - atual.Tentativas;
            return Resultado<SessaoAberta>.Erro(
                Codigos.Validacao,
                restam > 0 ? string.Format(AcessoLinkClienteServico.Incorreto, restam) : AcessoLinkClienteServico.Esgotado);
        }

        atual.UsadoEm = agora;
        var sessaoToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var sessao = new SessaoBriefing
        {
            Id = Guid.NewGuid(),
            BriefingId = briefing.Id,
            ContaId = briefing.ContaId,
            TokenHash = Hash(briefing.Id, sessaoToken),
            CriadaEm = agora,
            ExpiraEm = agora + RegrasAcessoCliente.ValidadeSessao,
        };
        banco.SessoesBriefing.Add(sessao);
        await banco.SaveChangesAsync(ct);
        return Resultado<SessaoAberta>.Sucesso(new SessaoAberta(sessaoToken, sessao.ExpiraEm));
    }

    public async Task<Resultado<BriefingPublicoLeitura>> ObterAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var (briefing, falha) = await ComSessaoAsync(token, sessao, agora, ct);
        return briefing is null
            ? Resultado<BriefingPublicoLeitura>.Erro(falha!.Value.Codigo, falha.Value.Mensagem)
            : Resultado<BriefingPublicoLeitura>.Sucesso(await LerPublicoAsync(briefing, ct));
    }

    /// <summary>Salva as respostas. <c>Concluir</c> fecha o link: as respostas ficam com a organizadora.</summary>
    public async Task<Resultado<BriefingPublicoLeitura>> ResponderAsync(
        string token,
        string? sessao,
        ResponderBriefingPublico pedido,
        DateTimeOffset agora,
        CancellationToken ct)
    {
        var (briefing, falha) = await ComSessaoAsync(token, sessao, agora, ct);
        if (briefing is null)
        {
            return Resultado<BriefingPublicoLeitura>.Erro(falha!.Value.Codigo, falha.Value.Mensagem);
        }

        foreach (var resposta in pedido.Respostas ?? [])
        {
            var texto = Domain.Comum.Texto.Limpo(resposta.Resposta);
            if (texto is not null && texto.Length > BriefingLeadServico.LimiteResposta)
            {
                return Resultado<BriefingPublicoLeitura>.Erro(Codigos.Validacao, $"A resposta pode ter até {BriefingLeadServico.LimiteResposta} caracteres.");
            }

            var item = briefing.Itens.FirstOrDefault(i => i.Id == resposta.Id);
            if (item is not null)
            {
                item.Resposta = texto;
            }
        }

        briefing.RespondidoEm = agora;
        if (pedido.Concluir)
        {
            briefing.ConcluidoEm = agora;
            await banco.SessoesBriefing.Where(item => item.BriefingId == briefing.Id).ExecuteDeleteAsync(ct);
        }

        await banco.SaveChangesAsync(ct);
        return Resultado<BriefingPublicoLeitura>.Sucesso(await LerPublicoAsync(briefing, ct));
    }

    /// <summary>E-mails dos contatos do lead e do contratante, sem repetir.</summary>
    internal static async Task<IReadOnlyList<EmailDoBriefing>> EmailsDoLeadAsync(AppDbContext banco, Guid oportunidadeId, CancellationToken ct)
    {
        var lead = await banco.Oportunidades.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.Id == oportunidadeId)
            .Select(item => new { item.Id, item.ContratanteEmail, Contatos = item.Contatos.Select(c => new { c.Id, c.Email }).ToList() })
            .FirstOrDefaultAsync(ct);
        if (lead is null)
        {
            return [];
        }

        var lista = lead.Contatos
            .Where(c => !string.IsNullOrWhiteSpace(c.Email))
            .Select(c => new EmailDoBriefing(c.Id, c.Email!.Trim()))
            .ToList();
        if (!string.IsNullOrWhiteSpace(lead.ContratanteEmail))
        {
            lista.Add(new EmailDoBriefing(lead.Id, lead.ContratanteEmail.Trim()));
        }

        return lista.DistinctBy(item => item.Email.ToLowerInvariant()).ToArray();
    }

    private async Task<(BriefingOportunidade? Briefing, string? Erro)> AbertoAsync(string token, DateTimeOffset agora, CancellationToken ct)
    {
        var briefing = string.IsNullOrWhiteSpace(token)
            ? null
            : await banco.BriefingsOportunidade.IgnoreQueryFilters()
                .Include(item => item.Itens)
                .FirstOrDefaultAsync(item => item.TokenLink == token, ct);
        if (briefing is null || !briefing.AbertoParaCliente(agora))
        {
            return (null, briefing?.ConcluidoEm is not null && briefing.LiberadoEm is not null ? Concluido : Indisponivel);
        }

        return (briefing, null);
    }

    private async Task<(BriefingOportunidade? Briefing, (string Codigo, string Mensagem)? Falha)> ComSessaoAsync(
        string token,
        string? sessao,
        DateTimeOffset agora,
        CancellationToken ct)
    {
        var (briefing, erro) = await AbertoAsync(token, agora, ct);
        if (briefing is null)
        {
            return (null, (Codigos.Indisponivel, erro!));
        }

        if (await SessaoAsync(briefing, sessao, agora, ct) is null)
        {
            return (null, (CodigoSessao, SessaoVencida));
        }

        return (briefing, null);
    }

    /// <summary>Código de erro que a API devolve como 401 (sessão ausente ou vencida).</summary>
    public const string CodigoSessao = "sessao";

    private async Task<SessaoBriefing?> SessaoAsync(BriefingOportunidade briefing, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(sessao))
        {
            return null;
        }

        var hash = Hash(briefing.Id, sessao);
        return await banco.SessoesBriefing.IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.BriefingId == briefing.Id && item.TokenHash == hash && item.ExpiraEm > agora, ct);
    }

    private async Task<List<CodigoAcessoBriefing>> CodigosAsync(Guid briefingId, DateTimeOffset agora, CancellationToken ct)
    {
        var desde = agora - TimeSpan.FromHours(1);
        return await banco.CodigosAcessoBriefing.IgnoreQueryFilters()
            .Where(item => item.BriefingId == briefingId && item.CriadoEm >= desde)
            .ToListAsync(ct);
    }

    private async Task<IReadOnlyList<EmailDoBriefing>> EmailsMascaradosAsync(BriefingOportunidade briefing, CancellationToken ct) =>
        (await EmailsDoLeadAsync(banco, briefing.OportunidadeId, ct))
            .Select(item => item with { Email = RegrasAcessoCliente.Mascarar(item.Email) })
            .ToArray();

    private async Task<(string? Empresa, string Nome)> CabecalhoAsync(BriefingOportunidade briefing, CancellationToken ct)
    {
        var nome = await banco.Oportunidades.IgnoreQueryFilters()
            .Where(item => item.Id == briefing.OportunidadeId)
            .Select(item => item.Nome)
            .FirstOrDefaultAsync(ct) ?? "";
        var empresa = await banco.Perfis.IgnoreQueryFilters()
            .Where(item => item.ContaId == briefing.ContaId)
            .Select(item => item.NomeEmpresa)
            .FirstOrDefaultAsync(ct);
        return (empresa, nome);
    }

    private async Task<BriefingPublicoLeitura> LerPublicoAsync(BriefingOportunidade briefing, CancellationToken ct)
    {
        var (empresa, nome) = await CabecalhoAsync(briefing, ct);
        return new BriefingPublicoLeitura(empresa, nome, BriefingLeadServico.Ler(briefing).Itens, briefing.RespondidoEm, briefing.ValidoAte);
    }

    private static int Aguardar(IEnumerable<CodigoAcessoBriefing> codigos, DateTimeOffset agora) =>
        RegrasAcessoCliente.ProximoPedido(codigos.Select(item => item.CriadoEm), agora) is { } bloqueio
            ? Math.Max(1, (int)Math.Ceiling((bloqueio.Liberado - agora).TotalSeconds))
            : 0;

    private static string Hash(Guid briefingId, string valor) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"briefing:{briefingId:N}:{valor}")));
}
