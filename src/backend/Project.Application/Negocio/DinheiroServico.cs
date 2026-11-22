using Project.Application.Comum;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;

namespace Project.Application.Negocio;

public sealed record ComprovantePagamentoLeitura(Guid ArquivoId, string Nome, string TipoConteudo);

public sealed record ParcelaPagamentoLeitura(
    Guid Id,
    int Numero,
    DateOnly Vencimento,
    decimal Valor,
    bool Entrada,
    bool Paga,
    DateOnly? PagoEm,
    ComprovantePagamentoLeitura? Comprovante);

/// <summary>Um pagamento a fornecedor: o serviço contratado do evento, com ou sem parcelas (SPEC-043).</summary>
public sealed record PagamentoFornecedorLeitura(
    Guid EventoId,
    string Evento,
    Guid ServicoId,
    string Servico,
    string? Fornecedor,
    decimal Valor,
    bool Pago,
    DateOnly? PagoEm,
    DateOnly? Vencimento,
    ComprovantePagamentoLeitura? Comprovante,
    IReadOnlyList<ParcelaPagamentoLeitura> Parcelas,
    ComprovantePagamentoLeitura? ContratoAssinado = null);

/// <summary>Dinheiro do evento (SPEC-043): só os pagamentos a fornecedores. O que o cliente paga está no contrato (SPEC-040).</summary>
public sealed record DinheiroEventoLeitura(
    decimal Contratado,
    decimal Pago,
    IReadOnlyList<PagamentoFornecedorLeitura> PagamentosFornecedores);

public sealed record MarcarPago(bool Pago);

/// <summary>Linha do budget para a planilha (SPEC-029 §6.6).</summary>
public sealed record LinhaPlanilhaBudget(string Servico, decimal Estimado, decimal Contratado);

public interface IPlanilhaBudget
{
    byte[] Gerar(string evento, decimal budget, IReadOnlyList<LinhaPlanilhaBudget> linhas);
}

/// <summary>Acesso a dados do Dinheiro do evento. Tudo filtra pela conta.</summary>
public interface IDadosDinheiro
{
    /// <summary>Evento da conta com os serviços, o contrato de fornecedor e as parcelas (rastreado, para alterar).</summary>
    Task<Evento?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<PagamentoFornecedorLeitura>> PagamentosFornecedoresAsync(string contaId, Guid eventoId, CancellationToken ct);

