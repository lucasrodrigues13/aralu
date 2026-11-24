using Microsoft.EntityFrameworkCore;
using Project.Application.Negocio;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;

namespace Project.Infrastructure.Persistencia;

public sealed class DadosDinheiroEf(AppDbContext banco) : IDadosDinheiro
{
    public Task<Evento?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct) =>
        banco.Eventos
            .Include(evento => evento.Servicos).ThenInclude(servico => servico.Contratos).ThenInclude(contrato => contrato.Parcelas)
            .Include(evento => evento.Servicos).ThenInclude(servico => servico.Subitens)
            .Include(evento => evento.Servicos).ThenInclude(servico => servico.Fornecedores)
            .AsSplitQuery()
            .FirstOrDefaultAsync(evento => evento.Id == eventoId && evento.ContaId == contaId, ct);

    public async Task<IReadOnlyList<PagamentoFornecedorLeitura>> PagamentosFornecedoresAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var evento = await banco.Eventos.AsNoTracking()
            .Include(item => item.Servicos).ThenInclude(servico => servico.Contratos).ThenInclude(contrato => contrato.Parcelas)
            .Include(item => item.Servicos).ThenInclude(servico => servico.Fornecedores)
            .AsSplitQuery()
            .FirstOrDefaultAsync(item => item.Id == eventoId && item.ContaId == contaId, ct);
        if (evento is null)
        {
            return [];
        }

        var fornecedorIds = evento.Servicos
            .SelectMany(servico => servico.Fornecedores)
            .Where(vinculo => vinculo.Etapa == EtapaNegociacao.Contratado)
            .Select(vinculo => vinculo.FornecedorId)
            .Distinct()
            .ToArray();
        var nomes = await banco.Fornecedores.AsNoTracking()
            .Where(fornecedor => fornecedor.ContaId == contaId && fornecedorIds.Contains(fornecedor.Id))
            .ToDictionaryAsync(fornecedor => fornecedor.Id, fornecedor => fornecedor.Nome, ct);

        return evento.Servicos
            .OrderBy(servico => servico.Ordem)
            .SelectMany(servico => servico.ContratosAtivos.Select(contrato => (servico, contrato)))
            .Select(par =>
            {
                var (servico, contrato) = par;
                var parcelas = contrato.Parcelas.OrderBy(parcela => parcela.Numero).ToArray();
                var contratado = servico.Fornecedores.First(vinculo => vinculo.Id == contrato.VinculoId);
                nomes.TryGetValue(contratado.FornecedorId, out var fornecedor);

                var pendentes = parcelas.Where(parcela => parcela.Situacao == SituacaoParcela.Pendente).ToArray();
                DateOnly? vencimento = parcelas.Length == 0
                    ? null
                    : pendentes.Length > 0 ? pendentes.Min(parcela => parcela.Vencimento) : parcelas.Max(parcela => parcela.Vencimento);
                return new PagamentoFornecedorLeitura(
                    contrato.VinculoId,
                    evento.Id,
                    evento.Nome,
                    servico.Id,
                    servico.Nome,
                    fornecedor,
                    contratado.ValorOrcamento ?? parcelas.Sum(parcela => parcela.Valor),
                    contrato?.EstaPago ?? false,
                    parcelas.Length > 0
                        ? contrato!.EstaPago ? parcelas.Max(parcela => parcela.PagoEm) : null
                        : contrato?.PagoEm,
                    vencimento,
                    Comprovante(contrato?.ComprovanteArquivoId, contrato?.ComprovanteNome, contrato?.ComprovanteTipoConteudo),
                    parcelas.Select(parcela => new ParcelaPagamentoLeitura(
                        parcela.Id,
                        parcela.Numero,
                        parcela.Vencimento,
                        parcela.Valor,
                        parcela.Entrada,
                        parcela.Situacao == SituacaoParcela.Pago,
                        parcela.PagoEm,
                        Comprovante(parcela.ComprovanteArquivoId, parcela.ComprovanteNome, parcela.ComprovanteTipoConteudo))).ToArray(),
                    Comprovante(contrato?.ContratoAssinadoArquivoId, contrato?.ContratoAssinadoNome, contrato?.ContratoAssinadoTipoConteudo));
            })
            .ToArray();
    }

    public Task SubstituirParcelasAsync(ContratoFornecedor contrato, IReadOnlyList<ParcelaContratoFornecedor> novas, CancellationToken ct)
    {
        var antigas = contrato.Parcelas.ToArray();
        banco.Set<ParcelaContratoFornecedor>().RemoveRange(antigas);
        banco.Set<ParcelaContratoFornecedor>().AddRange(novas);
        return Task.CompletedTask;
    }

    public Task SalvarAsync(CancellationToken ct) => banco.SaveChangesAsync(ct);

    private static ComprovantePagamentoLeitura? Comprovante(Guid? arquivoId, string? nome, string? tipo) =>
        arquivoId is Guid id ? new ComprovantePagamentoLeitura(id, nome ?? "comprovante", tipo ?? "application/octet-stream") : null;
}
