using Project.Application.Comum;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

public sealed record ModeloServicoFunilLeitura(Guid Id, string Nome, string? Descricao, decimal? Valor);

public sealed record SalvarModeloServicoFunil(string? Nome, string? Descricao, decimal? Valor);

public sealed record ModeloOrcamentoFunilLeitura(
    Guid Id,
    string Nome,
    string Texto,
    string? CorPrimaria,
    string? CorSecundaria,
    IReadOnlyList<string> Parametros,
    string? HtmlAceite = null,
    IReadOnlyList<MidiaAceite>? Midias = null,
    IReadOnlyList<DepoimentoAceite>? Depoimentos = null);

public sealed record SalvarModeloOrcamentoFunil(
    string? Nome,
    string? Texto,
    string? CorPrimaria,
    string? CorSecundaria,
    string? HtmlAceite = null,
    IReadOnlyList<MidiaAceite>? Midias = null,
    IReadOnlyList<DepoimentoAceite>? Depoimentos = null);

/// <summary>Live Preview da página de aceite (SPEC-061): o modal manda o que está na tela, ainda sem salvar.</summary>
public sealed record PreviaPaginaAceite(
    string? Texto,
    string? HtmlAceite,
    string? CorPrimaria,
    string? CorSecundaria,
    IReadOnlyList<MidiaAceite>? Midias,
    IReadOnlyList<DepoimentoAceite>? Depoimentos);

public static class TokensFunil
{
    public static readonly string[] Todos =
    [
        "{{nome_oportunidade}}",
        "{{data_prevista}}",
        "{{horario}}",
        "{{local_cerimonia}}",
        "{{local_recepcao}}",
        "{{quantidade_convidados}}",
        "{{valor_proposta}}",
    ];
}

public sealed class ModeloServicoFunilServico(IDados dados)
{
    public async Task<IReadOnlyList<ModeloServicoFunilLeitura>> ListarAsync(Guid contaId, string? nome, CancellationToken ct)
    {
        var itens = await dados.ListarModelosServicoFunilAsync(contaId, nome, ct);
        return itens.Select(Ler).ToArray();
    }

    public async Task<Resultado<ModeloServicoFunilLeitura>> ObterAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterModeloServicoFunilAsync(contaId, id, ct);
        return item is null
            ? Resultado<ModeloServicoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<ModeloServicoFunilLeitura>.Sucesso(Ler(item));
    }

    public async Task<Resultado<ModeloServicoFunilLeitura>> CriarAsync(
        Guid contaId,
        SalvarModeloServicoFunil pedido,
        CancellationToken ct)
    {
        var montado = Montar(contaId, Guid.NewGuid(), pedido);
        if (!montado.Ok)
        {
            return Resultado<ModeloServicoFunilLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        await dados.InserirModeloServicoFunilAsync(montado.Valor!, ct);
        return Resultado<ModeloServicoFunilLeitura>.Sucesso(Ler(montado.Valor!));
    }

    public async Task<Resultado<ModeloServicoFunilLeitura>> AtualizarAsync(
        Guid contaId,
        Guid id,
        SalvarModeloServicoFunil pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterModeloServicoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<ModeloServicoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var montado = Montar(contaId, item.Id, pedido);
        if (!montado.Ok)
        {
            return Resultado<ModeloServicoFunilLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        item.Nome = montado.Valor!.Nome;
        item.Descricao = montado.Valor.Descricao;
        item.Valor = montado.Valor.Valor;
        await dados.SalvarNegocioAsync(ct);
        return Resultado<ModeloServicoFunilLeitura>.Sucesso(Ler(item));
    }

    public async Task<Resultado<bool>> ExcluirAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterModeloServicoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverModeloServicoFunilAsync(item, ct);
        return Resultado<bool>.Sucesso(true);
    }

    private static Resultado<ModeloServicoFunil> Montar(Guid contaId, Guid id, SalvarModeloServicoFunil pedido)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<ModeloServicoFunil>.Erro(Codigos.Validacao, "Informe o nome do serviço/produto.");
        }

        var descricao = Domain.Comum.Texto.Limpo(pedido.Descricao);
        if (descricao is { Length: > 200 })
        {
            return Resultado<ModeloServicoFunil>.Erro(Codigos.Validacao, "A descrição deve ter até 200 caracteres.");
        }

        if (pedido.Valor is < 0)
        {
            return Resultado<ModeloServicoFunil>.Erro(Codigos.Validacao, "O valor não pode ser negativo.");
        }

        return Resultado<ModeloServicoFunil>.Sucesso(new ModeloServicoFunil
        {
            Id = id,
            ContaId = contaId,
            Nome = nome,
            Descricao = descricao,
            Valor = pedido.Valor,
        });
    }

    private static ModeloServicoFunilLeitura Ler(ModeloServicoFunil item) =>
        new(item.Id, item.Nome, item.Descricao, item.Valor);
}

public sealed class ModeloOrcamentoFunilServico(IDados dados)
{
    public async Task<IReadOnlyList<ModeloOrcamentoFunilLeitura>> ListarAsync(Guid contaId, string? nome, CancellationToken ct)
    {
        var itens = await dados.ListarModelosOrcamentoFunilAsync(contaId, nome, ct);
        return itens.Select(Ler).ToArray();
    }

