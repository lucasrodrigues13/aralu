using System.Security.Cryptography;
using Project.Application.Comum;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

/// <summary>Link do casal como a organizadora vê (SPEC-046 §6.1). <paramref name="Token"/> é nulo quando não há link.</summary>
public sealed record LinkCasalLeitura(bool Ativo, string? Token, bool FinanceiroLiberado);

public sealed record SalvarLinkCasal(bool FinanceiroLiberado);

public sealed record EventoDoLink(Guid Id, string ContaId, string Nome, DateOnly? Data);

/// <summary>O que a página do casal recebe (SPEC-046 §6.2 e §6.3). <paramref name="Financeiro"/> é nulo com o financeiro fechado.</summary>
public sealed record CasalLeitura(string Evento, DateOnly? Data, bool FinanceiroLiberado, DinheiroEventoLeitura? Financeiro);

public interface IDadosLinkCasal
{
    Task<EventoDoLink?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct);

    Task<LinkCasal?> ObterPorEventoAsync(Guid eventoId, CancellationToken ct);

    Task<LinkCasal?> ObterPorTokenAsync(string token, CancellationToken ct);

    Task InserirAsync(LinkCasal link, CancellationToken ct);

    Task RemoverAsync(LinkCasal link, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>
/// Link do casal (SPEC-046): a organizadora gerencia o link do evento e o casal, sem login, atua no financeiro
/// pelas mesmas regras da SPEC-043 e da SPEC-045. O link resolve a conta e o evento.
/// </summary>
public sealed class LinkCasalServico(
    IDadosLinkCasal dados,
    DinheiroServico dinheiro,
    FornecedorServico fornecedores,
    Arquivos.IArmazenamentoArquivo armazenamento)
{
    private const string LinkInvalido = "Link inválido.";
    private const string FinanceiroFechado = "A organizadora ainda não liberou o financeiro deste evento.";

    // ---- Organizadora ----

    public async Task<Resultado<LinkCasalLeitura>> ObterAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        if (await dados.ObterEventoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<LinkCasalLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var link = await dados.ObterPorEventoAsync(eventoId, ct);
        return Resultado<LinkCasalLeitura>.Sucesso(Ler(link));
    }

    /// <summary>Gera o link do evento ou, se já existe, troca o código (o endereço antigo deixa de valer).</summary>
    public async Task<Resultado<LinkCasalLeitura>> GerarAsync(string contaId, Guid eventoId, DateTimeOffset agora, CancellationToken ct)
    {
        if (await dados.ObterEventoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<LinkCasalLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var link = await dados.ObterPorEventoAsync(eventoId, ct);
        if (link is null)
        {
            link = new LinkCasal { Id = Guid.NewGuid(), EventoId = eventoId, ContaId = contaId, Token = NovoToken(), CriadoEm = agora };
            await dados.InserirAsync(link, ct);
        }
        else
        {
            link.Token = NovoToken();
        }

        await dados.SalvarAsync(ct);
        return Resultado<LinkCasalLeitura>.Sucesso(Ler(link));
    }

    public async Task<Resultado<LinkCasalLeitura>> SalvarAsync(string contaId, Guid eventoId, SalvarLinkCasal pedido, CancellationToken ct)
    {
        var link = await ObterDaContaAsync(contaId, eventoId, ct);
        if (link is null)
        {
            return Resultado<LinkCasalLeitura>.Erro(Codigos.Indisponivel, "Gere o link antes.");
        }

        link.FinanceiroLiberado = pedido.FinanceiroLiberado;
        await dados.SalvarAsync(ct);
        return Resultado<LinkCasalLeitura>.Sucesso(Ler(link));
    }

    public async Task<Resultado<LinkCasalLeitura>> DesativarAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        if (await dados.ObterEventoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<LinkCasalLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var link = await dados.ObterPorEventoAsync(eventoId, ct);
        if (link is not null)
        {
            await dados.RemoverAsync(link, ct);
            await dados.SalvarAsync(ct);
        }

        return Resultado<LinkCasalLeitura>.Sucesso(Ler(null));
    }

    // ---- Casal ----

    public async Task<Resultado<CasalLeitura>> LerCasalAsync(string token, CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, exigirFinanceiro: false, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<CasalLeitura>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        return await MontarAsync(contexto, ct);
    }

    public Task<Resultado<CasalLeitura>> ParcelarAsync(string token, Guid servicoId, PedidoParcelas pedido, CancellationToken ct) =>
        AgirAsync(token, ct, (conta, evento) => dinheiro.ParcelarAsync(conta, evento, servicoId, pedido, ct));

    public Task<Resultado<CasalLeitura>> RemoverParcelamentoAsync(string token, Guid servicoId, CancellationToken ct) =>
        AgirAsync(token, ct, (conta, evento) => dinheiro.RemoverParcelamentoAsync(conta, evento, servicoId, ct));

    public Task<Resultado<CasalLeitura>> DefinirPagoAsync(string token, Guid servicoId, bool pago, DateOnly hoje, CancellationToken ct) =>
        AgirAsync(token, ct, (conta, evento) => dinheiro.DefinirPagoAsync(conta, evento, servicoId, pago, hoje, ct));

    public Task<Resultado<CasalLeitura>> DefinirParcelaPagaAsync(string token, Guid servicoId, Guid parcelaId, bool paga, DateOnly hoje, CancellationToken ct) =>
        AgirAsync(token, ct, (conta, evento) => dinheiro.DefinirParcelaPagaAsync(conta, evento, servicoId, parcelaId, paga, hoje, ct));

    public Task<Resultado<CasalLeitura>> EnviarComprovanteAsync(string token, Guid servicoId, Guid? parcelaId, Stream conteudo, string? nome, CancellationToken ct) =>
        AgirAsync(token, ct, (conta, evento) => dinheiro.EnviarComprovanteAsync(conta, evento, servicoId, parcelaId, conteudo, nome, ct));

    public Task<Resultado<CasalLeitura>> ExcluirComprovanteAsync(string token, Guid servicoId, Guid? parcelaId, CancellationToken ct) =>
        AgirAsync(token, ct, (conta, evento) => dinheiro.ExcluirComprovanteAsync(conta, evento, servicoId, parcelaId, ct));

    public Task<Resultado<CasalLeitura>> EnviarContratoAssinadoAsync(string token, Guid servicoId, Stream conteudo, string? nome, DateOnly hoje, CancellationToken ct) =>
        AgirComContratoAsync(token, ct, (conta, evento) => fornecedores.EnviarContratoAssinadoAsync(conta, evento, servicoId, conteudo, nome, hoje, ct));

    public Task<Resultado<CasalLeitura>> ExcluirContratoAssinadoAsync(string token, Guid servicoId, DateOnly hoje, CancellationToken ct) =>
        AgirComContratoAsync(token, ct, (conta, evento) => fornecedores.ExcluirContratoAssinadoAsync(conta, evento, servicoId, hoje, ct));

    /// <summary>Abre um arquivo do financeiro do evento do link; arquivo de outro evento ou conta é indisponível.</summary>
    public async Task<Resultado<Arquivos.ArquivoAberto>> AbrirArquivoAsync(string token, Guid arquivoId, CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, exigirFinanceiro: true, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<Arquivos.ArquivoAberto>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var leitura = await dinheiro.ObterAsync(contexto.Evento!.ContaId, contexto.Evento.Id, ct);
        var permitido = leitura.Ok && leitura.Valor!.PagamentosFornecedores
            .SelectMany(pagamento => ArquivosDoPagamento(pagamento))
            .Contains(arquivoId);
        var aberto = permitido ? await armazenamento.AbrirAsync(arquivoId, contexto.Evento.ContaId, ct) : null;
        return aberto is null
            ? Resultado<Arquivos.ArquivoAberto>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<Arquivos.ArquivoAberto>.Sucesso(aberto);
    }

    private static IEnumerable<Guid> ArquivosDoPagamento(PagamentoFornecedorLeitura pagamento)
    {
        if (pagamento.Comprovante is { } comprovante)
        {
            yield return comprovante.ArquivoId;
        }

        if (pagamento.ContratoAssinado is { } contrato)
        {
            yield return contrato.ArquivoId;
        }

        foreach (var parcela in pagamento.Parcelas)
        {
            if (parcela.Comprovante is { } doComprovante)
            {
                yield return doComprovante.ArquivoId;
            }
        }
    }

    private async Task<Resultado<CasalLeitura>> AgirAsync(
        string token,
        CancellationToken ct,
        Func<string, Guid, Task<Resultado<DinheiroEventoLeitura>>> acao)
    {
        var contexto = await ResolverAsync(token, exigirFinanceiro: true, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<CasalLeitura>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var resultado = await acao(contexto.Evento!.ContaId, contexto.Evento.Id);
        return resultado.Ok
            ? Resultado<CasalLeitura>.Sucesso(Montar(contexto, resultado.Valor!))
            : Resultado<CasalLeitura>.Erro(resultado.Falha!.Codigo, resultado.Falha.Mensagem);
    }

    private async Task<Resultado<CasalLeitura>> AgirComContratoAsync(
        string token,
        CancellationToken ct,
        Func<string, Guid, Task<Resultado<EventoDetalhe>>> acao)
    {
        var contexto = await ResolverAsync(token, exigirFinanceiro: true, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<CasalLeitura>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var resultado = await acao(contexto.Evento!.ContaId, contexto.Evento.Id);
        if (!resultado.Ok)
        {
            return Resultado<CasalLeitura>.Erro(resultado.Falha!.Codigo, resultado.Falha.Mensagem);
        }

        return await MontarAsync(contexto, ct);
    }

    private async Task<Resultado<CasalLeitura>> MontarAsync(Contexto contexto, CancellationToken ct)
    {
        if (!contexto.Link!.FinanceiroLiberado)
        {
            return Resultado<CasalLeitura>.Sucesso(Montar(contexto, null));
        }

        var leitura = await dinheiro.ObterAsync(contexto.Evento!.ContaId, contexto.Evento.Id, ct);
        return leitura.Ok
            ? Resultado<CasalLeitura>.Sucesso(Montar(contexto, leitura.Valor))
            : Resultado<CasalLeitura>.Erro(leitura.Falha!.Codigo, leitura.Falha.Mensagem);
    }

    private static CasalLeitura Montar(Contexto contexto, DinheiroEventoLeitura? financeiro) =>
        new(contexto.Evento!.Nome, contexto.Evento.Data, contexto.Link!.FinanceiroLiberado, financeiro);

    private sealed record Contexto(LinkCasal? Link, EventoDoLink? Evento, Falha? Falha);

    private async Task<Contexto> ResolverAsync(string token, bool exigirFinanceiro, CancellationToken ct)
    {
        var link = string.IsNullOrWhiteSpace(token) ? null : await dados.ObterPorTokenAsync(token, ct);
        var evento = link is null ? null : await dados.ObterEventoAsync(link.ContaId, link.EventoId, ct);
        if (link is null || evento is null)
        {
            return new Contexto(null, null, new Falha(Codigos.Indisponivel, LinkInvalido));
        }

        return exigirFinanceiro && !link.FinanceiroLiberado
            ? new Contexto(link, evento, new Falha(Codigos.Proibido, FinanceiroFechado))
            : new Contexto(link, evento, null);
    }

    private async Task<LinkCasal?> ObterDaContaAsync(string contaId, Guid eventoId, CancellationToken ct) =>
        await dados.ObterEventoAsync(contaId, eventoId, ct) is null ? null : await dados.ObterPorEventoAsync(eventoId, ct);

    private static LinkCasalLeitura Ler(LinkCasal? link) => new(link is not null, link?.Token, link?.FinanceiroLiberado ?? false);

    private static string NovoToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
}
