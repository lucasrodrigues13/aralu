using System.Security.Cryptography;
using Project.Application.Comum;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

/// <summary>Link do casal como a organizadora vê (SPEC-046 §6.1). <paramref name="Token"/> é nulo quando não há link.</summary>
public sealed record LinkCasalLeitura(bool Ativo, string? Token, bool FinanceiroLiberado, bool ConvidadosLiberado = false);

/// <summary><paramref name="ConvidadosLiberado"/> nulo mantém a marcação como está (SPEC-052).</summary>
public sealed record SalvarLinkCasal(bool FinanceiroLiberado, bool? ConvidadosLiberado = null);

public sealed record EventoDoLink(Guid Id, string ContaId, string Nome, DateOnly? Data, bool EmAndamento = true);

/// <summary>O que a página do casal recebe (SPEC-046 §6.2 e §6.3; SPEC-052). Financeiro e convites são nulos quando a marcação está fechada.</summary>
public sealed record CasalLeitura(
    string Evento,
    DateOnly? Data,
    bool FinanceiroLiberado,
    DinheiroEventoLeitura? Financeiro,
    bool ConvidadosLiberado = false,
    IReadOnlyList<ConviteCasal>? Convites = null);

public sealed record ConvidadoCasal(Guid Id, string Nome, string Situacao);

public sealed record ConviteCasal(Guid Id, string Nome, string? Ddi, string? Telefone, string? Email, IReadOnlyList<ConvidadoCasal> Convidados);

/// <summary>Convidado no pedido do casal: com <paramref name="Id"/> renomeia o existente; sem, inclui um novo.</summary>
public sealed record ConvidadoCasalPedido(Guid? Id, string? Nome);

public sealed record ConviteCasalPedido(string? Nome, string? Ddi, string? Telefone, string? Email, IReadOnlyList<ConvidadoCasalPedido>? Convidados);

public interface IDadosLinkCasal
{
    Task<IReadOnlyList<Domain.Convidados.Convite>> ListarConvitesAsync(Guid eventoId, CancellationToken ct);

    Task<Domain.Convidados.Convite?> ObterConviteAsync(Guid eventoId, Guid conviteId, CancellationToken ct);

    Task InserirConviteAsync(Domain.Convidados.Convite convite, CancellationToken ct);

    Task RemoverConvidadoAsync(Domain.Convidados.Convidado convidado, CancellationToken ct);

