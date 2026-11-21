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
        var api = app.MapGroup("/api/v1").RequireAuthorization(AssistenteEndpoints.PoliticaFinanceiro);
        api.AddEndpointFilter(EscopoAssistente.Filtro);
        api.MapGet("/eventos/{id:guid}/dinheiro", Obter);
        api.MapPost("/eventos/{id:guid}/dinheiro/lancamentos", CriarLancamento);
        api.MapPut("/eventos/{id:guid}/dinheiro/lancamentos/{lancamentoId:guid}", AtualizarLancamento);
        api.MapDelete("/eventos/{id:guid}/dinheiro/lancamentos/{lancamentoId:guid}", ExcluirLancamento);
        api.MapGet("/eventos/{id:guid}/budget/planilha", PlanilhaBudget);
        api.MapPost("/eventos/{id:guid}/dinheiro/comprovantes", EnviarComprovante).DisableAntiforgery();
        api.MapDelete("/eventos/{id:guid}/dinheiro/comprovantes/{comprovanteId:guid}", ExcluirComprovante);
        app.MapGet("/api/v1/hoje", (ClaimsPrincipal usuario, HojeServico servico, Project.Infrastructure.Persistencia.AppDbContext banco, CancellationToken ct) =>
            ComConta(usuario, async conta => Results.Ok(await servico.ObterAsync(
                conta,
                Hoje(),
                ct,
                await EscopoAssistente.LiberadosAsync(usuario, banco, ct),
                AssistenteEndpoints.PodeVerFinanceiro(usuario),
                usuario.IsInRole(Papeis.Organizer))))).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
    }

    private static Task<IResult> Obter(Guid id, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> CriarLancamento(Guid id, SalvarLancamento pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarLancamentoAsync(conta, id, null, pedido, ct)));

    private static Task<IResult> AtualizarLancamento(Guid id, Guid lancamentoId, SalvarLancamento pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarLancamentoAsync(conta, id, lancamentoId, pedido, ct)));

    private static Task<IResult> ExcluirLancamento(Guid id, Guid lancamentoId, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirLancamentoAsync(conta, id, lancamentoId, ct)));

    private static Task<IResult> EnviarComprovante(Guid id, HttpRequest request, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            const string invalido = "O arquivo não foi aceito. Use JPG, JPEG, PNG ou PDF de até 5 MB.";
            if (!request.HasFormContentType)
            {
                return Falha(new Falha(Codigos.Validacao, invalido));
            }

            var formulario = await request.ReadFormAsync(ct);
            var arquivo = formulario.Files.GetFile("arquivo");
            if (arquivo is null || arquivo.Length == 0 || arquivo.Length > 5 * 1024 * 1024)
            {
                return Falha(new Falha(Codigos.Validacao, invalido));
            }

            await using var fluxo = arquivo.OpenReadStream();
            return await De(servico.EnviarComprovanteAsync(conta, id, fluxo, arquivo.FileName, formulario["descricao"].ToString(), ct));
        });

    private static Task<IResult> ExcluirComprovante(Guid id, Guid comprovanteId, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirComprovanteAsync(conta, id, comprovanteId, ct)));

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
