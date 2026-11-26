using System.Security.Claims;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Domain.Equipe;
using Project.Infrastructure.Conta;

namespace Project.Api.Conta;

/// <summary>Equipe e grupos da conta (SPEC-062 parte C), convite aceito por link e "Minha conta" do membro.</summary>
public static class EquipeEndpoints
{
    public const string ClaimPermissao = "permissao";
    public const string ClaimVeTodos = "ve_todos";
    public const string PoliticaFinanceiro = "Financeiro";

    private static readonly string[] SoDono = [Papeis.Organizer];
    private static readonly string[] SoMembro = [Papeis.Assistant];

    public static void Mapear(WebApplication app)
    {
        app.MapPost("/api/v1/conta/aceitar-convite", AceitarConvite);

        var equipe = app.MapGroup("/api/v1/equipe").RequireAuthorization(policy => policy.RequireRole(SoDono));
        equipe.MapGet("", Listar);
        equipe.MapPost("", Convidar);
        equipe.MapPut("/{id:guid}", Atualizar);
        equipe.MapPost("/{id:guid}/reenviar", Reenviar);
        equipe.MapDelete("/{id:guid}", Desativar);
        equipe.MapPost("/{id:guid}/desativar", Desativar);
        equipe.MapPost("/{id:guid}/reativar", Reativar);

        var grupos = app.MapGroup("/api/v1/grupos-acesso").RequireAuthorization(policy => policy.RequireRole(SoDono));
        grupos.MapGet("", (ClaimsPrincipal u, GrupoServico s, CancellationToken ct) =>
            ComConta(u, async conta => Results.Ok(await s.ListarAsync(conta, ct))));
        grupos.MapPost("", (GrupoPedido pedido, ClaimsPrincipal u, GrupoServico s, CancellationToken ct) =>
            ComConta(u, async conta => Resposta(await s.CriarAsync(conta, pedido, ct), StatusCodes.Status201Created)));
        grupos.MapPut("/{id:guid}", (Guid id, GrupoPedido pedido, ClaimsPrincipal u, GrupoServico s, CancellationToken ct) =>
            ComConta(u, async conta => Resposta(await s.AtualizarAsync(conta, id, pedido, ct))));
        grupos.MapDelete("/{id:guid}", (Guid id, ClaimsPrincipal u, GrupoServico s, CancellationToken ct) =>
            ComConta(u, async conta =>
            {
                var r = await s.ExcluirAsync(conta, id, ct);
                return r.Ok ? Results.NoContent() : Falha(r.Falha!);
            }));

        app.MapGet("/api/v1/admin/assistentes", async (EquipeServico servico, CancellationToken ct) =>
            Results.Ok(await servico.ListarParaAdminAsync(ct))).RequireAuthorization(policy => policy.RequireRole(Papeis.Admin));

        // Seletores de responsável: membros (não Donos) ativos, e nomes de todos, inclusive removidos.
        app.MapGet("/api/v1/assistentes/ativas", (ClaimsPrincipal u, EquipeServico s, CancellationToken ct) =>
            ComConta(u, async conta => Results.Ok(await s.AtivosAsync(conta, ct)))).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        app.MapGet("/api/v1/assistentes/nomes", (ClaimsPrincipal u, EquipeServico s, CancellationToken ct) =>
            ComConta(u, async conta => Results.Ok(await s.NomesAsync(conta, ct)))).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        var propria = app.MapGroup("/api/v1/minha-conta").RequireAuthorization(policy => policy.RequireRole(SoMembro));
        propria.MapGet("", MinhaConta);
        propria.MapPut("", AtualizarMinhaConta);
        propria.MapPost("/senha", TrocarSenha);
    }

    /// <summary>
    /// Lê o membro, o tipo e o grupo no banco a cada pedido (RF-117): o JWT só diz quem a pessoa é.
    /// Troca os papéis do token pelo tipo atual (Dono → Organizer, Membro → Assistant), põe a conta e
    /// as permissões do grupo, e recusa a rota cujo módulo o grupo não libera (R6).
    /// </summary>
    public static async Task AplicarAcesso(HttpContext http, Func<Task> proximo)
    {
        var usuario = http.User;
        if (usuario.Identity is not ClaimsIdentity identidade || !identidade.IsAuthenticated || usuario.IsInRole(Papeis.Admin))
        {
            await proximo();
            return;
        }

        var id = usuario.FindFirstValue(ClaimTypes.NameIdentifier);
        var acesso = string.IsNullOrWhiteSpace(id)
            ? null
            : await http.RequestServices.GetRequiredService<EquipeServico>().AcessoAsync(id, http.RequestAborted);
        if (acesso is not { } achado || achado.Membro.Situacao != SituacaoMembro.Ativa)
        {
            http.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await http.Response.WriteAsJsonAsync(new ErroResposta("acesso_removido", "Seu acesso foi removido."));
            return;
        }

        var (membro, grupo) = achado;
        var claims = identidade.Claims
            .Where(claim => claim.Type != ClaimTypes.Role && claim.Type != ContaClaims.ContaId && claim.Type != ContaClaims.MembroId)
            .ToList();
        claims.Add(new Claim(ClaimTypes.Role, EquipeServico.PapelDo(membro.Tipo)));
        claims.Add(new Claim(ContaClaims.ContaId, membro.ContaId.ToString()));
        claims.Add(new Claim(ContaClaims.MembroId, membro.Id.ToString()));
        if (membro.Tipo == TipoMembro.Membro)
        {
            claims.Add(new Claim(ClaimVeTodos, grupo?.VeTodosEventos == true ? "true" : "false"));
            foreach (var permissao in grupo?.Permissoes ?? [])
            {
                foreach (var acao in Enum.GetValues<AcaoModulo>().Where(permissao.Permite))
                {
                    claims.Add(new Claim(ClaimPermissao, $"{permissao.Modulo}:{acao}"));
                }
            }
        }

        http.User = new ClaimsPrincipal(new ClaimsIdentity(claims, identidade.AuthenticationType, identidade.NameClaimType, ClaimTypes.Role));

        if (membro.Tipo == TipoMembro.Membro
            && PermissaoPorRota.De(http.Request.Method, http.Request.Path.Value ?? "") is { } exigida
            && !Pode(http.User, exigida.Modulo, exigida.Acao))
        {
            http.Response.StatusCode = StatusCodes.Status403Forbidden;
            await http.Response.WriteAsJsonAsync(new ErroResposta(
                "sem_permissao",
                $"Você não tem permissão para {PermissaoPorRota.Verbo(exigida.Acao)} em {PermissaoPorRota.Nome(exigida.Modulo)}. Fale com o responsável pela conta."));
            return;
        }

        await proximo();
    }

