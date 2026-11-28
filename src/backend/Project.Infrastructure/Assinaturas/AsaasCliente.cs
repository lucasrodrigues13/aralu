using Project.Application.Comum;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Project.Infrastructure.Assinaturas;

/// <summary>Configuração do Asaas (seção "Asaas"). Chave e token vêm do ambiente, nunca do Git.</summary>
public sealed class AsaasOpcoes
{
    /// <summary>Sandbox por padrão; produção precisa dizer https://api.asaas.com.</summary>
    public string BaseUrl { get; set; } = "https://api-sandbox.asaas.com";

    public string ApiKey { get; set; } = "";

    /// <summary>authToken configurado no webhook do Asaas; chega no header asaas-access-token.</summary>
    public string WebhookToken { get; set; } = "";

    /// <summary>
    /// Staging: devolve ao navegador o passo a passo das chamadas ao Asaas (método, rota, status e resposta),
    /// para ver no DevTools. A chave nunca entra. Desligado em produção.
    /// </summary>
    public bool DiagnosticoNoNavegador { get; set; }

    /// <summary>Ambiente da aplicação (App:Environment); "production" nunca expõe o diagnóstico, mesmo com a flag ligada.</summary>
    public string? Ambiente { get; set; }

    public bool EmProducao => string.Equals(Ambiente?.Trim(), "production", StringComparison.OrdinalIgnoreCase);

    /// <summary>Flag ligada e ambiente que não é produção.</summary>
    public bool DiagnosticoAtivo => DiagnosticoNoNavegador && !EmProducao;

    public bool Configurado => !string.IsNullOrWhiteSpace(ApiKey);
}

/// <summary>Um passo da conversa com o Asaas, para o diagnóstico no navegador e para o log do servidor.</summary>
public sealed record PassoAsaas(string Passo, string Metodo, string Rota, int Status, JsonNode? Enviado, JsonNode? Resposta);

