using Project.Application.Comum;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;

namespace Project.Application.Negocio;

public sealed record DefinirContratoCasal(
    decimal? Valor,
    int? QuantidadeParcelas,
    DateOnly? PrimeiraParcela,
    bool ComEntrada,
    BaseEntrada? BaseEntrada,
    decimal? ValorEntrada,
    DateOnly? DataEntrada);

public sealed record ReceberParcela(decimal? Valor, FormaPagamento? Forma, DateOnly? Data);

public sealed record SalvarLancamento(TipoLancamento? Tipo, string? Categoria, string? Descricao, decimal? Valor, DateOnly? Data);

public sealed record RecebimentoLeitura(Guid Id, decimal Valor, FormaPagamento Forma, DateOnly Data);

public sealed record ParcelaCasalLeitura(
    Guid Id,
    int Numero,
    DateOnly Vencimento,
    decimal Valor,
    bool Entrada,
    decimal Recebido,
    decimal Saldo,
    SituacaoParcelaCasal Situacao,
    TipoCobranca Cobranca,
    IReadOnlyList<RecebimentoLeitura> Recebimentos);

public sealed record ComprovanteLeitura(Guid Id, Guid ArquivoId, string Nome, string TipoConteudo, string? Descricao, DateTimeOffset EnviadoEm);

public sealed record LancamentoLeitura(Guid Id, TipoLancamento Tipo, string Categoria, string? Descricao, decimal Valor, DateOnly Data);

public sealed record PagamentoFornecedorLeitura(
    Guid EventoId,
    string Evento,
    Guid ServicoId,
    string Servico,
    string? Fornecedor,
    int Numero,
    DateOnly Vencimento,
    decimal Valor,
    bool Entrada,
    SituacaoParcela Situacao);

public sealed record DinheiroEventoLeitura(
    decimal? ValorContrato,
    decimal Recebido,
    decimal Saldo,
    decimal Despesas,
    decimal Entradas,
    string? ChavePix,
    IReadOnlyList<ParcelaCasalLeitura> Parcelas,
    IReadOnlyList<PagamentoFornecedorLeitura> PagamentosFornecedores,
    IReadOnlyList<LancamentoLeitura> Lancamentos,
    IReadOnlyList<ComprovanteLeitura> Comprovantes);

/// <summary>Linha do budget para a planilha (SPEC-029 §6.6).</summary>
public sealed record LinhaPlanilhaBudget(string Servico, decimal Estimado, decimal Contratado);

public interface IPlanilhaBudget
{
    byte[] Gerar(string evento, decimal budget, IReadOnlyList<LinhaPlanilhaBudget> linhas);
}

/// <summary>Acesso a dados do Dinheiro do evento. Tudo filtra pela conta.</summary>
public interface IDadosDinheiro
{
    Task<Evento?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<ParcelaCasal>> ParcelasAsync(Guid eventoId, CancellationToken ct);

    Task SubstituirParcelasAsync(Guid eventoId, IReadOnlyList<ParcelaCasal> parcelas, CancellationToken ct);

    Task<ParcelaCasal?> ObterParcelaAsync(string contaId, Guid eventoId, Guid parcelaId, CancellationToken ct);

    Task InserirRecebimentoAsync(RecebimentoParcela recebimento, CancellationToken ct);

    Task RemoverRecebimentoAsync(RecebimentoParcela recebimento, CancellationToken ct);

    Task<IReadOnlyList<LancamentoEvento>> LancamentosAsync(Guid eventoId, CancellationToken ct);

    Task<LancamentoEvento?> ObterLancamentoAsync(string contaId, Guid eventoId, Guid id, CancellationToken ct);

    Task InserirLancamentoAsync(LancamentoEvento lancamento, CancellationToken ct);

    Task RemoverLancamentoAsync(LancamentoEvento lancamento, CancellationToken ct);

