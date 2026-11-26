using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Infrastructure.Assinaturas;

namespace Project.Api.Conta;

/// <summary>Assinatura da conta (SPEC-062 parte B): situação, assinar pelo Asaas, faturas, cancelar e avisos do Asaas.</summary>
public static class AssinaturaEndpoints
{
    public const string CabecalhoTokenAsaas = "asaas-access-token";

    private static readonly string[] SoDono = [Papeis.Organizer];

    public static void Mapear(WebApplication app)
    {
        // Toda a equipe lê a situação (barra de trial, tela de bloqueio); só o Dono assina e cancela (R5).
        app.MapGet("/api/v1/assinatura", (ClaimsPrincipal u, AssinaturaServico s, CancellationToken ct) =>
            ComConta(u, async conta => await s.SituacaoAsync(conta, DateTimeOffset.UtcNow, ct) is { } situacao ? Results.Ok(situacao) : Results.NoContent()))
            .RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        var dono = app.MapGroup("/api/v1/assinatura").RequireAuthorization(policy => policy.RequireRole(SoDono));
        dono.MapPost("/assinar", Assinar);
        // Cancelou e ainda está no período pago: volta a recorrência sem cobrar agora.
        dono.MapPost("/reativar", (ClaimsPrincipal u, AssinaturaServico s, CancellationToken ct) =>
            ComConta(u, async conta =>
            {
                var r = await s.ReativarAsync(conta, DateTimeOffset.UtcNow, ct);
                return r.Ok ? Results.Ok(r.Valor) : Erro(r.Falha!, s.UltimoDiagnostico);
            }));
        dono.MapPost("/cancelar", (ClaimsPrincipal u, AssinaturaServico s, CancellationToken ct) =>
            ComConta(u, async conta =>
            {
                var r = await s.CancelarAsync(conta, DateTimeOffset.UtcNow, ct);
                return r.Ok
                    ? Results.Ok(new { mensagem = "Assinatura cancelada. A conta segue liberada até o fim do período pago.", diagnostico = r.Valor })
                    : Erro(r.Falha!, null);
            }));
        dono.MapGet("/faturas", (ClaimsPrincipal u, AssinaturaServico s, CancellationToken ct) =>
            ComConta(u, async conta => Results.Ok(await s.FaturasAsync(conta, ct))));
        dono.MapGet("/diagnostico", (ClaimsPrincipal u, AssinaturaServico s, CancellationToken ct) =>
            ComConta(u, async conta => await s.EventosParaDiagnosticoAsync(conta, ct) is { } eventos ? Results.Ok(eventos) : Results.NotFound()));

        // Planos que o Dono pode escolher (§6 B1) e recursos que o plano da conta libera (RF-119).
        dono.MapGet("/planos", (ClaimsPrincipal u, PlanosAdminServico s, CancellationToken ct) =>
            ComConta(u, async conta => Results.Ok(await s.ParaAssinarAsync(conta, ct))));
        app.MapGet("/api/v1/assinatura/recursos", (ClaimsPrincipal u, AssinaturaServico s, CancellationToken ct) =>
            ComConta(u, async conta => Results.Ok((await s.RecursosAsync(conta, ct)).Select(item => new { recurso = item.Key.ToString(), limite = item.Value }))))
            .RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        // Admin da plataforma (parte D): catálogo de planos e enquadramento de contas. RF-118, RF-120.
        var admin = app.MapGroup("/api/v1/admin").RequireAuthorization(policy => policy.RequireRole(Papeis.Admin));
        admin.MapGet("/planos", async (PlanosAdminServico s, CancellationToken ct) => Results.Ok(await s.ListarAsync(ct)));
        admin.MapPost("/planos", async (PlanoPedido pedido, PlanosAdminServico s, CancellationToken ct) =>
            Resposta(await s.SalvarAsync(null, pedido, DateTimeOffset.UtcNow, ct), StatusCodes.Status201Created));
        admin.MapPut("/planos/{id:guid}", async (Guid id, PlanoPedido pedido, PlanosAdminServico s, CancellationToken ct) =>
            Resposta(await s.SalvarAsync(id, pedido, DateTimeOffset.UtcNow, ct)));
        admin.MapGet("/contas/{contaId:guid}/assinatura", async (Guid contaId, PlanosAdminServico s, CancellationToken ct) =>
            await s.ContaAsync(contaId, ct) is { } conta ? Results.Ok(conta) : Results.NotFound());
        admin.MapPost("/contas/{contaId:guid}/assinatura/{tipo}", async (Guid contaId, string tipo, AjustePedido pedido, ClaimsPrincipal u, PlanosAdminServico s, CancellationToken ct) =>
        {
            var nome = tipo.ToLowerInvariant() switch
            {
                "plano" => "Plano",
                "valor" => "Valor",
                "desconto" => "Desconto",
                "trial" => "Trial",
                _ => null,
            };
            return nome is null
                ? Results.NotFound()
                : Resposta(await s.AjustarAsync(contaId, nome, pedido, u.FindFirstValue(ClaimTypes.NameIdentifier) ?? "", DateTimeOffset.UtcNow, ct));
        });

        // Aviso do Asaas: público, autenticado pelo token do webhook. Responde 200 rápido; repetido não muda nada (T16).
        app.MapPost("/api/v1/webhooks/asaas", ReceberAviso);
    }

