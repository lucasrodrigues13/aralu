using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;
using Project.Infrastructure.Persistencia;

namespace Project.Api.Negocio;

/// <summary>
/// Equipe do evento (SPEC-067): a Organizer cadastra e libera; a pessoa, sem login, entra com código no e-mail
/// e vê só o que recebe. A portaria (SPEC-058) passa a abrir só por aqui.
/// </summary>
public static class EquipeEventoEndpoints
{
    /// <summary>Cookie da sessão: só o navegador guarda o token; vale só para as rotas deste link.</summary>
    public const string CookieSessao = "aralu_equipe";

    public static void Mapear(WebApplication app)
    {
        var dona = app.MapGroup("/api/v1/eventos/{id:guid}/equipe").RequireAuthorization(policy => policy.RequireRole(Papeis.Organizer));
        dona.AddEndpointFilter(EscopoAssistente.Filtro);
        dona.MapGet("", Obter);
        dona.MapPut("/modelos", DefinirModelos);
        dona.MapPost("", Criar);
        dona.MapPut("/{pessoaId:guid}", Atualizar);
        dona.MapDelete("/{pessoaId:guid}", Remover);
        dona.MapPost("/{pessoaId:guid}/liberacao", Liberar);
        dona.MapDelete("/{pessoaId:guid}/liberacao", Encerrar);

        var publico = app.MapGroup("/api/v1/publico/equipe/{token}");
        publico.MapGet("/acesso", LerAcesso);
        publico.MapPost("/acesso/codigo", PedirCodigo);
        publico.MapPost("/acesso/confirmar", Confirmar);
        publico.MapGet("", LerPainel);
        publico.MapGet("/roteiro", LerRoteiro);
        publico.MapGet("/cronograma", LerCronograma);
        publico.MapGet("/portaria", LerPortaria);
        publico.MapGet("/portaria/qr/{codigo}", LerPeloQr);
        publico.MapGet("/portaria/convites/{conviteId:guid}", LerConvite);
        publico.MapPut("/portaria/convites/{conviteId:guid}/comparecimento", Marcar);
    }

    // ---- Organizer ----

    private static Task<IResult> Obter(Guid id, ClaimsPrincipal usuario, EquipeEventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> DefinirModelos(Guid id, ModelosDaEquipe pedido, ClaimsPrincipal usuario, EquipeEventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DefinirModelosAsync(conta, id, pedido, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> Criar(Guid id, SalvarPessoaEquipe pedido, ClaimsPrincipal usuario, EquipeEventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, id, pedido, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> Atualizar(Guid id, Guid pessoaId, SalvarPessoaEquipe pedido, ClaimsPrincipal usuario, EquipeEventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pessoaId, pedido, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> Remover(Guid id, Guid pessoaId, ClaimsPrincipal usuario, EquipeEventoServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var resultado = await servico.RemoverAsync(conta, id, pessoaId, ct);
            return resultado.Ok ? Results.NoContent() : Falha(resultado.Falha!);
        });

    private static Task<IResult> Liberar(Guid id, Guid pessoaId, ClaimsPrincipal usuario, EquipeEventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.LiberarAsync(conta, id, pessoaId, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> Encerrar(Guid id, Guid pessoaId, ClaimsPrincipal usuario, EquipeEventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.EncerrarAsync(conta, id, pessoaId, DateTimeOffset.UtcNow, ct)));

    // ---- Pessoa da equipe (sem login) ----

    private static Task<IResult> LerAcesso(string token, HttpContext http, EquipeAcessoServico servico, CancellationToken ct) =>
        De(servico.LerAsync(token, Sessao(http), DateTimeOffset.UtcNow, ct));

    private static Task<IResult> PedirCodigo(string token, EquipeAcessoServico servico, CancellationToken ct) =>
        De(servico.PedirCodigoAsync(token, DateTimeOffset.UtcNow, ct));

    private static async Task<IResult> Confirmar(string token, ConfirmarCodigoEquipe pedido, HttpContext http, EquipeAcessoServico servico, CancellationToken ct)
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
            Path = "/api/v1/publico/equipe/" + Uri.EscapeDataString(token),
            Expires = resultado.Valor.ExpiraEm,
            IsEssential = true,
        });
        return Results.Ok(new { ok = true });
    }

    private static Task<IResult> LerPainel(string token, HttpContext http, EquipeAcessoServico servico, CancellationToken ct) =>
        De(servico.ObterAsync(token, Sessao(http), DateTimeOffset.UtcNow, ct));

    private static Task<IResult> LerRoteiro(string token, HttpContext http, EquipeAcessoServico servico, CancellationToken ct) =>
        De(servico.RoteiroAsync(token, Sessao(http), DateTimeOffset.UtcNow, ct));

    private static Task<IResult> LerCronograma(string token, HttpContext http, EquipeAcessoServico servico, CancellationToken ct) =>
        De(servico.CronogramaAsync(token, Sessao(http), DateTimeOffset.UtcNow, ct));

    private static Task<IResult> LerPortaria(string token, HttpContext http, EquipeAcessoServico acesso, PortariaServico portaria, CancellationToken ct) =>
        NaPortaria(token, http, acesso, pessoa => De(portaria.LerAsync(pessoa.ContaId, pessoa.EventoId, ct)), ct);

    private static Task<IResult> LerPeloQr(string token, string codigo, HttpContext http, EquipeAcessoServico acesso, PortariaServico portaria, CancellationToken ct) =>
        NaPortaria(token, http, acesso, pessoa => De(portaria.LerConviteDoQrAsync(pessoa.ContaId, pessoa.EventoId, codigo, ct)), ct);

    private static Task<IResult> LerConvite(string token, Guid conviteId, HttpContext http, EquipeAcessoServico acesso, PortariaServico portaria, CancellationToken ct) =>
        NaPortaria(token, http, acesso, pessoa => De(portaria.LerConviteAsync(pessoa.ContaId, pessoa.EventoId, conviteId, ct)), ct);

    private static Task<IResult> Marcar(
        string token,
        Guid conviteId,
        ComparecimentoPedido pedido,
        HttpContext http,
        EquipeAcessoServico acesso,
        PortariaServico portaria,
        CancellationToken ct) =>
        NaPortaria(token, http, acesso, pessoa => De(portaria.MarcarComparecimentoAsync(pessoa.ContaId, pessoa.EventoId, conviteId, pedido, DateTimeOffset.UtcNow, ct)), ct);

    private static async Task<IResult> NaPortaria(string token, HttpContext http, EquipeAcessoServico acesso, Func<PessoaAutorizada, Task<IResult>> acao, CancellationToken ct)
    {
        var autorizada = await acesso.AutorizarPortariaAsync(token, Sessao(http), DateTimeOffset.UtcNow, ct);
        return autorizada.Ok ? await acao(autorizada.Valor!) : Falha(autorizada.Falha!);
    }

    private static string? Sessao(HttpContext http) => http.Request.Cookies[CookieSessao];

    private static Task<IResult> ComConta(ClaimsPrincipal usuario, Func<Guid, Task<IResult>> acao)
    {
        var conta = ContaAtual.De(usuario);
        return conta is null
            ? Task.FromResult(Results.Json(new ErroResposta("autenticacao", "É preciso entrar para continuar."), statusCode: StatusCodes.Status401Unauthorized))
            : acao(conta.Value);
    }

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
                Codigos.Proibido => StatusCodes.Status403Forbidden,
                EquipeAcessoServico.CodigoSessao => StatusCodes.Status401Unauthorized,
                _ => StatusCodes.Status400BadRequest,
            });
}
