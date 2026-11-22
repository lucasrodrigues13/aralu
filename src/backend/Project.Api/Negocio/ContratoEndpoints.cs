using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Arquivos;
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
        cadastro.MapPost("/{id:guid}/logo", (Guid id, IFormFile? arquivo, ClaimsPrincipal usuario, ContratoServico servico, IArmazenamentoArquivo armazenamento, CancellationToken ct) =>
            EnviarImagem(id, true, arquivo, usuario, servico, armazenamento, ct)).DisableAntiforgery();
        cadastro.MapDelete("/{id:guid}/logo", (Guid id, ClaimsPrincipal usuario, ContratoServico servico) =>
            RemoverImagem(id, true, usuario, servico));
        cadastro.MapPost("/{id:guid}/fundo", (Guid id, IFormFile? arquivo, ClaimsPrincipal usuario, ContratoServico servico, IArmazenamentoArquivo armazenamento, CancellationToken ct) =>
            EnviarImagem(id, false, arquivo, usuario, servico, armazenamento, ct)).DisableAntiforgery();
        cadastro.MapDelete("/{id:guid}/fundo", (Guid id, ClaimsPrincipal usuario, ContratoServico servico) =>
            RemoverImagem(id, false, usuario, servico));
    }

    /// <summary>
    /// Logo ou fundo do modelo (SPEC-056): JPG, PNG ou WebP até 5 MB, no armazenamento de arquivos. O arquivo anterior
    /// não é apagado, porque contratos já gerados a partir do modelo guardam o mesmo arquivo.
    /// </summary>
    private static Task<IResult> EnviarImagem(
        Guid id,
        bool logo,
        IFormFile? arquivo,
        ClaimsPrincipal usuario,
        ContratoServico servico,
        IArmazenamentoArquivo armazenamento,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            if (arquivo is null || arquivo.Length == 0)
            {
                return Results.Json(new ErroResposta(Codigos.Validacao, "A imagem não foi aceita. Use JPG, PNG ou WebP de até 5 MB."), statusCode: StatusCodes.Status400BadRequest);
            }

            var existente = await servico.ObterAsync(conta, id, ct);
            if (!existente.Ok)
            {
                return Results.Json(new ErroResposta(existente.Falha!.Codigo, existente.Falha.Mensagem), statusCode: StatusCodes.Status404NotFound);
            }

            await using var fluxo = arquivo.OpenReadStream();
            var guardado = await armazenamento.GuardarImagemAsync(fluxo, arquivo.FileName, conta, ct);
            if (!guardado.Ok || guardado.Valor is null)
            {
                return Results.Json(new ErroResposta(guardado.Falha!.Codigo, guardado.Falha.Mensagem), statusCode: StatusCodes.Status400BadRequest);
            }

            var ligado = await servico.DefinirImagemAsync(conta, id, logo, guardado.Valor.Id, ct);
            if (!ligado.Ok)
            {
                await armazenamento.DescartarAsync(guardado.Valor.Id, ct);
                return Results.Json(new ErroResposta(ligado.Falha!.Codigo, ligado.Falha.Mensagem), statusCode: StatusCodes.Status404NotFound);
            }

            return Results.Ok(new { arquivoId = guardado.Valor.Id });
        });

    private static Task<IResult> RemoverImagem(Guid id, bool logo, ClaimsPrincipal usuario, ContratoServico servico) =>
        ComConta(usuario, async conta =>
        {
            var tirado = await servico.DefinirImagemAsync(conta, id, logo, null, CancellationToken.None);
            return tirado.Ok
                ? Results.Ok(new { mensagem = logo ? "Logo removida." : "Fundo removido." })
                : Results.Json(new ErroResposta(tirado.Falha!.Codigo, tirado.Falha.Mensagem), statusCode: StatusCodes.Status404NotFound);
        });

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
