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

/// <summary>Parcela do contrato com o cliente: o que o cliente paga à organizadora (SPEC-040).</summary>
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

/// <summary>Contrato da organizadora com o fornecedor de um serviço do evento (SPEC-040; substitui ParcelaServico). É o "pagamento" da aba Dinheiro (SPEC-043).</summary>
public sealed class ContratoFornecedor
{
    public Guid Id { get; set; }

    public Guid ServicoId { get; set; }

    public List<ParcelaContratoFornecedor> Parcelas { get; set; } = [];

    /// <summary>Só vale quando não há parcelas; com parcelas, o pagamento está pago quando todas estão pagas.</summary>
    public bool Pago { get; set; }

    public DateOnly? PagoEm { get; set; }

    public Guid? ComprovanteArquivoId { get; set; }

    public string? ComprovanteNome { get; set; }

    public string? ComprovanteTipoConteudo { get; set; }

    /// <summary>Contrato assinado pelo fornecedor e pelo cliente, anexado pelo organizador (SPEC-045).</summary>
    public Guid? ContratoAssinadoArquivoId { get; set; }

    public string? ContratoAssinadoNome { get; set; }

    public string? ContratoAssinadoTipoConteudo { get; set; }

    /// <summary>Quem enviou o contrato assinado: "Organizadora" ou "Cliente" (SPEC-048). Nulo em contratos anteriores ao campo.</summary>
    public string? ContratoAssinadoEnviadoPor { get; set; }

    public DateOnly? ContratoAssinadoEnviadoEm { get; set; }

    public bool EstaPago => Parcelas.Count > 0 ? Parcelas.All(parcela => parcela.Situacao == SituacaoParcela.Pago) : Pago;

    /// <summary>Marca ou desmarca o pagamento inteiro: todas as parcelas ou, sem parcelas, o próprio contrato.</summary>
    public void DefinirPago(bool pago, DateOnly hoje)
    {
        Pago = pago;
        PagoEm = pago ? hoje : null;
        foreach (var parcela in Parcelas)
        {
            if (pago)
            {
                parcela.Marcar(hoje);
            }
            else
            {
                parcela.Desmarcar();
            }
        }
    }
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

    public DateOnly? PagoEm { get; set; }

    public Guid? ComprovanteArquivoId { get; set; }

    public string? ComprovanteNome { get; set; }

    public string? ComprovanteTipoConteudo { get; set; }

    public void Marcar(DateOnly hoje)
    {
        if (Situacao != SituacaoParcela.Pago)
        {
            Situacao = SituacaoParcela.Pago;
            PagoEm = hoje;
        }
    }

    public void Desmarcar()
    {
        Situacao = SituacaoParcela.Pendente;
        PagoEm = null;
    }
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
