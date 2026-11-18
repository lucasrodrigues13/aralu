namespace Project.Domain.Dinheiro;

/// <summary>Parcela que o casal paga à assessoria (SPEC-029). Não é parcela de fornecedor.</summary>
public sealed class ParcelaCasal
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public int Numero { get; set; }

    public DateOnly Vencimento { get; set; }

    public decimal Valor { get; set; }

    public bool Entrada { get; set; }

    public List<RecebimentoParcela> Recebimentos { get; set; } = [];

    public decimal Recebido => Recebimentos.Sum(item => item.Valor);

    public decimal Saldo => Math.Max(0m, Valor - Recebido);

    public SituacaoParcelaCasal Situacao(DateOnly hoje)
    {
        var recebido = Recebido;
        if (recebido >= Valor)
        {
            return SituacaoParcelaCasal.Recebida;
        }

        if (Vencimento < hoje)
        {
            return SituacaoParcelaCasal.Atrasada;
        }

        return recebido > 0 ? SituacaoParcelaCasal.Parcial : SituacaoParcelaCasal.AReceber;
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

public enum SituacaoParcelaCasal
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
