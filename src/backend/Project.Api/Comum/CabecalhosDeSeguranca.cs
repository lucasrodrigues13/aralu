using Microsoft.AspNetCore.Http;

namespace Project.Api.Comum;

/// <summary>
/// A06-003: respostas de /api/ saem com nosniff e sem cache. Quem já definiu Cache-Control
/// (mídia pública da proposta) mantém o próprio valor.
/// </summary>
public static class CabecalhosDeSeguranca
{
    public static Task Aplicar(HttpContext http, Func<Task> proximo)
    {
        if (http.Request.Path.StartsWithSegments("/api"))
        {
            http.Response.OnStarting(() =>
            {
                var cabecalhos = http.Response.Headers;
                cabecalhos.XContentTypeOptions = "nosniff";
                if (string.IsNullOrEmpty(cabecalhos.CacheControl))
                {
                    cabecalhos.CacheControl = "no-store";
                }
                return Task.CompletedTask;
            });
        }
        return proximo();
    }
}
