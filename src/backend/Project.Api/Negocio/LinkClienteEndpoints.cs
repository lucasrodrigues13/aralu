using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Convidados;
using Project.Application.Negocio;

namespace Project.Api.Negocio;

/// <summary>Link do cliente (SPEC-046): gestão pela dona do evento e acesso público ao financeiro.</summary>
public static class LinkClienteEndpoints
{
    private const string Invalido = "O arquivo não foi aceito. Use JPG, JPEG, PNG ou PDF de até 5 MB.";

    public static void Mapear(WebApplication app)
    {
        var dona = app.MapGroup("/api/v1/eventos/{id:guid}/link-cliente").RequireAuthorization(policy => policy.RequireRole(Papeis.Organizer));
        dona.AddEndpointFilter(EscopoAssistente.Filtro);
        dona.MapGet("", Obter);
        dona.MapPost("", Gerar);
        dona.MapPut("", Salvar);
        dona.MapDelete("", Desativar);

        // Código de acesso (SPEC-063): estas rotas não pedem sessão; todas as outras do link pedem (R1).
        var acesso = app.MapGroup("/api/v1/publico/cliente/{token}/acesso");
        acesso.MapGet("", LerAcesso);
        acesso.MapPost("/codigo", PedirCodigo);
        acesso.MapPost("/confirmar", ConfirmarCodigo);

        var cliente = app.MapGroup("/api/v1/publico/cliente/{token}");
        cliente.AddEndpointFilter(ExigirSessao);
        cliente.MapGet("", LerPagina);
        var pagamento = "/pagamentos/{servicoId:guid}";
        cliente.MapPut(pagamento + "/parcelamento", Parcelar);
        cliente.MapDelete(pagamento + "/parcelamento", RemoverParcelamento);
        cliente.MapPut(pagamento + "/pago", MarcarPagamento);
        cliente.MapPut(pagamento + "/parcelas/{parcelaId:guid}/pago", MarcarParcela);
        cliente.MapPost(pagamento + "/comprovante", EnviarComprovante).DisableAntiforgery();
        cliente.MapDelete(pagamento + "/comprovante", ExcluirComprovante);
        cliente.MapPost(pagamento + "/parcelas/{parcelaId:guid}/comprovante", EnviarComprovanteDaParcela).DisableAntiforgery();
        cliente.MapDelete(pagamento + "/parcelas/{parcelaId:guid}/comprovante", ExcluirComprovanteDaParcela);
        cliente.MapPost(pagamento + "/contrato-assinado", EnviarContratoAssinado).DisableAntiforgery();
        cliente.MapDelete(pagamento + "/contrato-assinado", ExcluirContratoAssinado);
        cliente.MapPost("/convites", CriarConvite);
        cliente.MapPut("/convites/{conviteId:guid}", AtualizarConvite);
        cliente.MapGet("/arquivos/{arquivoId:guid}", Arquivo);
        cliente.MapPut("/prazo-rsvp", DefinirPrazoRsvp);
        cliente.MapPut("/envio-convites", DefinirEnvioConvites);
        cliente.MapGet("/presencas", Presencas);
        cliente.MapGet("/convites/planilha", Planilha);
        cliente.MapPost("/convites/importar", Importar).DisableAntiforgery();
        cliente.MapGet("/convites/importacoes", Importacoes);
    }

