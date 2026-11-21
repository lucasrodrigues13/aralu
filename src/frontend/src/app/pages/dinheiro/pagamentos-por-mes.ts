import { PagamentoFornecedor } from '../../core/dinheiro.client';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export interface GrupoPagamentos {
  chave: string;
  mes: string;
  total: number;
  itens: PagamentoFornecedor[];
}

/** Agrupa os pagamentos pelo mês do vencimento (SPEC-043 §6.1); os sem parcelas ficam em "Sem vencimento", no fim. */
export function pagamentosPorMes(pagamentos: PagamentoFornecedor[]): GrupoPagamentos[] {
  const grupos = new Map<string, GrupoPagamentos>();
  for (const pagamento of pagamentos) {
    let chave = 'zzzz';
    let mes = 'Sem vencimento';
    if (pagamento.vencimento) {
      const [ano, numero] = pagamento.vencimento.slice(0, 7).split('-');
      chave = `${ano}-${numero}`;
      mes = `${MESES[Number(numero) - 1]} de ${ano}`;
    }
    const grupo = grupos.get(chave) ?? { chave, mes, total: 0, itens: [] };
    grupo.total += pagamento.valor;
    grupo.itens.push(pagamento);
    grupos.set(chave, grupo);
  }
  return [...grupos.values()].sort((a, b) => a.chave.localeCompare(b.chave));
}
