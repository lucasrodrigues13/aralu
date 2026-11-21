using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;

namespace Project.Api.Negocio;

/// <summary>Dinheiro do evento: pagamentos a fornecedores com parcelas e comprovantes (SPEC-043), e a tela Hoje.</summary>
public static class DinheiroEndpoints
{
    private static readonly string[] SoOrganizer = [Papeis.Organizer];

    public static void Mapear(WebApplication app)
    {
        var api = app.MapGroup("/api/v1").RequireAuthorization(AssistenteEndpoints.PoliticaFinanceiro);
        api.AddEndpointFilter(EscopoAssistente.Filtro);
        api.MapGet("/eventos/{id:guid}/dinheiro", Obter);
        api.MapGet("/eventos/{id:guid}/budget/planilha", PlanilhaBudget);
        var pagamento = "/eventos/{id:guid}/dinheiro/pagamentos/{servicoId:guid}";
        api.MapPut(pagamento + "/parcelamento", Parcelar);
        api.MapDelete(pagamento + "/parcelamento", RemoverParcelamento);
        api.MapPut(pagamento + "/pago", MarcarPagamento);
        api.MapPut(pagamento + "/parcelas/{parcelaId:guid}/pago", MarcarParcela);
        api.MapPost(pagamento + "/comprovante", EnviarComprovante).DisableAntiforgery();
        api.MapDelete(pagamento + "/comprovante", ExcluirComprovante);
        api.MapPost(pagamento + "/parcelas/{parcelaId:guid}/comprovante", EnviarComprovanteDaParcela).DisableAntiforgery();
        api.MapDelete(pagamento + "/parcelas/{parcelaId:guid}/comprovante", ExcluirComprovanteDaParcela);
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

    private static Task<IResult> Parcelar(Guid id, Guid servicoId, PedidoParcelas pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ParcelarAsync(conta, id, servicoId, pedido, ct)));

    private static Task<IResult> RemoverParcelamento(Guid id, Guid servicoId, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.RemoverParcelamentoAsync(conta, id, servicoId, ct)));

    private static Task<IResult> MarcarPagamento(Guid id, Guid servicoId, MarcarPago pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DefinirPagoAsync(conta, id, servicoId, pedido.Pago, Hoje(), ct)));

    private static Task<IResult> MarcarParcela(Guid id, Guid servicoId, Guid parcelaId, MarcarPago pedido, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DefinirParcelaPagaAsync(conta, id, servicoId, parcelaId, pedido.Pago, Hoje(), ct)));

    private static Task<IResult> EnviarComprovante(Guid id, Guid servicoId, HttpRequest request, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        Comprovante(request, usuario, (conta, fluxo, nome) => servico.EnviarComprovanteAsync(conta, id, servicoId, null, fluxo, nome, ct), ct);

    private static Task<IResult> EnviarComprovanteDaParcela(Guid id, Guid servicoId, Guid parcelaId, HttpRequest request, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        Comprovante(request, usuario, (conta, fluxo, nome) => servico.EnviarComprovanteAsync(conta, id, servicoId, parcelaId, fluxo, nome, ct), ct);

    private static Task<IResult> ExcluirComprovante(Guid id, Guid servicoId, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirComprovanteAsync(conta, id, servicoId, null, ct)));

    private static Task<IResult> ExcluirComprovanteDaParcela(Guid id, Guid servicoId, Guid parcelaId, ClaimsPrincipal usuario, DinheiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirComprovanteAsync(conta, id, servicoId, parcelaId, ct)));

    private static Task<IResult> Comprovante(
        HttpRequest request,
        ClaimsPrincipal usuario,
        Func<string, Stream, string, Task<Resultado<DinheiroEventoLeitura>>> enviar,
        CancellationToken ct) =>
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
            return await De(enviar(conta, fluxo, arquivo.FileName));
        });

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