    Task<IReadOnlyList<PagamentoFornecedorLeitura>> PagamentosFornecedoresAsync(string contaId, Guid? eventoId, CancellationToken ct);

    Task<string?> ChavePixAsync(string contaId, CancellationToken ct);

    Task<IReadOnlyList<ComprovanteEvento>> ComprovantesAsync(Guid eventoId, CancellationToken ct);

    Task<ComprovanteEvento?> ObterComprovanteAsync(string contaId, Guid eventoId, Guid id, CancellationToken ct);

    Task InserirComprovanteAsync(ComprovanteEvento comprovante, CancellationToken ct);

    Task RemoverComprovanteAsync(ComprovanteEvento comprovante, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>Dinheiro do evento: parcelas do casal, cobrar, recebi, despesas e pagamentos (SPEC-029).</summary>
public sealed class DinheiroServico(IDadosDinheiro dados, IPlanilhaBudget planilha, Arquivos.IArmazenamentoArquivo armazenamento)
{
    public async Task<Resultado<DinheiroEventoLeitura>> EnviarComprovanteAsync(
        string contaId,
        Guid eventoId,
        Stream conteudo,
        string? nomeArquivo,
        string? descricao,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var texto = Domain.Comum.Texto.Limpo(descricao);
        if (texto is { Length: > 200 })
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "A descrição tem no máximo 200 caracteres.");
        }

        var guardado = await armazenamento.GuardarDocumentoAsync(conteudo, nomeArquivo, contaId, ct);
        if (!guardado.Ok)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(guardado.Falha!.Codigo, guardado.Falha.Mensagem);
        }

        var arquivo = guardado.Valor!;
        await dados.InserirComprovanteAsync(new ComprovanteEvento
        {
            Id = Guid.NewGuid(),
            EventoId = eventoId,
            ArquivoId = arquivo.Id,
            Nome = arquivo.NomeOriginal,
            TipoConteudo = arquivo.TipoConteudo,
            Descricao = texto,
            EnviadoEm = DateTimeOffset.UtcNow,
        }, ct);
        await dados.SalvarAsync(ct);
        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    public async Task<Resultado<DinheiroEventoLeitura>> ExcluirComprovanteAsync(
        string contaId,
        Guid eventoId,
        Guid id,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        var comprovante = evento is null ? null : await dados.ObterComprovanteAsync(contaId, eventoId, id, ct);
        if (evento is null || comprovante is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverComprovanteAsync(comprovante, ct);
        await dados.SalvarAsync(ct);
        await armazenamento.DescartarAsync(comprovante.ArquivoId, ct);
        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    public async Task<Resultado<DinheiroEventoLeitura>> ObterAsync(string contaId, Guid eventoId, DateOnly hoje, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    public async Task<Resultado<DinheiroEventoLeitura>> DefinirContratoAsync(
        string contaId,
        Guid eventoId,
        DefinirContratoCasal pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.Valor is not decimal valor || valor <= 0)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe o valor do contrato.");
        }

        if (pedido.QuantidadeParcelas is not int quantidade || quantidade < 1 || quantidade > 120)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe o número de parcelas (1 a 120).");
        }

        if (pedido.PrimeiraParcela is not DateOnly primeira)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe o vencimento da primeira parcela.");
        }

        var atuais = await dados.ParcelasAsync(eventoId, ct);
        if (atuais.Any(parcela => parcela.Recebimentos.Count > 0))
        {
            return Resultado<DinheiroEventoLeitura>.Erro(
                Codigos.Validacao,
                "Já há recebimentos. Desfaça os recebimentos antes de refazer as parcelas.");
        }

