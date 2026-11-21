using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;

namespace Project.Api.Negocio;

/// <summary>Cadastro de contratos da conta, sem vínculo com modelo nem evento (SPEC-030 v3).</summary>
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
}