    /// <summary>Marca um convidado novo de um convite já gravado para inclusão (gravado no próximo <c>SalvarAsync</c>).</summary>
    Task InserirConvidadoAsync(Domain.Convidados.Convidado convidado, CancellationToken ct);

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
    private const string ConvidadosFechado = "A organizadora ainda não liberou o cadastro de convidados deste evento.";
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
        link.ConvidadosLiberado = pedido.ConvidadosLiberado ?? link.ConvidadosLiberado;
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
        AgirComContratoAsync(token, ct, (conta, evento) => fornecedores.EnviarContratoAssinadoAsync(conta, evento, servicoId, conteudo, nome, hoje, ct, peloCasal: true));

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
            ? Resultado<CasalLeitura>.Sucesso(await MontarCom(contexto, resultado.Valor!, ct))
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
            return Resultado<CasalLeitura>.Sucesso(await MontarCom(contexto, null, ct));
        }

        var leitura = await dinheiro.ObterAsync(contexto.Evento!.ContaId, contexto.Evento.Id, ct);
        return leitura.Ok
            ? Resultado<CasalLeitura>.Sucesso(await MontarCom(contexto, leitura.Valor, ct))
            : Resultado<CasalLeitura>.Erro(leitura.Falha!.Codigo, leitura.Falha.Mensagem);
    }

    private async Task<CasalLeitura> MontarCom(Contexto contexto, DinheiroEventoLeitura? financeiro, CancellationToken ct)
    {
        IReadOnlyList<ConviteCasal>? convites = null;
        if (contexto.Link!.ConvidadosLiberado)
        {
            convites = (await dados.ListarConvitesAsync(contexto.Evento!.Id, ct)).OrderBy(item => item.Nome).Select(LerConvite).ToArray();
        }

        return new CasalLeitura(
            contexto.Evento!.Nome,
            contexto.Evento.Data,
            contexto.Link.FinanceiroLiberado,
            financeiro,
            contexto.Link.ConvidadosLiberado,
            convites);
    }

    private static ConviteCasal LerConvite(Domain.Convidados.Convite convite)
    {
        var principal = convite.Convidados.FirstOrDefault(item => item.Id == convite.PrincipalId);
        return new ConviteCasal(
            convite.Id,
            convite.Nome,
            principal?.Ddi,
            principal?.Celular,
            convite.Email,
            convite.Convidados
                .Select(item => new ConvidadoCasal(item.Id, item.Nome, Domain.Convidados.Rotulos.SituacaoTela(item.Situacao)))
                .ToArray());
    }

    // ---- Casal: convites (SPEC-052) ----

    public async Task<Resultado<CasalLeitura>> CriarConviteAsync(string token, ConviteCasalPedido pedido, CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, Area.Convidados, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<CasalLeitura>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var validado = Validar(pedido);
        if (!validado.Ok)
        {
            return Resultado<CasalLeitura>.Erro(validado.Falha!.Codigo, validado.Falha.Mensagem);
        }

        var convite = new Domain.Convidados.Convite
        {
            Id = Guid.NewGuid(),
            EventoId = contexto.Evento!.Id,
            ContaId = contexto.Evento.ContaId,
            Nome = validado.Valor.Nome,
            Email = validado.Valor.Email,
            Token = Guid.NewGuid().ToString("N"),
        };
        foreach (var item in pedido.Convidados!)
        {
            convite.Convidados.Add(new Domain.Convidados.Convidado
            {
                Id = Guid.NewGuid(),
                ConviteId = convite.Id,
                Nome = Domain.Comum.Texto.Limpo(item.Nome)!,
            });
        }

        DefinirTelefone(convite, pedido);
        await dados.InserirConviteAsync(convite, ct);
        return await MontarAsync(contexto, ct);
    }

    public async Task<Resultado<CasalLeitura>> AtualizarConviteAsync(string token, Guid conviteId, ConviteCasalPedido pedido, CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, Area.Convidados, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<CasalLeitura>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var convite = await dados.ObterConviteAsync(contexto.Evento!.Id, conviteId, ct);
        if (convite is null)
        {
            return Resultado<CasalLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var validado = Validar(pedido);
        if (!validado.Ok)
        {
            return Resultado<CasalLeitura>.Erro(validado.Falha!.Codigo, validado.Falha.Mensagem);
        }

        var ids = pedido.Convidados!.Where(item => item.Id is not null).Select(item => item.Id!.Value).ToHashSet();
        if (ids.Any(id => convite.Convidados.All(existente => existente.Id != id)))
        {
            return Resultado<CasalLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        convite.Nome = validado.Valor.Nome;
        convite.Email = validado.Valor.Email;
        foreach (var removido in convite.Convidados.Where(item => !ids.Contains(item.Id)).ToArray())
        {
            if (convite.PrincipalId == removido.Id)
            {
                convite.PrincipalId = null;
            }

            convite.Convidados.Remove(removido);
            await dados.RemoverConvidadoAsync(removido, ct);
        }

        foreach (var item in pedido.Convidados!)
        {
            var nome = Domain.Comum.Texto.Limpo(item.Nome)!;
            if (item.Id is Guid id)
            {
                convite.Convidados.First(existente => existente.Id == id).Nome = nome;
            }
            else
            {
                var novo = new Domain.Convidados.Convidado { Id = Guid.NewGuid(), ConviteId = convite.Id, Nome = nome };
                convite.Convidados.Add(novo);
                await dados.InserirConvidadoAsync(novo, ct);
            }
        }

        DefinirTelefone(convite, pedido);
        await dados.SalvarAsync(ct);
        return await MontarAsync(contexto, ct);
    }

    private static Resultado<(string Nome, string? Email)> Validar(ConviteCasalPedido pedido)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<(string Nome, string? Email)>.Erro(Codigos.Validacao, "Informe o nome do convite.");
        }

        if (pedido.Convidados is null || pedido.Convidados.Count == 0)
        {
            return Resultado<(string Nome, string? Email)>.Erro(Codigos.Validacao, "Inclua ao menos um convidado.");
        }

        if (pedido.Convidados.Any(item => Domain.Comum.Texto.Vazio(item.Nome)))
        {
            return Resultado<(string Nome, string? Email)>.Erro(Codigos.Validacao, "Informe o nome completo de cada convidado.");
        }

        var email = Domain.Comum.Texto.Limpo(pedido.Email);
        if (email is not null && !Domain.Convidados.ConviteRegras.EmailValido(email))
        {
            return Resultado<(string Nome, string? Email)>.Erro(Codigos.Validacao, "Informe um e-mail válido.");
        }

        return Resultado<(string Nome, string? Email)>.Sucesso((nome, email));
    }

    /// <summary>O telefone do convite é o do convidado principal (SPEC-010); sem principal, o primeiro assume.</summary>
    private static void DefinirTelefone(Domain.Convidados.Convite convite, ConviteCasalPedido pedido)
    {
        var celular = Domain.Comum.Texto.Limpo(pedido.Telefone);
        var atual = convite.Convidados.FirstOrDefault(item => item.Id == convite.PrincipalId);
        if (celular is null)
        {
            if (atual is not null)
            {
                atual.Ddi = null;
                atual.Celular = null;
            }

            convite.PrincipalId = null;
            return;
        }

        var principal = atual ?? convite.Convidados.First();
        principal.Ddi = Domain.Comum.Texto.Limpo(pedido.Ddi);
        principal.Celular = celular;
        convite.PrincipalId = principal.Id;
    }

    private sealed record Contexto(LinkCasal? Link, EventoDoLink? Evento, Falha? Falha);

    private enum Area
    {
        Nenhuma,
        Financeiro,
        Convidados,
    }

    private Task<Contexto> ResolverAsync(string token, bool exigirFinanceiro, CancellationToken ct) =>
        ResolverAsync(token, exigirFinanceiro ? Area.Financeiro : Area.Nenhuma, ct);

    private async Task<Contexto> ResolverAsync(string token, Area area, CancellationToken ct)
    {
        var link = string.IsNullOrWhiteSpace(token) ? null : await dados.ObterPorTokenAsync(token, ct);
        var evento = link is null ? null : await dados.ObterEventoAsync(link.ContaId, link.EventoId, ct);
        if (link is null || evento is null)
        {
            return new Contexto(null, null, new Falha(Codigos.Indisponivel, LinkInvalido));
        }

        if (area == Area.Financeiro && !link.FinanceiroLiberado)
        {
            return new Contexto(link, evento, new Falha(Codigos.Proibido, FinanceiroFechado));
        }

        if (area == Area.Convidados && !link.ConvidadosLiberado)
        {
            return new Contexto(link, evento, new Falha(Codigos.Proibido, ConvidadosFechado));
        }

        return area == Area.Convidados && !evento.EmAndamento
            ? new Contexto(link, evento, new Falha(Codigos.Validacao, "O evento não está em andamento."))
            : new Contexto(link, evento, null);
    }

    private async Task<LinkCasal?> ObterDaContaAsync(string contaId, Guid eventoId, CancellationToken ct) =>
        await dados.ObterEventoAsync(contaId, eventoId, ct) is null ? null : await dados.ObterPorEventoAsync(eventoId, ct);

    private static LinkCasalLeitura Ler(LinkCasal? link) =>
        new(link is not null, link?.Token, link?.FinanceiroLiberado ?? false, link?.ConvidadosLiberado ?? false);

    private static string NovoToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
}
