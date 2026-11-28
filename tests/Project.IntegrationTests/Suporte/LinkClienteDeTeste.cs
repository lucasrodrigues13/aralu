using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Project.IntegrationTests.Suporte;

/// <summary>Abre o link do cliente como o cliente faria: e-mail de cliente do evento, código e sessão (SPEC-063).</summary>
public static partial class LinkClienteDeTeste
{
    /// <summary>Cadastra um cliente com e-mail vinculado ao evento e devolve o e-mail.</summary>
    public static async Task<(string Email, Guid ClienteId)> VincularClienteComEmailAsync(HttpClient dono, Guid eventoId)
    {
        var email = $"cliente-{Guid.NewGuid():N}@aralu.test";
        var cliente = await Ler(await dono.PostAsJsonAsync("/api/v1/clientes", new
        {
            nome = "Cliente do Link",
            papel = "Anfitriao",
            email,
            ddi = "+55",
            celular = "11988887777",
        }));
        var vinculo = await dono.PostAsJsonAsync($"/api/v1/eventos/{eventoId}/clientes", new { clienteId = cliente.GetProperty("id").GetGuid() });
        vinculo.EnsureSuccessStatusCode();
        return (email, cliente.GetProperty("id").GetGuid());
    }

    /// <summary>Pede o código e lê o último e-mail enviado para <paramref name="email"/>.</summary>
    public static string UltimoCodigo(FabricaApi fabrica, string email)
    {
        var mensagem = fabrica.Email.Mensagens.Last(item => item.Email == email && item.Assunto == "Seu código para abrir o link do evento");
        return SeisDigitos().Match(mensagem.Corpo).Value;
    }

    /// <summary>Cliente HTTP novo, com sessão aberta no link (cookie). Vincula um cliente com e-mail se preciso.</summary>
    public static async Task<HttpClient> AbrirAsync(FabricaApi fabrica, HttpClient dono, Guid eventoId, string token)
    {
        var (email, clienteId) = await VincularClienteComEmailAsync(dono, eventoId);
        var cliente = fabrica.CreateClient();
        (await cliente.PostAsJsonAsync($"/api/v1/publico/cliente/{token}/acesso/codigo", new { clienteId })).EnsureSuccessStatusCode();
        var codigo = UltimoCodigo(fabrica, email);
        (await cliente.PostAsJsonAsync($"/api/v1/publico/cliente/{token}/acesso/confirmar", new { codigo })).EnsureSuccessStatusCode();
        return cliente;
    }

    private static async Task<JsonElement> Ler(HttpResponseMessage resposta)
    {
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<JsonElement>())!;
    }

    [GeneratedRegex(@"\b\d{6}\b")]
    private static partial Regex SeisDigitos();
}