    private static Task<IResult> Assinar(AssinarPedido pedido, ClaimsPrincipal usuario, AssinaturaServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var email = usuario.FindFirstValue(ClaimTypes.Email) ?? usuario.FindFirstValue("email") ?? "";
            var resultado = await servico.AssinarAsync(conta, email, pedido, DateTimeOffset.UtcNow, ct);
            return resultado.Ok ? Results.Ok(resultado.Valor) : Erro(resultado.Falha!, servico.UltimoDiagnostico);
        });

    private static async Task<IResult> ReceberAviso(HttpRequest request, AssinaturaServico servico, IOptions<AsaasOpcoes> opcoes, ILoggerFactory logs, CancellationToken ct)
    {
        var esperado = opcoes.Value.WebhookToken;
        var recebido = request.Headers[CabecalhoTokenAsaas].ToString();
        if (string.IsNullOrWhiteSpace(esperado)
            || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(recebido), Encoding.UTF8.GetBytes(esperado)))
        {
            logs.CreateLogger("asaas").LogWarning("Aviso do Asaas recusado: token do webhook ausente ou diferente.");
            return Results.Unauthorized();
        }

        using var leitor = new StreamReader(request.Body);
        var corpo = await leitor.ReadToEndAsync(ct);
        try
        {
            var novo = await servico.ReceberAvisoAsync(corpo, DateTimeOffset.UtcNow, ct);
            return Results.Ok(new { recebido = true, repetido = !novo });
        }
        catch (System.Text.Json.JsonException)
        {
            return Results.BadRequest(new ErroResposta(Codigos.Validacao, "Aviso inválido."));
        }
    }

    /// <summary>
    /// RF-121: a ação exige que o plano da conta libere o recurso E que o grupo da pessoa permita o módulo.
    /// Uso: <c>app.MapPost(...).ExigirRecurso(RecursoPlano.LigacoesIa, Modulo.Funil, AcaoModulo.Editar)</c>.
    /// </summary>
    public static RouteHandlerBuilder ExigirRecurso(this RouteHandlerBuilder rota, Project.Domain.Assinaturas.RecursoPlano recurso, Project.Domain.Equipe.Modulo modulo, Project.Domain.Equipe.AcaoModulo acao) =>
        rota.AddEndpointFilter(async (contexto, proximo) =>
        {
            var http = contexto.HttpContext;
            var falta = await FaltaRecursoAsync(http.User, http.RequestServices.GetRequiredService<AssinaturaServico>(), recurso, modulo, acao, http.RequestAborted);
            return falta is null ? await proximo(contexto) : Results.Json(new ErroResposta("recurso_fora_do_plano", falta), statusCode: StatusCodes.Status403Forbidden);
        });

    /// <summary>Nulo quando pode; senão, a mensagem do que falta (§14).</summary>
    public static async Task<string?> FaltaRecursoAsync(ClaimsPrincipal usuario, AssinaturaServico servico, Project.Domain.Assinaturas.RecursoPlano recurso, Project.Domain.Equipe.Modulo modulo, Project.Domain.Equipe.AcaoModulo acao, CancellationToken ct)
    {
        if (ContaAtual.De(usuario) is not { } conta)
        {
            return "Entre na conta para usar este recurso.";
        }

        if (!(await servico.RecursosAsync(conta, ct)).ContainsKey(recurso))
        {
            var plano = await servico.PlanoQueLiberaAsync(recurso, ct);
            return plano is null ? "Este recurso ainda não está disponível em nenhum plano." : $"Este recurso está disponível no plano {plano}.";
        }

        return EquipeEndpoints.Pode(usuario, modulo, acao)
            ? null
            : $"Você não tem permissão para {PermissaoPorRota.Verbo(acao)} em {PermissaoPorRota.Nome(modulo)}. Fale com o responsável pela conta.";
    }

    private static IResult Resposta<T>(Resultado<T> r, int status = StatusCodes.Status200OK) =>
        r.Ok ? Results.Json(r.Valor, statusCode: status) : Erro(r.Falha!, null);

    private static async Task<IResult> ComConta(ClaimsPrincipal usuario, Func<Guid, Task<IResult>> acao) =>
        ContaAtual.De(usuario) is { } conta ? await acao(conta) : Results.Unauthorized();

    private static IResult Erro(Falha falha, IReadOnlyList<PassoAsaas>? diagnostico) =>
        Results.Json(
            new { code = falha.Codigo, message = falha.Mensagem, diagnostico },
            statusCode: falha.Codigo switch
            {
                Codigos.Indisponivel => StatusCodes.Status404NotFound,
                AssinaturaServico.ErroAsaasCodigo => StatusCodes.Status502BadGateway,
                _ => StatusCodes.Status400BadRequest,
            });
}