/// <summary>Avisa no boot quando o diagnóstico do Asaas está ligado em produção (ele fica desativado de qualquer forma).</summary>
public sealed class AvisoDiagnosticoAsaas(IOptions<AsaasOpcoes> opcoes, ILogger<AvisoDiagnosticoAsaas> logs) : Microsoft.Extensions.Hosting.IHostedService
{
    public Task StartAsync(CancellationToken ct)
    {
        if (opcoes.Value.DiagnosticoNoNavegador && opcoes.Value.EmProducao)
        {
            logs.LogWarning("Asaas:DiagnosticoNoNavegador está ligado em produção; o diagnóstico fica desativado. Desligue ASAAS_DIAGNOSTICO.");
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}

public sealed record ClienteAsaas(string Id);

public sealed record AssinaturaAsaas(string Id, DateOnly ProximoVencimento);

public sealed record CobrancaAsaas(string Id, decimal Valor, DateOnly Vencimento, string Status, string? Link, string? FormaPagamento);

public sealed class ErroAsaas(string mensagem) : Exception(mensagem);

/// <summary>Chamadas ao Asaas usadas pela assinatura. Interface para os testes trocarem por um Asaas simulado.</summary>
public interface IAsaas
{
    bool Configurado { get; }

    Task<ClienteAsaas> CriarClienteAsync(string nome, string documento, string email, string referencia, List<PassoAsaas> passos, CancellationToken ct);

    Task<AssinaturaAsaas> CriarAssinaturaAsync(string clienteId, string formaPagamento, decimal valor, DateOnly vencimento, string descricao, string referencia, List<PassoAsaas> passos, CancellationToken ct);

    Task<IReadOnlyList<CobrancaAsaas>> CobrancasDaAssinaturaAsync(string assinaturaId, List<PassoAsaas> passos, CancellationToken ct);

    /// <summary>Cancelar: só desativa a recorrência (status INACTIVE); a assinatura continua no Asaas para ser reativada.</summary>
    Task CancelarAssinaturaAsync(string assinaturaId, List<PassoAsaas> passos, CancellationToken ct);

    /// <summary>Reativar: volta a recorrência da mesma assinatura (status ACTIVE) com o próximo vencimento informado.</summary>
    Task ReativarAssinaturaAsync(string assinaturaId, DateOnly proximoVencimento, List<PassoAsaas> passos, CancellationToken ct);

    /// <summary>Remove uma cobrança pendente (a da recorrência desativada não deve ficar para pagar).</summary>
    Task RemoverCobrancaAsync(string cobrancaId, List<PassoAsaas> passos, CancellationToken ct);

    /// <summary>Novo valor a partir da próxima cobrança; a cobrança já gerada não muda (§6 D6).</summary>
    /// <remarks>Com <paramref name="atualizarPendentes"/>, a cobrança do próximo ciclo já gerada e pendente também muda (SPEC-065 regras 11 e 16).</remarks>
    Task AtualizarValorAsync(string assinaturaId, decimal valor, List<PassoAsaas> passos, CancellationToken ct, bool atualizarPendentes = false);

    /// <summary>Cobrança avulsa (upgrade, SPEC-065): fora da recorrência, identificada pelo externalReference.</summary>
    Task<CobrancaAsaas> CriarCobrancaAsync(string clienteId, string formaPagamento, decimal valor, DateOnly vencimento, string descricao, string referencia, List<PassoAsaas> passos, CancellationToken ct);
}

/// <summary>API v3 do Asaas (https://docs.asaas.com). Autenticação pelo header access_token.</summary>
public sealed class AsaasHttp(HttpClient http, IOptions<AsaasOpcoes> opcoes, ILogger<AsaasHttp> logs) : IAsaas
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public bool Configurado => opcoes.Value.Configurado;

    public async Task<ClienteAsaas> CriarClienteAsync(string nome, string documento, string email, string referencia, List<PassoAsaas> passos, CancellationToken ct)
    {
        var resposta = await EnviarAsync("Criar cliente", HttpMethod.Post, "/v3/customers", new JsonObject
        {
            ["name"] = nome,
            ["cpfCnpj"] = documento,
            ["email"] = email,
            ["externalReference"] = referencia,
            ["notificationDisabled"] = false,
        }, passos, ct);
        return new ClienteAsaas(Texto(resposta, "id"));
    }

    public async Task<AssinaturaAsaas> CriarAssinaturaAsync(string clienteId, string formaPagamento, decimal valor, DateOnly vencimento, string descricao, string referencia, List<PassoAsaas> passos, CancellationToken ct)
    {
        var resposta = await EnviarAsync("Criar assinatura", HttpMethod.Post, "/v3/subscriptions", new JsonObject
        {
            ["customer"] = clienteId,
            ["billingType"] = formaPagamento,
            ["value"] = valor,
            ["nextDueDate"] = vencimento.ToString("yyyy-MM-dd"),
            ["cycle"] = "MONTHLY",
            ["description"] = descricao,
            ["externalReference"] = referencia,
        }, passos, ct);
        return new AssinaturaAsaas(Texto(resposta, "id"), DateOnly.Parse(Texto(resposta, "nextDueDate")));
    }

    public async Task<IReadOnlyList<CobrancaAsaas>> CobrancasDaAssinaturaAsync(string assinaturaId, List<PassoAsaas> passos, CancellationToken ct)
    {
        var resposta = await EnviarAsync("Listar cobranças da assinatura", HttpMethod.Get, $"/v3/subscriptions/{Uri.EscapeDataString(assinaturaId)}/payments", null, passos, ct);
        return (resposta?["data"]?.AsArray() ?? [])
            .Where(item => item is not null)
            .Select(item => LerCobranca(item!))
            .OrderBy(item => item.Vencimento)
            .ToList();
    }

    public Task CancelarAssinaturaAsync(string assinaturaId, List<PassoAsaas> passos, CancellationToken ct) =>
        EnviarAsync("Desativar assinatura", HttpMethod.Put, $"/v3/subscriptions/{Uri.EscapeDataString(assinaturaId)}", new JsonObject
        {
            ["status"] = "INACTIVE",
        }, passos, ct);

    public Task ReativarAssinaturaAsync(string assinaturaId, DateOnly proximoVencimento, List<PassoAsaas> passos, CancellationToken ct) =>
        EnviarAsync("Reativar assinatura", HttpMethod.Put, $"/v3/subscriptions/{Uri.EscapeDataString(assinaturaId)}", new JsonObject
        {
            ["status"] = "ACTIVE",
            ["nextDueDate"] = proximoVencimento.ToString("yyyy-MM-dd"),
        }, passos, ct);

    public Task RemoverCobrancaAsync(string cobrancaId, List<PassoAsaas> passos, CancellationToken ct) =>
        EnviarAsync("Remover cobrança pendente", HttpMethod.Delete, $"/v3/payments/{Uri.EscapeDataString(cobrancaId)}", null, passos, ct);

    public Task AtualizarValorAsync(string assinaturaId, decimal valor, List<PassoAsaas> passos, CancellationToken ct, bool atualizarPendentes = false) =>
        EnviarAsync("Atualizar valor da assinatura", HttpMethod.Put, $"/v3/subscriptions/{Uri.EscapeDataString(assinaturaId)}", new JsonObject
        {
            ["value"] = valor,
            ["updatePendingPayments"] = atualizarPendentes,
        }, passos, ct);

    public async Task<CobrancaAsaas> CriarCobrancaAsync(string clienteId, string formaPagamento, decimal valor, DateOnly vencimento, string descricao, string referencia, List<PassoAsaas> passos, CancellationToken ct)
    {
        var resposta = await EnviarAsync("Criar cobrança avulsa", HttpMethod.Post, "/v3/payments", new JsonObject
        {
            ["customer"] = clienteId,
            ["billingType"] = formaPagamento,
            ["value"] = valor,
            ["dueDate"] = vencimento.ToString("yyyy-MM-dd"),
            ["description"] = descricao,
            ["externalReference"] = referencia,
        }, passos, ct);
        return LerCobranca(resposta ?? throw new ErroAsaas("Resposta do Asaas vazia."));
    }

    public static CobrancaAsaas LerCobranca(JsonNode item) => new(
        item["id"]?.GetValue<string>() ?? "",
        item["value"]?.GetValue<decimal>() ?? 0m,
        DateOnly.Parse(item["dueDate"]?.GetValue<string>() ?? Relogio.AgoraUtc.ToString("yyyy-MM-dd")),
        item["status"]?.GetValue<string>() ?? "",
        item["invoiceUrl"]?.GetValue<string>(),
        item["billingType"]?.GetValue<string>());

    private async Task<JsonNode?> EnviarAsync(string passo, HttpMethod metodo, string rota, JsonObject? corpo, List<PassoAsaas> passos, CancellationToken ct)
    {
        if (!Configurado)
        {
            throw new ErroAsaas("O Asaas não está configurado neste ambiente (Asaas__ApiKey).");
        }

        using var pedido = new HttpRequestMessage(metodo, opcoes.Value.BaseUrl.TrimEnd('/') + rota);
        pedido.Headers.Add("access_token", opcoes.Value.ApiKey);
        pedido.Headers.UserAgent.ParseAdd("aralu/1.0");
        if (corpo is not null)
        {
            pedido.Content = JsonContent.Create(corpo, options: Json);
        }

        using var resposta = await http.SendAsync(pedido, ct);
        var texto = await resposta.Content.ReadAsStringAsync(ct);
        JsonNode? lida = null;
        try
        {
            lida = string.IsNullOrWhiteSpace(texto) ? null : JsonNode.Parse(texto);
        }
        catch (JsonException)
        {
            lida = JsonValue.Create(texto.Length > 500 ? texto[..500] : texto);
        }

        passos.Add(new PassoAsaas(passo, metodo.Method, rota, (int)resposta.StatusCode, corpo?.DeepClone(), lida?.DeepClone()));
        logs.LogInformation("Asaas {Passo}: {Metodo} {Rota} → {Status}", passo, metodo.Method, rota, (int)resposta.StatusCode);
        if (!resposta.IsSuccessStatusCode)
        {
            var descricao = lida?["errors"]?[0]?["description"]?.GetValue<string>();
            throw new ErroAsaas(descricao ?? $"O Asaas recusou o pedido ({(int)resposta.StatusCode}).");
        }

        return lida;
    }

    private static string Texto(JsonNode? no, string campo) =>
        no?[campo]?.GetValue<string>() ?? throw new ErroAsaas($"Resposta do Asaas sem o campo {campo}.");
}
