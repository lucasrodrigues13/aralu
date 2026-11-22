using System.Security.Claims;
using Project.Api.Conta;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Convidados;
using Project.Application.Negocio;

namespace Project.Api.Negocio;

/// <summary>Link do casal (SPEC-046): gestão pela dona do evento e acesso público ao financeiro.</summary>
public static class CasalEndpoints
{
    private const string Invalido = "O arquivo não foi aceito. Use JPG, JPEG, PNG ou PDF de até 5 MB.";

    public static void Mapear(WebApplication app)
    {
        var dona = app.MapGroup("/api/v1/eventos/{id:guid}/link-casal").RequireAuthorization(policy => policy.RequireRole(Papeis.Organizer));
        dona.AddEndpointFilter(EscopoAssistente.Filtro);
        dona.MapGet("", Obter);
        dona.MapPost("", Gerar);
        dona.MapPut("", Salvar);
        dona.MapDelete("", Desativar);

        var casal = app.MapGroup("/api/v1/publico/casal/{token}");
        casal.MapGet("", LerCasal);
        var pagamento = "/pagamentos/{servicoId:guid}";
        casal.MapPut(pagamento + "/parcelamento", Parcelar);
        casal.MapDelete(pagamento + "/parcelamento", RemoverParcelamento);
        casal.MapPut(pagamento + "/pago", MarcarPagamento);
        casal.MapPut(pagamento + "/parcelas/{parcelaId:guid}/pago", MarcarParcela);
        casal.MapPost(pagamento + "/comprovante", EnviarComprovante).DisableAntiforgery();
        casal.MapDelete(pagamento + "/comprovante", ExcluirComprovante);
        casal.MapPost(pagamento + "/parcelas/{parcelaId:guid}/comprovante", EnviarComprovanteDaParcela).DisableAntiforgery();
        casal.MapDelete(pagamento + "/parcelas/{parcelaId:guid}/comprovante", ExcluirComprovanteDaParcela);
        casal.MapPost(pagamento + "/contrato-assinado", EnviarContratoAssinado).DisableAntiforgery();
        casal.MapDelete(pagamento + "/contrato-assinado", ExcluirContratoAssinado);
        casal.MapPost("/convites", CriarConvite);
        casal.MapPut("/convites/{conviteId:guid}", AtualizarConvite);
        casal.MapGet("/arquivos/{arquivoId:guid}", Arquivo);
        casal.MapPut("/prazo-rsvp", DefinirPrazoRsvp);
        casal.MapPut("/envio-convites", DefinirEnvioConvites);
        casal.MapGet("/presencas", Presencas);
        casal.MapGet("/convites/planilha", Planilha);
        casal.MapPost("/convites/importar", Importar).DisableAntiforgery();
        casal.MapGet("/convites/importacoes", Importacoes);
    }

    private static Task<IResult> Obter(Guid id, ClaimsPrincipal usuario, LinkCasalServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> Gerar(Guid id, ClaimsPrincipal usuario, LinkCasalServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.GerarAsync(conta, id, DateTimeOffset.UtcNow, ct)));

