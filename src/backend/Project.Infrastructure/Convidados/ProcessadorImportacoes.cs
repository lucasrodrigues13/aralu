using Project.Application.Comum;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Project.Application.Convidados;

namespace Project.Infrastructure.Convidados;

/// <summary>Sinal entre o envio da planilha e o processamento em segundo plano (SPEC-059 §6.6).</summary>
public sealed class SinalImportacao : ISinalImportacao
{
    private readonly SemaphoreSlim sinal = new(0);

    public void Avisar()
    {
        if (sinal.CurrentCount == 0)
        {
            sinal.Release();
        }
    }

    public Task EsperarAsync(TimeSpan limite, CancellationToken ct) => sinal.WaitAsync(limite, ct);
}

/// <summary>
/// Processa a fila de importações dentro da própria API (serviço em segundo plano nativo do .NET, sem worker separado).
/// Ao iniciar, retoma as importações que ficaram em Processando; depois processa as Pendentes, uma por vez, quando
/// chega um aviso de envio ou, por garantia, a cada 30 segundos.
/// </summary>
public sealed class ProcessadorImportacoes(
    IServiceScopeFactory escopos,
    SinalImportacao sinal,
    IConfiguration configuracao,
    ILogger<ProcessadorImportacoes> log)
    : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromSeconds(30);

    /// <summary>Segundos em cada status (Pendente e Processando). Zero fora do teste manual.</summary>
    private readonly TimeSpan atraso = TimeSpan.FromSeconds(Math.Clamp(configuracao.GetValue("Importacao:AtrasoSegundos", 0), 0, 60));

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (atraso > TimeSpan.Zero)
        {
            log.LogInformation(
                "Importação de convidados espera {Segundos}s em Pendente e {Segundos}s em Processando, para a troca de status aparecer na tela.",
                atraso.TotalSeconds,
                atraso.TotalSeconds);
        }

        await Task.Yield();
        var retomou = false;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var escopo = escopos.CreateScope();
                var servico = escopo.ServiceProvider.GetRequiredService<ImportacaoServico>();
                if (!retomou)
                {
                    await servico.RetomarInterrompidasAsync(ct);
                    retomou = true;
                }

                while (await servico.ProcessarProximaAsync(() => Relogio.Agora, ct, atraso))
                {
                }
            }
            catch (Exception erro) when (erro is not OperationCanceledException)
            {
                log.LogError("Falha ao processar a fila de importações de convidados: {Tipo}.", erro.GetType().Name);
            }

            try
            {
                await sinal.EsperarAsync(Intervalo, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
