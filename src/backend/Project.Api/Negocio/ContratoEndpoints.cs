using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;

namespace Project.Api.Negocio;

/// <summary>Contratos da conta, do modelo e do evento, e leitura sem login (SPEC-030 v2).</summary>
public static class ContratoEndpoints
{
    private static readonly string[] AdminOuOrganizer = [Papeis.Admin, Papeis.Organizer];
    private static readonly string[] SoOrganizer = [Papeis.Organizer];

    public static void Mapear(WebApplication app)
    {
        var cadastro = app.MapGroup("/api/v1/contratos").RequireAuthorization(policy => policy.RequireRole(AdminOuOrganizer));
        cadastro.MapGet("/campos", (ContratoServico servico) => Results.Ok(servico.Campos()));
        cadastro.MapGet("", Listar);
        cadastro.MapGet("/{id:guid}", Obter);
        cadastro.MapPost("", Criar);
        cadastro.MapPut("/{id:guid}", Atualizar);
        cadastro.MapDelete("/{id:guid}", Excluir);

        var api = app.MapGroup("/api/v1").RequireAuthorization(AssistenteEndpoints.PoliticaFinanceiro);
        api.AddEndpointFilter(EscopoAssistente.Filtro);
        api.MapGet("/modelos/{id:guid}/contratos", DoModelo);
        api.MapPut("/modelos/{id:guid}/contratos", VincularAoModelo);
        api.MapGet("/eventos/{id:guid}/contratos", DoEvento);
        api.MapPost("/eventos/{id:guid}/contratos/{contratoId:guid}", AdicionarAoEvento);
        api.MapDelete("/eventos/{id:guid}/contratos/{contratoId:guid}", RemoverDoEvento);
        api.MapGet("/eventos/{id:guid}/contratos/{contratoId:guid}/texto", Preenchido);
        api.MapPost("/eventos/{id:guid}/contratos/{contratoId:guid}/enviar", Enviar);

        app.MapGet("/api/v1/publico/contratos/{token}", Publico);
    }

    private static Task<IResult> Listar(ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, ct)));

    private static Task<IResult> Obter(Guid id, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> Criar(SalvarContrato pedido, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarAsync(conta, null, pedido, ct)));

    private static Task<IResult> Atualizar(Guid id, SalvarContrato pedido, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarAsync(conta, id, pedido, ct)));

    private static Task<IResult> Excluir(Guid id, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> DoModelo(Guid id, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DoModeloAsync(conta, id, ct)));

    private static Task<IResult> VincularAoModelo(Guid id, VincularContratos pedido, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.VincularAoModeloAsync(conta, id, pedido, ct)));

    private static Task<IResult> DoEvento(Guid id, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DoEventoAsync(conta, id, ct)));

    private static Task<IResult> AdicionarAoEvento(Guid id, Guid contratoId, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AdicionarAoEventoAsync(conta, id, contratoId, ct)));

    private static Task<IResult> RemoverDoEvento(Guid id, Guid contratoId, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.RemoverDoEventoAsync(conta, id, contratoId, ct)));

    private static Task<IResult> Preenchido(Guid id, Guid contratoId, ClaimsPrincipal usuario, ContratoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.PreenchidoAsync(conta, id, contratoId, Hoje(), ct)));

    private static Task<IResult> Enviar(Guid id, Guid contratoId, ClaimsPrincipal usuario, ContratoServico servico, IConfiguration configuracao, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.EnviarAsync(conta, id, contratoId, configuracao["PublicUrl"] ?? "", ct)));

    private static Task<IResult> Publico(string token, ContratoServico servico, CancellationToken ct) =>
        De(servico.PublicoAsync(token, Hoje(), ct));

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
        return resultado.Ok
            ? Results.Ok(resultado.Valor)
            : Results.Json(
                new ErroResposta(resultado.Falha!.Codigo, resultado.Falha.Mensagem),
                statusCode: resultado.Falha.Codigo switch
                {
                    Codigos.Indisponivel => StatusCodes.Status404NotFound,
                    Codigos.Proibido => StatusCodes.Status403Forbidden,
                    _ => StatusCodes.Status400BadRequest,
                });
    }

    private static DateOnly Hoje() => DateOnly.FromDateTime(DateTime.UtcNow);
}