        var calculadas = ParcelasDaAssessoria.Calcular(
            valor,
            quantidade,
            primeira,
            pedido.ComEntrada,
            pedido.BaseEntrada,
            pedido.ValorEntrada,
            pedido.DataEntrada);
        if (calculadas.Count == 0)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "A entrada informada não fecha com o valor do contrato.");
        }

        evento.ValorContrato = valor;
        await dados.SubstituirParcelasAsync(
            eventoId,
            calculadas.Select(item => new ParcelaCasal
            {
                Id = Guid.NewGuid(),
                EventoId = eventoId,
                Numero = item.Numero,
                Vencimento = item.Vencimento,
                Valor = item.Valor,
                Entrada = item.Entrada,
            }).ToArray(),
            ct);
        await dados.SalvarAsync(ct);
        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    public async Task<Resultado<DinheiroEventoLeitura>> ReceberAsync(
        string contaId,
        Guid eventoId,
        Guid parcelaId,
        ReceberParcela pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        var parcela = evento is null ? null : await dados.ObterParcelaAsync(contaId, eventoId, parcelaId, ct);
        if (evento is null || parcela is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.Valor is not decimal valor || valor <= 0)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe o valor recebido.");
        }

        if (valor > parcela.Saldo)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "O valor passa do que falta receber nesta parcela.");
        }

        if (pedido.Forma is not FormaPagamento forma || !Enum.IsDefined(forma))
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Escolha a forma de pagamento.");
        }

        if (pedido.Data is not DateOnly data)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe a data do recebimento.");
        }

        await dados.InserirRecebimentoAsync(new RecebimentoParcela
        {
            Id = Guid.NewGuid(),
            ParcelaId = parcela.Id,
            Valor = decimal.Round(valor, 2, MidpointRounding.AwayFromZero),
            Forma = forma,
            Data = data,
            CriadoEm = DateTimeOffset.UtcNow,
        }, ct);
        await dados.SalvarAsync(ct);
        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    public async Task<Resultado<DinheiroEventoLeitura>> DesfazerRecebimentoAsync(
        string contaId,
        Guid eventoId,
        Guid parcelaId,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        var parcela = evento is null ? null : await dados.ObterParcelaAsync(contaId, eventoId, parcelaId, ct);
        if (evento is null || parcela is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var ultimo = parcela.Recebimentos.OrderByDescending(item => item.CriadoEm).FirstOrDefault();
        if (ultimo is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Esta parcela não tem recebimento para desfazer.");
        }

        await dados.RemoverRecebimentoAsync(ultimo, ct);
        await dados.SalvarAsync(ct);
        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    public async Task<Resultado<DinheiroEventoLeitura>> SalvarLancamentoAsync(
        string contaId,
        Guid eventoId,
        Guid? id,
        SalvarLancamento pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.Tipo is not TipoLancamento tipo || !Enum.IsDefined(tipo))
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Escolha se é despesa ou entrada.");
        }

        var categoria = Domain.Comum.Texto.Limpo(pedido.Categoria);
        if (categoria is null || categoria.Length > 80)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe a categoria (até 80 caracteres).");
        }

        if (pedido.Valor is not decimal valor || valor <= 0)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe o valor.");
        }

        if (pedido.Data is not DateOnly data)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe a data.");
        }

        LancamentoEvento? lancamento;
        if (id is Guid existente)
        {
            lancamento = await dados.ObterLancamentoAsync(contaId, eventoId, existente, ct);
            if (lancamento is null)
            {
                return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
            }
        }
        else
        {
            lancamento = new LancamentoEvento { Id = Guid.NewGuid(), EventoId = eventoId };
            await dados.InserirLancamentoAsync(lancamento, ct);
        }

        lancamento.Tipo = tipo;
        lancamento.Categoria = categoria;
        lancamento.Descricao = Domain.Comum.Texto.Limpo(pedido.Descricao);
        lancamento.Valor = decimal.Round(valor, 2, MidpointRounding.AwayFromZero);
        lancamento.Data = data;
        await dados.SalvarAsync(ct);
        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    public async Task<Resultado<DinheiroEventoLeitura>> ExcluirLancamentoAsync(
        string contaId,
        Guid eventoId,
        Guid id,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        var lancamento = evento is null ? null : await dados.ObterLancamentoAsync(contaId, eventoId, id, ct);
        if (evento is null || lancamento is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverLancamentoAsync(lancamento, ct);
        await dados.SalvarAsync(ct);
        return Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, hoje, ct));
    }

    /// <summary>Parcelas a fornecedores de todos os eventos da conta (RF-097).</summary>
    public async Task<IReadOnlyList<PagamentoFornecedorLeitura>> PagamentosAsync(string contaId, CancellationToken ct, IReadOnlySet<Guid>? liberados = null)
    {
        var todos = await dados.PagamentosFornecedoresAsync(contaId, null, ct);
        return liberados is null ? todos : todos.Where(item => liberados.Contains(item.EventoId)).ToArray();
    }

    public async Task<Resultado<(string Nome, byte[] Conteudo)>> PlanilhaBudgetAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<(string, byte[])>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var linhas = evento.Servicos
            .OrderBy(servico => servico.Ordem)
            .Select(servico => new LinhaPlanilhaBudget(
                servico.Nome,
                BudgetCalculo.EstimadoDoServico(servico),
                BudgetCalculo.ContratadoDoServico(servico)))
            .ToArray();
        var conteudo = planilha.Gerar(evento.Nome, evento.OrcamentoEstimado ?? 0m, linhas);
        return Resultado<(string, byte[])>.Sucesso(($"orcamento-{Arquivo(evento.Nome)}.xlsx", conteudo));
    }

    private async Task<DinheiroEventoLeitura> LerAsync(string contaId, Evento evento, DateOnly hoje, CancellationToken ct)
    {
        var parcelas = await dados.ParcelasAsync(evento.Id, ct);
        var lancamentos = await dados.LancamentosAsync(evento.Id, ct);
        var pagamentos = await dados.PagamentosFornecedoresAsync(contaId, evento.Id, ct);
        var comprovantes = await dados.ComprovantesAsync(evento.Id, ct);
        var recebido = parcelas.Sum(parcela => parcela.Recebido);
        var contrato = evento.ValorContrato;
        return new DinheiroEventoLeitura(
            contrato,
            recebido,
            Math.Max(0m, (contrato ?? 0m) - recebido),
            lancamentos.Where(item => item.Tipo == TipoLancamento.Despesa).Sum(item => item.Valor),
            lancamentos.Where(item => item.Tipo == TipoLancamento.Entrada).Sum(item => item.Valor),
            await dados.ChavePixAsync(contaId, ct),
            parcelas
                .OrderBy(parcela => parcela.Numero)
                .Select(parcela => new ParcelaCasalLeitura(
                    parcela.Id,
                    parcela.Numero,
                    parcela.Vencimento,
                    parcela.Valor,
                    parcela.Entrada,
                    parcela.Recebido,
                    parcela.Saldo,
                    parcela.Situacao(hoje),
                    parcela.Cobranca(hoje),
                    parcela.Recebimentos
                        .OrderBy(item => item.CriadoEm)
                        .Select(item => new RecebimentoLeitura(item.Id, item.Valor, item.Forma, item.Data))
                        .ToArray()))
                .ToArray(),
            pagamentos,
            lancamentos
                .OrderByDescending(item => item.Data)
                .Select(item => new LancamentoLeitura(item.Id, item.Tipo, item.Categoria, item.Descricao, item.Valor, item.Data))
                .ToArray(),
            comprovantes
                .OrderByDescending(item => item.EnviadoEm)
                .Select(item => new ComprovanteLeitura(item.Id, item.ArquivoId, item.Nome, item.TipoConteudo, item.Descricao, item.EnviadoEm))
                .ToArray());
    }

    private static string Arquivo(string nome)
    {
        var limpo = new string(nome.Select(c => char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : '-').ToArray()).Trim('-');
        return string.IsNullOrEmpty(limpo) ? "evento" : limpo;
    }
}
