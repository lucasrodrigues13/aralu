import { PagamentoFornecedor } from '../../core/dinheiro.client';
import { pagamentosPorMes } from './pagamentos-por-mes';

function pagamento(valor: number, vencimento: string | null): PagamentoFornecedor {
  return {
    eventoId: 'e', evento: 'Evento', servicoId: `s${valor}`, servico: 'Serviço', fornecedor: null,
    valor, pago: false, pagoEm: null, vencimento, comprovante: null, parcelas: [], contratoAssinado: null,
  };
}

describe('pagamentosPorMes', () => {
  it('agrupa pelo mês do vencimento, em ordem, e soma o total', () => {
    const grupos = pagamentosPorMes([pagamento(100, '2027-01-10'), pagamento(200, '2026-12-05'), pagamento(50, '2027-01-20')]);
    expect(grupos.map((g) => g.mes)).toEqual(['dezembro de 2026', 'janeiro de 2027']);
    expect(grupos[1].total).toBe(150);
  });

  it('põe os pagamentos sem parcelas em "Sem vencimento", no fim', () => {
    const grupos = pagamentosPorMes([pagamento(10, null), pagamento(20, '2026-12-05')]);
    expect(grupos.map((g) => g.mes)).toEqual(['dezembro de 2026', 'Sem vencimento']);
  });
});
