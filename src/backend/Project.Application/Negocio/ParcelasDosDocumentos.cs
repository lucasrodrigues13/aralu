using Project.Application.Comum;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

/// <summary>
/// Pedido do parcelamento de um documento: orçamento, contrato com o cliente ou contrato de fornecedor (SPEC-040).
/// O valor total vem do documento; o gerador é o mesmo para os três (<see cref="ParcelasDaAssessoria"/>).
/// <see cref="SubstituirPagamentos"/> só vale no pagamento a fornecedor: confirma que refazer apaga os pagamentos
/// e comprovantes já registrados (SPEC-043 §6.2).
/// </summary>
public sealed record PedidoParcelas(
    int? QuantidadeParcelas,
    DateOnly? PrimeiraParcela,
    bool ComEntrada,
    BaseEntrada? BaseEntrada,
    decimal? ValorEntrada,
    DateOnly? DataEntrada,
    bool SubstituirPagamentos = false);

public sealed record ReceberParcela(decimal? Valor, FormaPagamento? Forma, DateOnly? Data);

public sealed record RecebimentoLeitura(Guid Id, decimal Valor, FormaPagamento Forma, DateOnly Data);

public sealed record ParcelaOrcamentoLeitura(int Numero, DateOnly Vencimento, decimal Valor, bool Entrada);

public sealed record ParcelaContratoLeitura(
    Guid Id,
    int Numero,
    DateOnly Vencimento,
    decimal Valor,
    bool Entrada,
    decimal Recebido,
    decimal Saldo,
    SituacaoParcelaContrato Situacao,
    TipoCobranca Cobranca,
    IReadOnlyList<RecebimentoLeitura> Recebimentos);

public static class ParcelasDosDocumentos
{
    /// <summary>Valida o pedido e gera as parcelas do valor total.</summary>
    public static Resultado<IReadOnlyList<ParcelaCalculada>> Gerar(decimal? total, PedidoParcelas pedido)
    {
        if (total is not decimal valor || valor <= 0)
        {
            return Resultado<IReadOnlyList<ParcelaCalculada>>.Erro(Codigos.Validacao, "Informe o valor antes de parcelar.");
        }

        if (pedido.QuantidadeParcelas is not int quantidade || quantidade < 1 || quantidade > 120)
        {
            return Resultado<IReadOnlyList<ParcelaCalculada>>.Erro(Codigos.Validacao, "Informe o número de parcelas (1 a 120).");
        }

        if (pedido.PrimeiraParcela is not DateOnly primeira)
        {
            return Resultado<IReadOnlyList<ParcelaCalculada>>.Erro(Codigos.Validacao, "Informe o vencimento da primeira parcela.");
        }

        var calculadas = ParcelasDaAssessoria.Calcular(
            valor,
            quantidade,
            primeira,
            pedido.ComEntrada,
            pedido.BaseEntrada,
            pedido.ValorEntrada,
            pedido.DataEntrada);
        return calculadas.Count == 0
            ? Resultado<IReadOnlyList<ParcelaCalculada>>.Erro(Codigos.Validacao, "A entrada informada não fecha com o valor total.")
            : Resultado<IReadOnlyList<ParcelaCalculada>>.Sucesso(calculadas);
    }

    public static ParcelaContratoLeitura Ler(ParcelaContrato parcela, DateOnly hoje) =>
        new(
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
                .ToArray());
}
