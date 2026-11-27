using Project.Api.Conta;
using Project.Application.Comum;
using Project.Infrastructure.Persistencia;

namespace Project.Api.Negocio;

/// <summary>Briefing preenchido pelo cliente (SPEC-066): código por e-mail, sessão em cookie, depois as respostas.</summary>
public static class BriefingPublicoEndpoints
{
    /// <summary>Cookie da sessão: só o navegador guarda o token; vale só para as rotas deste briefing.</summary>
    public const string CookieSessao = "aralu_briefing";

    public static void Mapear(WebApplication app)
    {
        var rota = app.MapGroup("/api/v1/publico/briefings/{token}");
        rota.MapGet("/acesso", LerAcesso);
        rota.MapPost("/acesso/codigo", PedirCodigo);
        rota.MapPost("/acesso/confirmar", Confirmar);
        rota.MapGet("", Obter);
        rota.MapPut("", Responder);
    }

    private static Task<IResult> LerAcesso(string token, HttpContext http, BriefingAcessoServico servico, CancellationToken ct) =>
        De(servico.LerAsync(token, http.Request.Cookies[CookieSessao], DateTimeOffset.UtcNow, ct));

    private static Task<IResult> PedirCodigo(string token, PedirCodigoBriefing pedido, BriefingAcessoServico servico, CancellationToken ct) =>
        De(servico.PedirCodigoAsync(token, pedido, DateTimeOffset.UtcNow, ct));

    private static async Task<IResult> Confirmar(string token, ConfirmarCodigoBriefing pedido, HttpContext http, BriefingAcessoServico servico, CancellationToken ct)
    {
        var resultado = await servico.ConfirmarAsync(token, pedido, DateTimeOffset.UtcNow, ct);
        if (!resultado.Ok)
        {
            return Falha(resultado.Falha!);
        }

        http.Response.Cookies.Append(CookieSessao, resultado.Valor!.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = http.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/api/v1/publico/briefings/" + Uri.EscapeDataString(token),
            Expires = resultado.Valor.ExpiraEm,
            IsEssential = true,
        });
        return Results.Ok(new { ok = true });
    }

    private static Task<IResult> Obter(string token, HttpContext http, BriefingAcessoServico servico, CancellationToken ct) =>
        De(servico.ObterAsync(token, http.Request.Cookies[CookieSessao], DateTimeOffset.UtcNow, ct));

    private static Task<IResult> Responder(string token, ResponderBriefingPublico pedido, HttpContext http, BriefingAcessoServico servico, CancellationToken ct) =>
        De(servico.ResponderAsync(token, http.Request.Cookies[CookieSessao], pedido, DateTimeOffset.UtcNow, ct));

    private static async Task<IResult> De<T>(Task<Resultado<T>> tarefa)
    {
        var resultado = await tarefa;
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static IResult Falha(Falha falha) =>
        Results.Json(
            new ErroResposta(falha.Codigo, falha.Mensagem),
            statusCode: falha.Codigo switch
            {
                Codigos.Indisponivel => StatusCodes.Status404NotFound,
                BriefingAcessoServico.CodigoSessao => StatusCodes.Status401Unauthorized,
                _ => StatusCodes.Status400BadRequest,
            });
}
