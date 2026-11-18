using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;

namespace Project.Api.Negocio;

/// <summary>Dinheiro do evento e pagamentos da conta (SPEC-029). Só o Organizer.</summary>
public static class DinheiroEndpoints
{
    private static readonly string[] SoOrganizer = [Papeis.Organizer];

    public static void Mapear(WebApplication app)
    {
        var api = app.MapGroup("/api/v1").RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        api.MapGet("/eventos/{id:guid}/dinheiro", Obter);
        api.MapPut("/eventos/{id:guid}/dinheiro/contrato", DefinirContrato);
        api.MapPost("/eventos/{id:guid}/dinheiro/parcelas/{parcelaId:guid}/recebimentos", Receber);
        api.MapDelete("/eventos/{id:guid}/dinheiro/parcelas/{parcelaId:guid}/recebimentos/ultimo", Desfazer);
        api.MapPost("/eventos/{id:guid}/dinheiro/lancamentos", CriarLancamento);
        api.MapPut("/eventos/{id:guid}/dinheiro/lancamentos/{lancamentoId:guid}", AtualizarLancamento);
        api.MapDelete("/eventos/{id:guid}/dinheiro/lancamentos/{lancamentoId:guid}", ExcluirLancamento);
        api.MapGet("/eventos/{id:guid}/budget/planilha", PlanilhaBudget);
        api.MapGet("/pagamentos", Pagamentos);
        api.MapGet("/hoje", (ClaimsPrincipal usuario, HojeServico servico, CancellationToken ct) =>
            ComConta(usuario, async conta => Results.Ok(await servico.ObterAsync(conta, Hoje(), ct))));
    }

    private static Task<IResult> Obter(Guid id, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, Hoje(), ct)));

    private static Task<IResult> DefinirContrato(Guid id, DefinirContratoCasal pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DefinirContratoAsync(conta, id, pedido, Hoje(), ct)));

    private static Task<IResult> Receber(Guid id, Guid parcelaId, ReceberParcela pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ReceberAsync(conta, id, parcelaId, pedido, Hoje(), ct)));

    private static Task<IResult> Desfazer(Guid id, Guid parcelaId, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DesfazerRecebimentoAsync(conta, id, parcelaId, Hoje(), ct)));

    private static Task<IResult> CriarLancamento(Guid id, SalvarLancamento pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarLancamentoAsync(conta, id, null, pedido, Hoje(), ct)));

    private static Task<IResult> AtualizarLancamento(Guid id, Guid lancamentoId, SalvarLancamento pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarLancamentoAsync(conta, id, lancamentoId, pedido, Hoje(), ct)));

    private static Task<IResult> ExcluirLancamento(Guid id, Guid lancamentoId, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirLancamentoAsync(conta, id, lancamentoId, Hoje(), ct)));

    private static Task<IResult> Pagamentos(ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.PagamentosAsync(conta, ct)));

    private static Task<IResult> PlanilhaBudget(Guid id, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var resultado = await servico.PlanilhaBudgetAsync(conta, id, ct);
            if (!resultado.Ok)
            {
                return Falha(resultado.Falha!);
            }

            var (nome, conteudo) = resultado.Valor;
            return Results.File(conteudo, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nome);
        });

    private static Task<IResult> ComConta(ClaimsPrincipal usuario, Func<string, Task<IResult>> acao)
    {
        var conta = usuario.FindFirstValue(ContaClaims.OrganizerId);
        if (string.IsNullOrWhiteSpace(conta))
        {
            conta = usuario.FindFirstValue(ClaimTypes.NameIdentifier);
        }

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

    private static DateOnly Hoje() => DateOnly.FromDateTime(DateTime.UtcNow);
}