    /// <summary>Dono (e Admin operando a conta) pode tudo; Membro, o que o grupo libera.</summary>
    public static bool Pode(ClaimsPrincipal usuario, Modulo modulo, AcaoModulo acao) =>
        usuario.IsInRole(Papeis.Organizer)
        || (usuario.IsInRole(Papeis.Assistant) && usuario.HasClaim(ClaimPermissao, $"{modulo}:{acao}"));

    public static bool PodeVerFinanceiro(ClaimsPrincipal usuario) => Pode(usuario, Modulo.Financeiro, AcaoModulo.Ver);

    private static async Task<IResult> ComConta(ClaimsPrincipal usuario, Func<Guid, Task<IResult>> acao) =>
        ContaAtual.De(usuario) is { } conta ? await acao(conta) : Results.Unauthorized();

    private static IResult Resposta<T>(Resultado<T> r, int status = StatusCodes.Status200OK) =>
        r.Ok ? Results.Json(r.Valor, statusCode: status) : Falha(r.Falha!);

    private static async Task<IResult> AceitarConvite(AceitarConvitePedido pedido, EquipeServico servico, CancellationToken ct)
    {
        var resultado = await servico.AceitarConviteAsync(pedido.UsuarioId, pedido.Token, pedido.Senha, pedido.Confirmacao, ct);
        return resultado.Ok ? Results.Ok(new { mensagem = "Senha criada." }) : Falha(resultado.Falha!);
    }

    private static Task<IResult> Listar(ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, ct)));

    private static Task<IResult> Convidar(MembroPedido pedido, ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Resposta(await servico.ConvidarAsync(conta, pedido, ct), StatusCodes.Status201Created));

    private static Task<IResult> Atualizar(Guid id, MembroPedido pedido, ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Resposta(await servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> Reenviar(Guid id, ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Resposta(await servico.ReenviarAsync(conta, id, ct)));

    private static Task<IResult> Desativar(Guid id, ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var resultado = await servico.DesativarAsync(conta, id, ct);
            return resultado.Ok ? Results.NoContent() : Falha(resultado.Falha!);
        });

    private static Task<IResult> Reativar(Guid id, ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Resposta(await servico.ReativarAsync(conta, id, ct)));

    private static async Task<IResult> MinhaConta(ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        Resposta(await servico.MinhaContaAsync(usuario.FindFirstValue(ClaimTypes.NameIdentifier) ?? "", ct));

    private static async Task<IResult> AtualizarMinhaConta(AtualizarMinhaConta pedido, ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct) =>
        Resposta(await servico.AtualizarMinhaContaAsync(usuario.FindFirstValue(ClaimTypes.NameIdentifier) ?? "", pedido, ct));

    private static async Task<IResult> TrocarSenha(TrocarSenhaPedido pedido, ClaimsPrincipal usuario, EquipeServico servico, CancellationToken ct)
    {
        var resultado = await servico.TrocarSenhaAsync(usuario.FindFirstValue(ClaimTypes.NameIdentifier) ?? "", pedido.Atual, pedido.Nova, ct);
        return resultado.Ok ? Results.Ok(new { mensagem = "Senha alterada." }) : Falha(resultado.Falha!);
    }

    private static IResult Falha(Falha falha) =>
        Results.Json(
            new ErroResposta(falha.Codigo, falha.Mensagem),
            statusCode: falha.Codigo switch
            {
                Codigos.Indisponivel => StatusCodes.Status404NotFound,
                EquipeServico.ErroJaMembro or EquipeServico.ErroUltimoDono or GrupoServico.ErroComMembros => StatusCodes.Status409Conflict,
                _ => StatusCodes.Status400BadRequest,
            });
}

public sealed record AceitarConvitePedido(string? UsuarioId, string? Token, string? Senha, string? Confirmacao);

public sealed record TrocarSenhaPedido(string? Atual, string? Nova);