    public async Task<Resultado<ModeloOrcamentoFunilLeitura>> ObterAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterModeloOrcamentoFunilAsync(contaId, id, ct);
        return item is null
            ? Resultado<ModeloOrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<ModeloOrcamentoFunilLeitura>.Sucesso(Ler(item));
    }

    public async Task<Resultado<ModeloOrcamentoFunilLeitura>> CriarAsync(
        Guid contaId,
        SalvarModeloOrcamentoFunil pedido,
        CancellationToken ct)
    {
        var montado = Montar(contaId, Guid.NewGuid(), pedido);
        if (!montado.Ok)
        {
            return Resultado<ModeloOrcamentoFunilLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        await dados.InserirModeloOrcamentoFunilAsync(montado.Valor!, ct);
        return Resultado<ModeloOrcamentoFunilLeitura>.Sucesso(Ler(montado.Valor!));
    }

    public async Task<Resultado<ModeloOrcamentoFunilLeitura>> AtualizarAsync(
        Guid contaId,
        Guid id,
        SalvarModeloOrcamentoFunil pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterModeloOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<ModeloOrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var montado = Montar(contaId, item.Id, pedido);
        if (!montado.Ok)
        {
            return Resultado<ModeloOrcamentoFunilLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        item.Nome = montado.Valor!.Nome;
        item.Texto = montado.Valor.Texto;
        item.CorPrimaria = montado.Valor.CorPrimaria;
        item.CorSecundaria = montado.Valor.CorSecundaria;
        item.HtmlAceite = montado.Valor.HtmlAceite;
        item.ExtrasAceite = montado.Valor.ExtrasAceite;
        await dados.SalvarNegocioAsync(ct);
        return Resultado<ModeloOrcamentoFunilLeitura>.Sucesso(Ler(item));
    }

    public async Task<Resultado<bool>> ExcluirAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterModeloOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverModeloOrcamentoFunilAsync(item, ct);
        return Resultado<bool>.Sucesso(true);
    }

    private static Resultado<ModeloOrcamentoFunil> Montar(Guid contaId, Guid id, SalvarModeloOrcamentoFunil pedido)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        var texto = HtmlSeguro.LimparRico(pedido.Texto);
        if (nome is null)
        {
            return Resultado<ModeloOrcamentoFunil>.Erro(Codigos.Validacao, "Informe o nome do modelo.");
        }

        if (texto is null)
        {
            return Resultado<ModeloOrcamentoFunil>.Erro(Codigos.Validacao, "Informe o texto da proposta.");
        }

        var cor1 = Domain.Comum.Texto.Limpo(pedido.CorPrimaria);
        var cor2 = Domain.Comum.Texto.Limpo(pedido.CorSecundaria);
        if ((cor1 is not null && !CorValida(cor1)) || (cor2 is not null && !CorValida(cor2)))
        {
            return Resultado<ModeloOrcamentoFunil>.Erro(Codigos.Validacao, "Informe cores válidas.");
        }

        var extras = ExtrasAceite.Montar(pedido.Midias, pedido.Depoimentos);
        if (!extras.Ok)
        {
            return Resultado<ModeloOrcamentoFunil>.Erro(extras.Falha!.Codigo, extras.Falha.Mensagem);
        }

        return Resultado<ModeloOrcamentoFunil>.Sucesso(new ModeloOrcamentoFunil
        {
            Id = id,
            ContaId = contaId,
            Nome = nome,
            Texto = texto,
            CorPrimaria = cor1,
            CorSecundaria = cor2,
            HtmlAceite = HtmlSeguro.SanitizarPagina(pedido.HtmlAceite) is { Length: > 0 } html ? html : null,
            ExtrasAceite = extras.Valor!.Gravar(),
        });
    }

    /// <summary>Documento da página de aceite com exemplos no lugar das tags (SPEC-061, Live Preview).</summary>
    public async Task<string> PreviaAsync(Guid contaId, PreviaPaginaAceite pedido, CancellationToken ct)
    {
        var perfil = await dados.ObterPerfilAsync(contaId, ct);
        var valores = new Dictionary<string, string>(ParametrosOrcamento.Exemplos, StringComparer.OrdinalIgnoreCase);
        if (perfil?.NomeEmpresa is { Length: > 0 } empresa)
        {
            valores["nome_assessoria"] = empresa;
        }

        if (perfil?.Celular is { Length: > 0 } celular)
        {
            valores["telefone_assessoria"] = celular;
            valores["link_whatsapp"] = ParametrosOrcamento.LinkWhatsApp(celular) ?? valores["link_whatsapp"];
        }

        var extras = ExtrasAceite.Montar(pedido.Midias, pedido.Depoimentos) is { Ok: true } ok ? ok.Valor! : ExtrasAceite.Vazio;
        var texto = HtmlSeguro.LimparRico(pedido.Texto) ?? "";
        var hoje = DateOnly.FromDateTime(Relogio.AgoraUtc);
        return PaginaAceite.Montar(new DadosPaginaAceite(
            pedido.HtmlAceite ?? "",
            valores,
            extras,
            perfil?.FotoId,
            ParametrosOrcamento.Trocar(texto, valores, HtmlSeguro.EhHtml(texto)),
            8500m,
            [new(1, hoje.AddDays(15), 2500m, true), new(2, hoje.AddMonths(1), 3000m, false), new(3, hoje.AddMonths(2), 3000m, false)],
            Domain.Comum.Texto.Limpo(pedido.CorPrimaria),
            Domain.Comum.Texto.Limpo(pedido.CorSecundaria),
            Previa: true));
    }

    private static bool CorValida(string cor) =>
        cor.Length is 4 or 7 && cor.StartsWith('#') && cor[1..].All(c => Uri.IsHexDigit(c));

    private static ModeloOrcamentoFunilLeitura Ler(ModeloOrcamentoFunil item)
    {
        var extras = ExtrasAceite.Ler(item.ExtrasAceite);
        return new(item.Id, item.Nome, item.Texto, item.CorPrimaria, item.CorSecundaria, ParametrosOrcamento.Lista, item.HtmlAceite, extras.Midias, extras.Depoimentos);
    }
}