    /// <summary>Troca as parcelas do contrato pelas novas (as antigas são apagadas).</summary>
    Task SubstituirParcelasAsync(ContratoFornecedor contrato, IReadOnlyList<ParcelaContratoFornecedor> novas, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>Dinheiro do evento: pagamentos a fornecedores com parcelas e comprovantes (SPEC-043).</summary>
public sealed class DinheiroServico(IDadosDinheiro dados, IPlanilhaBudget planilha, Arquivos.IArmazenamentoArquivo armazenamento)
{
    private const int MaximoParcelas = 120;
    private const string Indisponivel = "Indisponível.";

    public async Task<Resultado<DinheiroEventoLeitura>> ObterAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        return evento is null
            ? Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel)
            : Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, ct));
    }

    /// <summary>Define o parcelamento do pagamento (SPEC-043 §6.2). O total é o valor contratado do serviço.</summary>
    public async Task<Resultado<DinheiroEventoLeitura>> ParcelarAsync(
        string contaId,
        Guid eventoId,
        Guid servicoId,
        PedidoParcelas pedido,
        CancellationToken ct)
    {
        var (evento, servico) = await ObterServicoAsync(contaId, eventoId, servicoId, ct);
        if (evento is null || servico is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        if (servico.ValorContratado is not decimal total || total <= 0)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "O serviço não tem valor contratado para parcelar.");
        }

        if (pedido.QuantidadeParcelas is not int quantidade || quantidade < 1 || quantidade > MaximoParcelas || pedido.PrimeiraParcela is not DateOnly primeira)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "Informe o número de parcelas (1 a 120) e o vencimento da primeira.");
        }

        var calculadas = ParcelasDaAssessoria.Calcular(total, quantidade, primeira, pedido.ComEntrada, pedido.BaseEntrada, pedido.ValorEntrada, pedido.DataEntrada);
        if (calculadas.Count == 0)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "A entrada informada não fecha com o valor total.");
        }

        var contrato = servico.Contrato!;
        if (BloqueioDoParcelamento(contrato) is not null && !pedido.SubstituirPagamentos)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(
                Codigos.Validacao,
                "Já há pagamento ou comprovante registrado: confirme que quer refazer o parcelamento e marcar os pagamentos de novo.");
        }

        // Refazer com pagamentos (SPEC-043 §6.2): as parcelas novas nascem sem pagamento e os comprovantes antigos são apagados.
        var comprovantesAntigos = contrato.Parcelas
            .Select(parcela => parcela.ComprovanteArquivoId)
            .Append(contrato.ComprovanteArquivoId)
            .OfType<Guid>()
            .ToArray();
        contrato.ComprovanteArquivoId = null;
        contrato.ComprovanteNome = null;
        contrato.ComprovanteTipoConteudo = null;

        await dados.SubstituirParcelasAsync(contrato, calculadas.Select(parcela => new ParcelaContratoFornecedor
        {
            Id = Guid.NewGuid(),
            ContratoFornecedorId = contrato.Id,
            Numero = parcela.Numero,
            Vencimento = parcela.Vencimento,
            Valor = parcela.Valor,
            Entrada = parcela.Entrada,
            Situacao = SituacaoParcela.Pendente,
        }).ToArray(), ct);
        contrato.Pago = false;
        contrato.PagoEm = null;
        await dados.SalvarAsync(ct);
        foreach (var arquivoId in comprovantesAntigos)
        {
            await armazenamento.DescartarAsync(arquivoId, ct);
        }

        return await RecarregarAsync(contaId, eventoId, ct);
    }

    /// <summary>Volta o pagamento a inteiro, sem parcelas (SPEC-043 §6.2).</summary>
    public async Task<Resultado<DinheiroEventoLeitura>> RemoverParcelamentoAsync(string contaId, Guid eventoId, Guid servicoId, CancellationToken ct)
    {
        var (evento, servico) = await ObterServicoAsync(contaId, eventoId, servicoId, ct);
        if (evento is null || servico is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var contrato = servico.Contrato;
        if (contrato is null || contrato.Parcelas.Count == 0)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, "O pagamento não está parcelado.");
        }

        var bloqueio = BloqueioDoParcelamento(contrato);
        if (bloqueio is not null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Validacao, bloqueio);
        }

        await dados.SubstituirParcelasAsync(contrato, [], ct);
        contrato.Pago = false;
        contrato.PagoEm = null;
        await dados.SalvarAsync(ct);
        return await RecarregarAsync(contaId, eventoId, ct);
    }

    /// <summary>Marca ou desfaz o pagamento inteiro: todas as parcelas, ou o próprio pagamento se não tem parcelas (SPEC-043 §6.3).</summary>
    public async Task<Resultado<DinheiroEventoLeitura>> DefinirPagoAsync(
        string contaId,
        Guid eventoId,
        Guid servicoId,
        bool pago,
        DateOnly hoje,
        CancellationToken ct)
    {
        var (evento, servico) = await ObterServicoAsync(contaId, eventoId, servicoId, ct);
        if (evento is null || servico is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var contrato = servico.Contrato!;
        contrato.DefinirPago(pago, hoje);
        await dados.SalvarAsync(ct);
        return await RecarregarAsync(contaId, eventoId, ct);
    }

    /// <summary>Marca ou desmarca uma parcela; todas pagas deixam o pagamento pago sozinho (SPEC-043 §6.3).</summary>
    public async Task<Resultado<DinheiroEventoLeitura>> DefinirParcelaPagaAsync(
        string contaId,
        Guid eventoId,
        Guid servicoId,
        Guid parcelaId,
        bool paga,
        DateOnly hoje,
        CancellationToken ct)
    {
        var (evento, servico) = await ObterServicoAsync(contaId, eventoId, servicoId, ct);
        var parcela = servico?.Contrato?.Parcelas.FirstOrDefault(item => item.Id == parcelaId);
        if (evento is null || parcela is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        if (paga)
        {
            parcela.Marcar(hoje);
        }
        else
        {
            parcela.Desmarcar();
        }

        await dados.SalvarAsync(ct);
        return await RecarregarAsync(contaId, eventoId, ct);
    }

    /// <summary>Guarda o comprovante da parcela, ou do pagamento sem parcelas, e apaga o anterior (SPEC-043 §6.4).</summary>
    public async Task<Resultado<DinheiroEventoLeitura>> EnviarComprovanteAsync(
        string contaId,
        Guid eventoId,
        Guid servicoId,
        Guid? parcelaId,
        Stream conteudo,
        string? nomeArquivo,
        CancellationToken ct)
    {
        var (evento, servico) = await ObterServicoAsync(contaId, eventoId, servicoId, ct);
        if (evento is null || servico is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var alvo = AlvoDoComprovante(servico, parcelaId);
        if (alvo.Falha is not null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(alvo.Falha.Codigo, alvo.Falha.Mensagem);
        }

        var guardado = await armazenamento.GuardarDocumentoAsync(conteudo, nomeArquivo, contaId, ct);
        if (!guardado.Ok)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(guardado.Falha!.Codigo, guardado.Falha.Mensagem);
        }

        var anterior = alvo.Parcela?.ComprovanteArquivoId ?? alvo.Contrato!.ComprovanteArquivoId;
        var arquivo = guardado.Valor!;
        var nome = arquivo.NomeOriginal.Length > 260 ? arquivo.NomeOriginal[..260] : arquivo.NomeOriginal;
        if (alvo.Parcela is not null)
        {
            alvo.Parcela.ComprovanteArquivoId = arquivo.Id;
            alvo.Parcela.ComprovanteNome = nome;
            alvo.Parcela.ComprovanteTipoConteudo = arquivo.TipoConteudo;
        }
        else
        {
            alvo.Contrato!.ComprovanteArquivoId = arquivo.Id;
            alvo.Contrato.ComprovanteNome = nome;
            alvo.Contrato.ComprovanteTipoConteudo = arquivo.TipoConteudo;
        }

        await dados.SalvarAsync(ct);
        if (anterior is Guid antigo)
        {
            await armazenamento.DescartarAsync(antigo, ct);
        }

        return await RecarregarAsync(contaId, eventoId, ct);
    }

    public async Task<Resultado<DinheiroEventoLeitura>> ExcluirComprovanteAsync(
        string contaId,
        Guid eventoId,
        Guid servicoId,
        Guid? parcelaId,
        CancellationToken ct)
    {
        var (evento, servico) = await ObterServicoAsync(contaId, eventoId, servicoId, ct);
        if (evento is null || servico is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var alvo = AlvoDoComprovante(servico, parcelaId);
        var arquivoId = alvo.Parcela?.ComprovanteArquivoId ?? alvo.Contrato?.ComprovanteArquivoId;
        if (alvo.Falha is not null || arquivoId is null)
        {
            return Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        if (alvo.Parcela is not null)
        {
            alvo.Parcela.ComprovanteArquivoId = null;
            alvo.Parcela.ComprovanteNome = null;
            alvo.Parcela.ComprovanteTipoConteudo = null;
        }
        else
        {
            alvo.Contrato!.ComprovanteArquivoId = null;
            alvo.Contrato.ComprovanteNome = null;
            alvo.Contrato.ComprovanteTipoConteudo = null;
        }

        await dados.SalvarAsync(ct);
        await armazenamento.DescartarAsync(arquivoId.Value, ct);
        return await RecarregarAsync(contaId, eventoId, ct);
    }

    public async Task<Resultado<(string Nome, byte[] Conteudo)>> PlanilhaBudgetAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<(string, byte[])>.Erro(Codigos.Indisponivel, Indisponivel);
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

    /// <summary>
    /// Pagamento ou comprovante já registrado: remover o parcelamento fica bloqueado; refazer exige a confirmação
    /// <see cref="PedidoParcelas.SubstituirPagamentos"/> (SPEC-043 §6.2).
    /// </summary>
    private static string? BloqueioDoParcelamento(ContratoFornecedor contrato)
    {
        if (contrato.Pago || contrato.Parcelas.Any(parcela => parcela.Situacao == SituacaoParcela.Pago))
        {
            return "Desfaça os pagamentos antes de mudar o parcelamento.";
        }

        if (contrato.ComprovanteArquivoId is not null || contrato.Parcelas.Any(parcela => parcela.ComprovanteArquivoId is not null))
        {
            return "Exclua os comprovantes antes de mudar o parcelamento.";
        }

        return null;
    }

    private async Task<(Evento? Evento, ServicoEvento? Servico)> ObterServicoAsync(string contaId, Guid eventoId, Guid servicoId, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        var servico = evento?.Servicos.FirstOrDefault(item => item.Id == servicoId && item.Contrato is not null);
        return (evento, servico);
    }

    private static (ContratoFornecedor? Contrato, ParcelaContratoFornecedor? Parcela, Falha? Falha) AlvoDoComprovante(
        ServicoEvento servico,
        Guid? parcelaId)
    {
        if (parcelaId is Guid id)
        {
            var parcela = servico.Contrato?.Parcelas.FirstOrDefault(item => item.Id == id);
            return parcela is null
                ? (null, null, new Falha(Codigos.Indisponivel, Indisponivel))
                : (servico.Contrato, parcela, null);
        }

        if (servico.Contrato?.Parcelas.Count > 0)
        {
            return (null, null, new Falha(Codigos.Validacao, "Pagamento parcelado: o comprovante é de cada parcela."));
        }

        return servico.Contrato is null
            ? (null, null, new Falha(Codigos.Indisponivel, Indisponivel))
            : (servico.Contrato, null, null);
    }

    private async Task<Resultado<DinheiroEventoLeitura>> RecarregarAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        return evento is null
            ? Resultado<DinheiroEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel)
            : Resultado<DinheiroEventoLeitura>.Sucesso(await LerAsync(contaId, evento, ct));
    }

    private async Task<DinheiroEventoLeitura> LerAsync(string contaId, Evento evento, CancellationToken ct)
    {
        var pagamentos = await dados.PagamentosFornecedoresAsync(contaId, evento.Id, ct);
        return new DinheiroEventoLeitura(
            pagamentos.Sum(item => item.Valor),
            pagamentos.Sum(PagoDoPagamento),
            pagamentos);
    }

    private static decimal PagoDoPagamento(PagamentoFornecedorLeitura pagamento) =>
        pagamento.Parcelas.Count > 0
            ? pagamento.Parcelas.Where(parcela => parcela.Paga).Sum(parcela => parcela.Valor)
            : pagamento.Pago ? pagamento.Valor : 0m;

    private static string Arquivo(string nome)
    {
        var limpo = new string(nome.Select(c => char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : '-').ToArray()).Trim('-');
        return string.IsNullOrEmpty(limpo) ? "evento" : limpo;
    }
}
