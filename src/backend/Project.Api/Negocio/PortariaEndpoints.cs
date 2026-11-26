using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;

namespace Project.Api.Negocio;

/// <summary>Portaria do evento (SPEC-058): gestão do link pela dona do evento e acesso público da equipe da portaria.</summary>
public static class PortariaEndpoints
{
    public static void Mapear(WebApplication app)
    {
        var dona = app.MapGroup("/api/v1/eventos/{id:guid}/link-portaria").RequireAuthorization(policy => policy.RequireRole(Papeis.Organizer));
        dona.AddEndpointFilter(EscopoAssistente.Filtro);
        dona.MapGet("", Obter);
        dona.MapPost("", Gerar);
        dona.MapDelete("", Desativar);

        var portaria = app.MapGroup("/api/v1/publico/portaria/{token}");
        portaria.MapGet("", Ler);
        portaria.MapGet("/qr/{codigo}", LerPeloQr);
        portaria.MapGet("/convites/{conviteId:guid}", LerConvite);
        portaria.MapPut("/convites/{conviteId:guid}/comparecimento", Marcar);
    }

    private static Task<IResult> Obter(Guid id, ClaimsPrincipal usuario, PortariaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> Gerar(Guid id, ClaimsPrincipal usuario, PortariaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.GerarAsync(conta, id, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> Desativar(Guid id, ClaimsPrincipal usuario, PortariaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DesativarAsync(conta, id, ct)));

    private static Task<IResult> Ler(string token, PortariaServico servico, CancellationToken ct) =>
        De(servico.LerAsync(token, ct));

    private static Task<IResult> LerPeloQr(string token, string codigo, PortariaServico servico, CancellationToken ct) =>
        De(servico.LerConviteDoQrAsync(token, codigo, ct));

    private static Task<IResult> LerConvite(string token, Guid conviteId, PortariaServico servico, CancellationToken ct) =>
        De(servico.LerConviteAsync(token, conviteId, ct));

    private static Task<IResult> Marcar(string token, Guid conviteId, ComparecimentoPedido pedido, PortariaServico servico, CancellationToken ct) =>
        De(servico.MarcarComparecimentoAsync(token, conviteId, pedido, DateTimeOffset.UtcNow, ct));

    private static Task<IResult> ComConta(ClaimsPrincipal usuario, Func<string, Task<IResult>> acao)
    {
        var conta = ContaAtual.De(usuario);
        return string.IsNullOrWhiteSpace(conta)
            ? Task.FromResult(Results.Json(new ErroResposta("autenticacao", "É preciso entrar para continuar."), statusCode: StatusCodes.Status401Unauthorized))
            : acao(conta);
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
                _ => StatusCodes.Status400BadRequest,
            });
}
