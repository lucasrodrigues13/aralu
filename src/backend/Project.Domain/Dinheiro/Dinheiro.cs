using Project.Domain.Fornecedores;

namespace Project.Domain.Dinheiro;

/// <summary>
/// Parcela do orçamento do funil (SPEC-040). Nasce no orçamento e é copiada para o contrato quando ele é gerado.
/// </summary>
public sealed class ParcelaOrcamento
{
    public Guid Id { get; set; }

    public Guid OrcamentoFunilId { get; set; }

    public int Numero { get; set; }

    public DateOnly Vencimento { get; set; }

    public decimal Valor { get; set; }

    public bool Entrada { get; set; }
}

/// <summary>Parcela do contrato com o cliente: o que o cliente paga à organizadora (SPEC-040; antiga ParcelaCasal).</summary>
public sealed class ParcelaContrato
{
    public Guid Id { get; set; }

    public Guid ContratoFunilId { get; set; }

    public int Numero { get; set; }

    public DateOnly Vencimento { get; set; }

    public decimal Valor { get; set; }

    public bool Entrada { get; set; }

    public List<RecebimentoParcela> Recebimentos { get; set; } = [];

    public decimal Recebido => Recebimentos.Sum(item => item.Valor);

    public decimal Saldo => Math.Max(0m, Valor - Recebido);

    public SituacaoParcelaContrato Situacao(DateOnly hoje)
    {
        var recebido = Recebido;
        if (recebido >= Valor)
        {
            return SituacaoParcelaContrato.Recebida;
        }

        if (Vencimento < hoje)
        {
            return SituacaoParcelaContrato.Atrasada;
        }

        return recebido > 0 ? SituacaoParcelaContrato.Parcial : SituacaoParcelaContrato.AReceber;
    }

    /// <summary>Qual texto de cobrança usar (SPEC-029 §6.2).</summary>
    public TipoCobranca Cobranca(DateOnly hoje) =>
        Vencimento < hoje ? TipoCobranca.Atrasada : Vencimento == hoje ? TipoCobranca.VenceHoje : TipoCobranca.Lembrete;
}

public sealed class RecebimentoParcela
{
    public Guid Id { get; set; }

    public Guid ParcelaId { get; set; }

    public decimal Valor { get; set; }

    public FormaPagamento Forma { get; set; }

    public DateOnly Data { get; set; }

    public DateTimeOffset CriadoEm { get; set; }
}

/// <summary>Contrato da organizadora com o fornecedor de um serviço do evento (SPEC-040; substitui ParcelaServico).</summary>
public sealed class ContratoFornecedor
{
    public Guid Id { get; set; }

    public Guid ServicoId { get; set; }

    public List<ParcelaContratoFornecedor> Parcelas { get; set; } = [];
}

/// <summary>Parcela que se paga ao fornecedor (SPEC-040).</summary>
public sealed class ParcelaContratoFornecedor
{
    public Guid Id { get; set; }

    public Guid ContratoFornecedorId { get; set; }

    public int Numero { get; set; }

    public DateOnly Vencimento { get; set; }

    public decimal Valor { get; set; }

    public bool Entrada { get; set; }

    public SituacaoParcela Situacao { get; set; }
}

/// <summary>Despesa ou entrada avulsa do evento (SPEC-029 §6.6).</summary>
public sealed class LancamentoEvento
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public TipoLancamento Tipo { get; set; }

    public string Categoria { get; set; } = "";

    public string? Descricao { get; set; }

    public decimal Valor { get; set; }

    public DateOnly Data { get; set; }
}

/// <summary>Comprovante ou documento do evento (SPEC-029 §6.6). O arquivo fica no armazenamento da conta.</summary>
public sealed class ComprovanteEvento
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public Guid ArquivoId { get; set; }

    public string Nome { get; set; } = "";

    public string TipoConteudo { get; set; } = "";

    public string? Descricao { get; set; }

    public DateTimeOffset EnviadoEm { get; set; }
}

public enum SituacaoParcelaContrato
{
    AReceber,
    Parcial,
    Recebida,
    Atrasada,
}

public enum TipoCobranca
{
    Lembrete,
    VenceHoje,
    Atrasada,
}

public enum FormaPagamento
{
    Pix,
    Dinheiro,
    Cartao,
    Transferencia,
    Boleto,
    Outro,
}

public enum TipoLancamento
{
    Despesa,
    Entrada,
}
