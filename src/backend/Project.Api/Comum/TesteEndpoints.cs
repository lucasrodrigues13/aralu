using Project.Application.Comum;
using Project.Application.Convidados;
using Project.Infrastructure.Assinaturas;

namespace Project.Api.Comum;

/// <summary>
/// Rotas exclusivas do ambiente E2E (docs/testes/e2e-matriz.md): controlam o relógio e disparam os jobs na hora.
/// Só existem com <c>Testes:RelogioControlavel=true</c>, e a API se recusa a subir assim em produção.
/// </summary>
public static class TesteEndpoints
{
    public const string Flag = "Testes:RelogioControlavel";

    public static bool Ligado(IConfiguration configuracao) => configuracao.GetValue<bool>(Flag);

    /// <summary>Trava: relógio controlável nunca sobe em Production nem com o Asaas de produção.</summary>
    public static void GarantirForaDeProducao(IConfiguration configuracao, IHostEnvironment ambiente)
    {
        if (!Ligado(configuracao))
        {
            return;
        }

        var asaas = configuracao["Asaas:BaseUrl"] ?? "";
        var asaasDeProducao = asaas.Contains("api.asaas.com", StringComparison.OrdinalIgnoreCase);
        if (ambiente.IsProduction() || asaasDeProducao)
        {
            throw new InvalidOperationException($"{Flag} só pode ser ligado no ambiente E2E.");
        }
    }

    public static void Mapear(WebApplication app, RelogioControlavel relogio)
    {
        var grupo = app.MapGroup("/_test");

        grupo.MapGet("/relogio", () => Results.Ok(new { agora = Relogio.Agora, deslocamento = relogio.Deslocamento.ToString() }));

        grupo.MapPost("/relogio/avancar", (AvancarRelogio pedido) =>
        {
            relogio.Avancar(TimeSpan.FromDays(pedido.Dias) + TimeSpan.FromHours(pedido.Horas) + TimeSpan.FromMinutes(pedido.Minutos));
            return Results.Ok(new { agora = Relogio.Agora });
        });

        grupo.MapPost("/relogio/definir", (DefinirRelogio pedido) =>
        {
            relogio.Definir(pedido.Momento);
            return Results.Ok(new { agora = Relogio.Agora });
        });

        grupo.MapPost("/relogio/zerar", () =>
        {
            relogio.Zerar();
            return Results.Ok(new { agora = Relogio.Agora });
        });

        grupo.MapPost("/jobs/controle-diario-assinaturas", async (AvisosAssinaturaServico servico, CancellationToken ct) =>
            Results.Ok(await servico.RodarAsync(Relogio.Agora, ct)));

        grupo.MapPost("/jobs/processar-importacoes", async (ImportacaoServico servico, CancellationToken ct) =>
        {
            var processadas = 0;
            while (await servico.ProcessarProximaAsync(() => Relogio.Agora, ct))
            {
                processadas++;
            }

            return Results.Ok(new { processadas });
        });
    }

    public sealed record AvancarRelogio(int Dias = 0, int Horas = 0, int Minutos = 0);

    public sealed record DefinirRelogio(DateTimeOffset Momento);
}
