using System.Collections.Concurrent;
using Project.Infrastructure.Assinaturas;

namespace Project.IntegrationTests.Suporte;

/// <summary>Asaas simulado: guarda o que foi pedido e gera uma cobrança por assinatura.</summary>
public sealed class AsaasDeTeste : IAsaas
{
    public const string TokenWebhook = "token-de-webhook-de-teste-com-mais-de-32-caracteres";

    public ConcurrentDictionary<string, (string ClienteId, decimal Valor, DateOnly Vencimento, string Forma)> Assinaturas { get; } = new();

    public ConcurrentBag<string> Canceladas { get; } = [];

    public bool Configurado => true;

    public Task<ClienteAsaas> CriarClienteAsync(string nome, string documento, string email, string referencia, List<PassoAsaas> passos, CancellationToken ct)
    {
        passos.Add(new PassoAsaas("Criar cliente", "POST", "/v3/customers", 200, null, null));
        return Task.FromResult(new ClienteAsaas($"cus_{Guid.NewGuid():N}"));
    }

    public Task<AssinaturaAsaas> CriarAssinaturaAsync(string clienteId, string formaPagamento, decimal valor, DateOnly vencimento, string descricao, string referencia, List<PassoAsaas> passos, CancellationToken ct)
    {
        var id = $"sub_{Guid.NewGuid():N}";
        Assinaturas[id] = (clienteId, valor, vencimento, formaPagamento);
        passos.Add(new PassoAsaas("Criar assinatura", "POST", "/v3/subscriptions", 200, null, null));
        return Task.FromResult(new AssinaturaAsaas(id, vencimento));
    }

    public Task<IReadOnlyList<CobrancaAsaas>> CobrancasDaAssinaturaAsync(string assinaturaId, List<PassoAsaas> passos, CancellationToken ct)
    {
        var (_, valor, vencimento, forma) = Assinaturas[assinaturaId];
        passos.Add(new PassoAsaas("Listar cobranças da assinatura", "GET", $"/v3/subscriptions/{assinaturaId}/payments", 200, null, null));
        IReadOnlyList<CobrancaAsaas> cobrancas = [new(Reativadas.Contains(assinaturaId) ? $"{PagamentoDe(assinaturaId)}_{vencimento:yyyyMMdd}" : PagamentoDe(assinaturaId), valor, vencimento, "PENDING", $"https://sandbox.asaas.com/i/{assinaturaId}", forma)];
        return Task.FromResult(cobrancas);
    }

    public ConcurrentBag<string> Reativadas { get; } = [];

    public ConcurrentBag<string> CobrancasRemovidas { get; } = [];

    public Task ReativarAssinaturaAsync(string assinaturaId, DateOnly proximoVencimento, List<PassoAsaas> passos, CancellationToken ct)
    {
        Assinaturas[assinaturaId] = Assinaturas[assinaturaId] with { Vencimento = proximoVencimento };
        Reativadas.Add(assinaturaId);
        return Task.CompletedTask;
    }

    public Task RemoverCobrancaAsync(string cobrancaId, List<PassoAsaas> passos, CancellationToken ct)
    {
        CobrancasRemovidas.Add(cobrancaId);
        return Task.CompletedTask;
    }

    public Task CancelarAssinaturaAsync(string assinaturaId, List<PassoAsaas> passos, CancellationToken ct)
    {
        Canceladas.Add(assinaturaId);
        return Task.CompletedTask;
    }

    public ConcurrentDictionary<string, decimal> ValoresAtualizados { get; } = new();

    public ConcurrentDictionary<string, bool> PendentesAtualizados { get; } = new();

    public Task AtualizarValorAsync(string assinaturaId, decimal valor, List<PassoAsaas> passos, CancellationToken ct, bool atualizarPendentes = false)
    {
        ValoresAtualizados[assinaturaId] = valor;
        PendentesAtualizados[assinaturaId] = atualizarPendentes;
        return Task.CompletedTask;
    }

    /// <summary>Cobranças avulsas (upgrade): id → (valor, vencimento, externalReference).</summary>
    public ConcurrentDictionary<string, (decimal Valor, DateOnly Vencimento, string Referencia)> Avulsas { get; } = new();

    public Task<CobrancaAsaas> CriarCobrancaAsync(string clienteId, string formaPagamento, decimal valor, DateOnly vencimento, string descricao, string referencia, List<PassoAsaas> passos, CancellationToken ct)
    {
        var id = $"pay_avulsa_{Guid.NewGuid():N}";
        Avulsas[id] = (valor, vencimento, referencia);
        passos.Add(new PassoAsaas("Criar cobrança avulsa", "POST", "/v3/payments", 200, null, null));
        return Task.FromResult(new CobrancaAsaas(id, valor, vencimento, "PENDING", $"https://sandbox.asaas.com/i/{id}", formaPagamento));
    }

    public static string PagamentoDe(string assinaturaId) => "pay_" + assinaturaId[4..];
}
