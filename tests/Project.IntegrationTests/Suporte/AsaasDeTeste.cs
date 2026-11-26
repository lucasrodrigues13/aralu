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
        IReadOnlyList<CobrancaAsaas> cobrancas = [new(PagamentoDe(assinaturaId), valor, vencimento, "PENDING", $"https://sandbox.asaas.com/i/{assinaturaId}", forma)];
        return Task.FromResult(cobrancas);
    }

    public Task CancelarAssinaturaAsync(string assinaturaId, List<PassoAsaas> passos, CancellationToken ct)
    {
        Canceladas.Add(assinaturaId);
        return Task.CompletedTask;
    }

    public static string PagamentoDe(string assinaturaId) => "pay_" + assinaturaId[4..];
}
