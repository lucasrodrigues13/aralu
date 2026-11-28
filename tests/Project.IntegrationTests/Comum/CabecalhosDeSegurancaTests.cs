using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Project.Api.Comum;

namespace Project.IntegrationTests.Comum;

public class CabecalhosDeSegurancaTests
{
    private static async Task<IHost> Servidor()
    {
        var host = new HostBuilder().ConfigureWebHost(web => web.UseTestServer().Configure(app =>
        {
            app.Use(CabecalhosDeSeguranca.Aplicar);
            app.Run(async http =>
            {
                if (http.Request.Path.StartsWithSegments("/api/midia"))
                {
                    http.Response.Headers.CacheControl = "private, max-age=3600";
                }
                await http.Response.WriteAsync("ok");
            });
        })).Build();
        await host.StartAsync();
        return host;
    }

    [Fact]
    public async Task Api_recebe_nosniff_e_no_store()
    {
        using var host = await Servidor();
        var resposta = await host.GetTestClient().GetAsync("/api/negocios");
        Assert.Equal("nosniff", resposta.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.True(resposta.Headers.CacheControl!.NoStore);
    }

    [Fact]
    public async Task Midia_publica_mantem_o_proprio_cache()
    {
        using var host = await Servidor();
        var resposta = await host.GetTestClient().GetAsync("/api/midia/1");
        Assert.Equal("nosniff", resposta.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.False(resposta.Headers.CacheControl!.NoStore);
        Assert.Equal(TimeSpan.FromHours(1), resposta.Headers.CacheControl.MaxAge);
    }

    [Fact]
    public async Task Fora_de_api_nao_mexe()
    {
        using var host = await Servidor();
        var resposta = await host.GetTestClient().GetAsync("/proposta/abc");
        Assert.False(resposta.Headers.Contains("X-Content-Type-Options"));
        Assert.Null(resposta.Headers.CacheControl);
    }
}
