using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Project.Infrastructure.Conta;

/// <summary>Obtém e reaproveita o token OAuth2 (client credentials) do Entra ID para o SMTP do Exchange Online.</summary>
internal static class TokenSmtpEntra
{
    private static readonly HttpClient Http = new();
    private static readonly SemaphoreSlim Trava = new(1, 1);
    private static string? _token;
    private static DateTimeOffset _expira;
    private static string _chave = "";

    public static async Task<string> ObterAsync(EmailOpcoes opcoes, CancellationToken cancellationToken)
    {
        var chave = $"{opcoes.TenantId}|{opcoes.ClientId}";
        await Trava.WaitAsync(cancellationToken);
        try
        {
            if (_token is not null && _chave == chave && DateTimeOffset.UtcNow < _expira)
            {
                return _token;
            }

            using var corpo = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = opcoes.ClientId,
                ["client_secret"] = opcoes.ClientSecret,
                ["scope"] = "https://outlook.office365.com/.default",
            });

            var url = $"https://login.microsoftonline.com/{Uri.EscapeDataString(opcoes.TenantId)}/oauth2/v2.0/token";
            using var resposta = await Http.PostAsync(url, corpo, cancellationToken);
            if (!resposta.IsSuccessStatusCode)
            {
                // O Entra devolve o motivo (ex.: AADSTS7000215 = secret inválido). Isso não contém o secret.
                var erro = await resposta.Content.ReadFromJsonAsync<RespostaErro>(cancellationToken);
                var motivo = erro?.Descricao ?? erro?.Codigo ?? "sem detalhe";
                if (motivo.Length > 300)
                {
                    motivo = motivo[..300];
                }

                throw new InvalidOperationException($"O Entra ID recusou o pedido de token SMTP (HTTP {(int)resposta.StatusCode}): {motivo}");
            }

            var token = await resposta.Content.ReadFromJsonAsync<RespostaToken>(cancellationToken)
                ?? throw new InvalidOperationException("Resposta de token SMTP vazia.");
            if (string.IsNullOrEmpty(token.AccessToken))
            {
                throw new InvalidOperationException("Resposta de token SMTP sem access_token.");
            }

            _token = token.AccessToken;
            _chave = chave;
            _expira = DateTimeOffset.UtcNow.AddSeconds(Math.Max(token.ExpiresIn - 300, 0));
            return _token;
        }
        finally
        {
            Trava.Release();
        }
    }

    private sealed class RespostaErro
    {
        [JsonPropertyName("error")] public string? Codigo { get; set; }
        [JsonPropertyName("error_description")] public string? Descricao { get; set; }
    }

    private sealed class RespostaToken
    {
        [JsonPropertyName("access_token")] public string AccessToken { get; set; } = "";
        [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
    }
}