    private static Task<IResult> Salvar(Guid id, SalvarLinkCasal pedido, ClaimsPrincipal usuario, LinkCasalServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarAsync(conta, id, pedido, ct)));

    private static Task<IResult> Desativar(Guid id, ClaimsPrincipal usuario, LinkCasalServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DesativarAsync(conta, id, ct)));

    private static Task<IResult> LerCasal(string token, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.LerCasalAsync(token, ct));

    private static Task<IResult> DefinirPrazoRsvp(string token, PrazoRsvpPedido pedido, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.DefinirPrazoRsvpAsync(token, pedido.Prazo, Hoje(), ct));

    private static Task<IResult> DefinirEnvioConvites(string token, EnvioConvitesPedido pedido, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.DefinirEnvioConvitesAsync(token, pedido.Data, ct));

    private static Task<IResult> Presencas(string token, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.ListarPresencasAsync(token, ct));

    private static async Task<IResult> Planilha(string token, LinkCasalServico servico, CancellationToken ct)
    {
        var modelo = await servico.ModeloPlanilhaAsync(token, ct);
        return modelo.Ok
            ? Results.File(modelo.Valor!, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "convidados.xlsx")
            : Falha(modelo.Falha!);
    }

    private static async Task<IResult> Importar(string token, HttpRequest request, LinkCasalServico servico, CancellationToken ct)
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

    private static Task<IResult> Importacoes(string token, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.ListarImportacoesAsync(token, ct));

    private static Task<IResult> CriarConvite(string token, FormularioConvitePedido pedido, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.CriarConviteAsync(token, pedido, ct));

    private static Task<IResult> AtualizarConvite(string token, Guid conviteId, FormularioConvitePedido pedido, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.AtualizarConviteAsync(token, conviteId, pedido, ct));

    private static Task<IResult> Parcelar(string token, Guid servicoId, PedidoParcelas pedido, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.ParcelarAsync(token, servicoId, pedido, ct));

    private static Task<IResult> RemoverParcelamento(string token, Guid servicoId, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.RemoverParcelamentoAsync(token, servicoId, ct));

    private static Task<IResult> MarcarPagamento(string token, Guid servicoId, MarcarPago pedido, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.DefinirPagoAsync(token, servicoId, pedido.Pago, Hoje(), ct));

    private static Task<IResult> MarcarParcela(string token, Guid servicoId, Guid parcelaId, MarcarPago pedido, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.DefinirParcelaPagaAsync(token, servicoId, parcelaId, pedido.Pago, Hoje(), ct));

    private static Task<IResult> EnviarComprovante(string token, Guid servicoId, HttpRequest request, LinkCasalServico servico, CancellationToken ct) =>
        Enviar(request, ct, (fluxo, nome) => servico.EnviarComprovanteAsync(token, servicoId, null, fluxo, nome, ct));

    private static Task<IResult> EnviarComprovanteDaParcela(string token, Guid servicoId, Guid parcelaId, HttpRequest request, LinkCasalServico servico, CancellationToken ct) =>
        Enviar(request, ct, (fluxo, nome) => servico.EnviarComprovanteAsync(token, servicoId, parcelaId, fluxo, nome, ct));

    private static Task<IResult> ExcluirComprovante(string token, Guid servicoId, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.ExcluirComprovanteAsync(token, servicoId, null, ct));

    private static Task<IResult> ExcluirComprovanteDaParcela(string token, Guid servicoId, Guid parcelaId, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.ExcluirComprovanteAsync(token, servicoId, parcelaId, ct));

    private static Task<IResult> EnviarContratoAssinado(string token, Guid servicoId, HttpRequest request, LinkCasalServico servico, CancellationToken ct) =>
        Enviar(request, ct, (fluxo, nome) => servico.EnviarContratoAssinadoAsync(token, servicoId, fluxo, nome, Hoje(), ct));

    private static Task<IResult> ExcluirContratoAssinado(string token, Guid servicoId, LinkCasalServico servico, CancellationToken ct) =>
        De(servico.ExcluirContratoAssinadoAsync(token, servicoId, Hoje(), ct));

    private static async Task<IResult> Arquivo(string token, Guid arquivoId, HttpContext http, LinkCasalServico servico, CancellationToken ct)
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

    private static async Task<IResult> Enviar(HttpRequest request, CancellationToken ct, Func<Stream, string, Task<Resultado<CasalLeitura>>> enviar)
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

    private static Task<IResult> ComConta(ClaimsPrincipal usuario, Func<string, Task<IResult>> acao)
    {
        var conta = usuario.FindFirstValue(ContaClaims.OrganizerId);
        if (string.IsNullOrWhiteSpace(conta))
        {
            conta = usuario.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        return string.IsNullOrWhiteSpace(conta)
            ? Task.FromResult(Results.Json(new ErroResposta("autenticacao", "É preciso entrar para continuar."), statusCode: StatusCodes.Status401Unauthorized))
            : acao(conta);
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
