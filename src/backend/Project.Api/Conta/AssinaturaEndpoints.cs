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
