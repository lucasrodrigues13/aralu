using System.Security.Claims;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Domain.Equipe;
using Project.Infrastructure.Conta;

namespace Project.Api.Conta;

/// <summary>Assistentes da conta (SPEC-032): gestão pela dona, convite aceito por link e "Minha conta".</summary>
public static class AssistenteEndpoints
{
    public const string ClaimFinanceiro = "pode_financeiro";
    public const string ClaimSomenteDela = "so_dela";
    public const string PoliticaFinanceiro = "Financeiro";

    private static readonly string[] SoOrganizer = [Papeis.Organizer];
    private static readonly string[] SoAssistant = [Papeis.Assistant];

    public static void Mapear(WebApplication app)
    {
        app.MapPost("/api/v1/conta/aceitar-convite", AceitarConvite);

        var dona = app.MapGroup("/api/v1/assistentes").RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        dona.MapGet("", Listar);
        dona.MapPost("", Convidar);
        dona.MapPut("/{id:guid}", Atualizar);
        dona.MapPost("/{id:guid}/reenviar", Reenviar);
        dona.MapDelete("/{id:guid}", Desativar);
        dona.MapPost("/{id:guid}/desativar", Desativar);
        dona.MapPost("/{id:guid}/reativar", Reativar);

        app.MapGet("/api/v1/admin/assistentes", async (AssistenteServico servico, CancellationToken ct) =>
            Results.Ok(await servico.ListarParaAdminAsync(ct))).RequireAuthorization(policy => policy.RequireRole(Papeis.Admin));

        app.MapGet("/api/v1/assistentes/ativas", Ativas).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        app.MapGet("/api/v1/assistentes/nomes", async (ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct) =>
            Conta(usuario) is { } conta ? Results.Ok(await servico.NomesAsync(conta, ct)) : Results.Unauthorized()).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        var propria = app.MapGroup("/api/v1/minha-conta").RequireAuthorization(policy => policy.RequireRole(SoAssistant));
        propria.MapGet("", MinhaConta);
        propria.MapPut("", AtualizarMinhaConta);
        propria.MapPost("/senha", TrocarSenha);
    }

    /// <summary>
    /// Lê a situação e as permissões da assistente no banco a cada pedido (SPEC-032 §6.3 e §6.5):
    /// o JWT só diz quem ela é; o que ela pode vale a partir do próximo pedido.
    /// </summary>
    public static async Task AplicarPermissoes(HttpContext http, Func<Task> proximo)
    {
        var usuario = http.User;
        if (usuario.Identity?.IsAuthenticated == true && usuario.IsInRole(Papeis.Assistant))
        {
            var id = usuario.FindFirstValue(ClaimTypes.NameIdentifier);
            var assistente = string.IsNullOrWhiteSpace(id)
                ? null
                : await http.RequestServices.GetRequiredService<AssistenteServico>().PorUsuarioAsync(id, http.RequestAborted);
            if (assistente is null || assistente.Situacao != SituacaoAssistente.Ativa)
            {
                http.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await http.Response.WriteAsJsonAsync(new ErroResposta("acesso_removido", "Seu acesso foi removido."));
                return;
            }

            var extra = new ClaimsIdentity();
            extra.AddClaim(new Claim(ClaimFinanceiro, assistente.PodeVerFinanceiro ? "true" : "false"));
            extra.AddClaim(new Claim(ClaimSomenteDela, assistente.SomenteDela ? "true" : "false"));
            extra.AddClaim(new Claim(ContaClaims.AssistenteId, assistente.Id.ToString()));
            usuario.AddIdentity(extra);
        }

        await proximo();
    }

    public static bool PodeVerFinanceiro(ClaimsPrincipal usuario) =>
        usuario.IsInRole(Papeis.Organizer)
        || (usuario.IsInRole(Papeis.Assistant) && usuario.FindFirstValue(ClaimFinanceiro) == "true");

    private static string? Conta(ClaimsPrincipal usuario) =>
        usuario.FindFirstValue(ContaClaims.OrganizerId) ?? usuario.FindFirstValue(ClaimTypes.NameIdentifier);

    private static async Task<IResult> AceitarConvite(AceitarConvitePedido pedido, AssistenteServico servico, CancellationToken ct)
    {
        var resultado = await servico.AceitarConviteAsync(pedido.UsuarioId, pedido.Token, pedido.Senha, pedido.Confirmacao, ct);
        return resultado.Ok ? Results.Ok(new { mensagem = "Senha criada." }) : Falha(resultado.Falha!);
    }

    private static async Task<IResult> Listar(ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct) =>
        Conta(usuario) is { } conta ? Results.Ok(await servico.ListarAsync(conta, ct)) : Results.Unauthorized();

    private static async Task<IResult> Ativas(ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct) =>
        Conta(usuario) is { } conta ? Results.Ok(await servico.AtivasAsync(conta, ct)) : Results.Unauthorized();

    private static async Task<IResult> Convidar(ConvidarAssistentePedido pedido, ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
    {
        if (Conta(usuario) is not { } conta)
        {
            return Results.Unauthorized();
        }

        var resultado = await servico.ConvidarAsync(conta, pedido, ct);
        return resultado.Ok ? Results.Json(resultado.Valor, statusCode: StatusCodes.Status201Created) : Falha(resultado.Falha!);
    }

    private static async Task<IResult> Atualizar(Guid id, ConvidarAssistentePedido pedido, ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
    {
        if (Conta(usuario) is not { } conta)
        {
            return Results.Unauthorized();
        }

        var resultado = await servico.AtualizarAsync(conta, id, pedido, ct);
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static async Task<IResult> Reenviar(Guid id, ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
    {
        if (Conta(usuario) is not { } conta)
        {
            return Results.Unauthorized();
        }

        var resultado = await servico.ReenviarAsync(conta, id, ct);
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static async Task<IResult> Desativar(Guid id, ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
    {
        if (Conta(usuario) is not { } conta)
        {
            return Results.Unauthorized();
        }

        var resultado = await servico.DesativarAsync(conta, id, ct);
        return resultado.Ok ? Results.NoContent() : Falha(resultado.Falha!);
    }

    private static async Task<IResult> Reativar(Guid id, ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
    {
        if (Conta(usuario) is not { } conta)
        {
            return Results.Unauthorized();
        }

        var resultado = await servico.ReativarAsync(conta, id, ct);
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static async Task<IResult> MinhaConta(ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
    {
        var resultado = await servico.MinhaContaAsync(usuario.FindFirstValue(ClaimTypes.NameIdentifier) ?? "", ct);
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static async Task<IResult> AtualizarMinhaConta(AtualizarMinhaConta pedido, ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
    {
        var resultado = await servico.AtualizarMinhaContaAsync(usuario.FindFirstValue(ClaimTypes.NameIdentifier) ?? "", pedido, ct);
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static async Task<IResult> TrocarSenha(TrocarSenhaPedido pedido, ClaimsPrincipal usuario, AssistenteServico servico, CancellationToken ct)
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
                "ja_assistente" => StatusCodes.Status409Conflict,
                _ => StatusCodes.Status400BadRequest,
            });
}

public sealed record AceitarConvitePedido(string? UsuarioId, string? Token, string? Senha, string? Confirmacao);

public sealed record TrocarSenhaPedido(string? Atual, string? Nova);