    private static Task<IResult> Obter(Guid id, ClaimsPrincipal usuario, LinkClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> Gerar(Guid id, ClaimsPrincipal usuario, LinkClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.GerarAsync(conta, id, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> Salvar(Guid id, SalvarLinkCliente pedido, ClaimsPrincipal usuario, LinkClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarAsync(conta, id, pedido, ct)));

    private static Task<IResult> Desativar(Guid id, ClaimsPrincipal usuario, LinkClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DesativarAsync(conta, id, ct)));

    private static Task<IResult> LerPagina(string token, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.LerPaginaAsync(token, ct));

    // ---- Código de acesso (SPEC-063) ----

    /// <summary>Cookie da sessão do link: só o navegador guarda o token; vale só para as rotas deste link.</summary>
    public const string CookieSessao = "aralu_link_cliente";

    private static Task<IResult> LerAcesso(string token, HttpContext http, AcessoLinkClienteServico servico, CancellationToken ct) =>
        De(servico.LerAsync(token, http.Request.Cookies[CookieSessao], DateTimeOffset.UtcNow, ct));

    private static Task<IResult> PedirCodigo(string token, PedirCodigoLink pedido, AcessoLinkClienteServico servico, CancellationToken ct) =>
        De(servico.PedirCodigoAsync(token, pedido, DateTimeOffset.UtcNow, ct));

    private static async Task<IResult> ConfirmarCodigo(string token, ConfirmarCodigoLink pedido, HttpContext http, AcessoLinkClienteServico servico, CancellationToken ct)
    {
        var resultado = await servico.ConfirmarAsync(token, pedido, DateTimeOffset.UtcNow, ct);
        if (!resultado.Ok)
        {
            return Falha(resultado.Falha!);
        }

        GravarCookie(http, token, resultado.Valor!.Token, resultado.Valor.ExpiraEm);
        return Results.Ok(new { ok = true });
    }

    /// <summary>Nenhum dado do link sai sem sessão válida (SPEC-063 R1); cada uso renova a sessão (R6).</summary>
    private static async ValueTask<object?> ExigirSessao(EndpointFilterInvocationContext contexto, EndpointFilterDelegate proximo)
    {
        var http = contexto.HttpContext;
        var token = http.Request.RouteValues["token"] as string ?? "";
        var sessao = http.Request.Cookies[CookieSessao];
        var servico = http.RequestServices.GetRequiredService<AcessoLinkClienteServico>();
        var (existe, expira) = await servico.ValidarSessaoAsync(token, sessao, DateTimeOffset.UtcNow, http.RequestAborted);
        if (!existe)
        {
            // A própria rota responde "Link inválido." sem entregar dado.
            return await proximo(contexto);
        }

        if (expira is null)
        {
            return Results.Json(
                new ErroResposta("sessao", AcessoLinkClienteServico.SessaoVencida),
                statusCode: StatusCodes.Status401Unauthorized);
        }

        GravarCookie(http, token, sessao!, expira.Value);
        return await proximo(contexto);
    }

    private static void GravarCookie(HttpContext http, string token, string sessao, DateTimeOffset expira) =>
        http.Response.Cookies.Append(CookieSessao, sessao, new CookieOptions
        {
            HttpOnly = true,
            Secure = http.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/api/v1/publico/cliente/" + Uri.EscapeDataString(token),
            Expires = expira,
            IsEssential = true,
        });

    private static Task<IResult> DefinirPrazoRsvp(string token, PrazoRsvpPedido pedido, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.DefinirPrazoRsvpAsync(token, pedido.Prazo, Hoje(), ct));

    private static Task<IResult> DefinirEnvioConvites(string token, EnvioConvitesPedido pedido, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.DefinirEnvioConvitesAsync(token, pedido.Data, ct));

    private static Task<IResult> Presencas(string token, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.ListarPresencasAsync(token, ct));

    private static async Task<IResult> Planilha(string token, LinkClienteServico servico, CancellationToken ct)
    {
        var modelo = await servico.ModeloPlanilhaAsync(token, ct);
        return modelo.Ok
            ? Results.File(modelo.Valor!, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "convidados.xlsx")
            : Falha(modelo.Falha!);
    }

    private static async Task<IResult> Importar(string token, HttpRequest request, LinkClienteServico servico, CancellationToken ct)
    {
        if (!request.HasFormContentType)
        {
            return Falha(new Falha(Codigos.Validacao, "Envie uma planilha .xlsx ou .xls."));
        }

        var arquivo = (await request.ReadFormAsync(ct)).Files.GetFile("arquivo");
        if (arquivo is null || arquivo.Length == 0 || arquivo.Length > ImportacaoServico.TamanhoMaximo)
        {
            return Falha(new Falha(Codigos.Validacao, "Envie uma planilha .xlsx ou .xls de até 10 MB."));
        }

        await using var fluxo = arquivo.OpenReadStream();
        return await De(servico.EnfileirarImportacaoAsync(token, fluxo, arquivo.FileName, DateTimeOffset.UtcNow, ct));
    }

    private static Task<IResult> Importacoes(string token, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.ListarImportacoesAsync(token, ct));

    private static Task<IResult> CriarConvite(string token, FormularioConvitePedido pedido, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.CriarConviteAsync(token, pedido, ct));

    private static Task<IResult> AtualizarConvite(string token, Guid conviteId, FormularioConvitePedido pedido, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.AtualizarConviteAsync(token, conviteId, pedido, ct));

    private static Task<IResult> Parcelar(string token, Guid servicoId, PedidoParcelas pedido, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.ParcelarAsync(token, servicoId, pedido, ct));

    private static Task<IResult> RemoverParcelamento(string token, Guid servicoId, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.RemoverParcelamentoAsync(token, servicoId, ct));

    private static Task<IResult> MarcarPagamento(string token, Guid servicoId, MarcarPago pedido, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.DefinirPagoAsync(token, servicoId, pedido.Pago, Hoje(), ct));

    private static Task<IResult> MarcarParcela(string token, Guid servicoId, Guid parcelaId, MarcarPago pedido, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.DefinirParcelaPagaAsync(token, servicoId, parcelaId, pedido.Pago, Hoje(), ct));

    private static Task<IResult> EnviarComprovante(string token, Guid servicoId, HttpRequest request, LinkClienteServico servico, CancellationToken ct) =>
        Enviar(request, ct, (fluxo, nome) => servico.EnviarComprovanteAsync(token, servicoId, null, fluxo, nome, ct));

    private static Task<IResult> EnviarComprovanteDaParcela(string token, Guid servicoId, Guid parcelaId, HttpRequest request, LinkClienteServico servico, CancellationToken ct) =>
        Enviar(request, ct, (fluxo, nome) => servico.EnviarComprovanteAsync(token, servicoId, parcelaId, fluxo, nome, ct));

    private static Task<IResult> ExcluirComprovante(string token, Guid servicoId, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.ExcluirComprovanteAsync(token, servicoId, null, ct));

    private static Task<IResult> ExcluirComprovanteDaParcela(string token, Guid servicoId, Guid parcelaId, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.ExcluirComprovanteAsync(token, servicoId, parcelaId, ct));

    private static Task<IResult> EnviarContratoAssinado(string token, Guid servicoId, HttpRequest request, LinkClienteServico servico, CancellationToken ct) =>
        Enviar(request, ct, (fluxo, nome) => servico.EnviarContratoAssinadoAsync(token, servicoId, fluxo, nome, Hoje(), ct));

    private static Task<IResult> ExcluirContratoAssinado(string token, Guid servicoId, LinkClienteServico servico, CancellationToken ct) =>
        De(servico.ExcluirContratoAssinadoAsync(token, servicoId, Hoje(), ct));

    private static async Task<IResult> Arquivo(string token, Guid arquivoId, HttpContext http, LinkClienteServico servico, CancellationToken ct)
    {
        var resultado = await servico.AbrirArquivoAsync(token, arquivoId, ct);
        if (!resultado.Ok)
        {
            return Falha(resultado.Falha!);
        }

        var aberto = resultado.Valor!;
        http.Response.Headers.XContentTypeOptions = "nosniff";
        return Results.File(aberto.Conteudo, aberto.TipoConteudo, LimparNome(aberto.NomeOriginal));
    }

    private static async Task<IResult> Enviar(HttpRequest request, CancellationToken ct, Func<Stream, string, Task<Resultado<PaginaClienteLeitura>>> enviar)
    {
        if (!request.HasFormContentType)
        {
            return Falha(new Falha(Codigos.Validacao, Invalido));
        }

        var formulario = await request.ReadFormAsync(ct);
        var arquivo = formulario.Files.GetFile("arquivo");
        if (arquivo is null || arquivo.Length == 0 || arquivo.Length > 5 * 1024 * 1024)
        {
            return Falha(new Falha(Codigos.Validacao, Invalido));
        }

        await using var fluxo = arquivo.OpenReadStream();
        return await De(enviar(fluxo, arquivo.FileName));
    }

    private static Task<IResult> ComConta(ClaimsPrincipal usuario, Func<Guid, Task<IResult>> acao)
    {
        var conta = ContaAtual.De(usuario);
        return conta is null
            ? Task.FromResult(Results.Json(new ErroResposta("autenticacao", "É preciso entrar para continuar."), statusCode: StatusCodes.Status401Unauthorized))
            : acao(conta.Value);
    }

    private static async Task<IResult> De<T>(Task<Resultado<T>> tarefa)
    {
        var resultado = await tarefa;
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static IResult Falha(Falha falha) =>
        Results.Json(
            new ErroResposta(falha.Codigo, falha.Mensagem),
            statusCode: falha.Codigo switch
            {
                Codigos.Indisponivel => StatusCodes.Status404NotFound,
                Codigos.Proibido => StatusCodes.Status403Forbidden,
                _ => StatusCodes.Status400BadRequest,
            });

    private static string LimparNome(string nome) =>
        new string(nome.Where(c => !char.IsControl(c) && c != '"' && c != '\\' && c != '/').ToArray()) is { Length: > 0 } limpo ? limpo : "arquivo";

    private static DateOnly Hoje() => DateOnly.FromDateTime(DateTime.UtcNow);
}
