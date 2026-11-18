import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export type SituacaoParcelaCasal = 'AReceber' | 'Parcial' | 'Recebida' | 'Atrasada';
export type TipoCobranca = 'Lembrete' | 'VenceHoje' | 'Atrasada';
export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartao' | 'Transferencia' | 'Boleto' | 'Outro';
export type TipoLancamento = 'Despesa' | 'Entrada';

export const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'Pix', rotulo: 'Pix' },
  { valor: 'Dinheiro', rotulo: 'Dinheiro' },
  { valor: 'Cartao', rotulo: 'Cartão' },
  { valor: 'Transferencia', rotulo: 'Transferência' },
  { valor: 'Boleto', rotulo: 'Boleto' },
  { valor: 'Outro', rotulo: 'Outro' },
];

export const SITUACOES_PARCELA_CASAL: Record<SituacaoParcelaCasal, { rotulo: string; classe: string }> = {
  AReceber: { rotulo: 'A receber', classe: 'neutro' },
  Parcial: { rotulo: 'Parcial', classe: 'info' },
  Recebida: { rotulo: 'Recebida', classe: 'ok' },
  Atrasada: { rotulo: 'Atrasada', classe: 'erro' },
};

export interface RecebimentoParcela {
  id: string;
  valor: number;
  forma: FormaPagamento;
  data: string;
}

export interface ParcelaCasal {
  id: string;
  numero: number;
  vencimento: string;
  valor: number;
  entrada: boolean;
  recebido: number;
  saldo: number;
  situacao: SituacaoParcelaCasal;
  cobranca: TipoCobranca;
  recebimentos: RecebimentoParcela[];
}

export interface LancamentoEvento {
  id: string;
  tipo: TipoLancamento;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
}

export interface PagamentoFornecedor {
  eventoId: string;
  evento: string;
  servicoId: string;
  servico: string;
  fornecedor: string | null;
  numero: number;
  vencimento: string;
  valor: number;
  entrada: boolean;
  situacao: string;
}

export interface DinheiroEvento {
  valorContrato: number | null;
  recebido: number;
  saldo: number;
  despesas: number;
  entradas: number;
  chavePix: string | null;
  parcelas: ParcelaCasal[];
  pagamentosFornecedores: PagamentoFornecedor[];
  lancamentos: LancamentoEvento[];
}

export interface DefinirContratoCasal {
  valor: number | null;
  quantidadeParcelas: number;
  primeiraParcela: string | null;
  comEntrada: boolean;
  baseEntrada: 'Valor' | 'Porcentagem' | null;
  valorEntrada: number | null;
  dataEntrada: string | null;
}

/** Dinheiro do evento e pagamentos da conta (SPEC-029). */
@Injectable({ providedIn: 'root' })
export class DinheiroClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  obter(eventoId: string) {
    return this.http.get<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro`);
  }

  definirContrato(eventoId: string, pedido: DefinirContratoCasal) {
    return this.http.put<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro/contrato`, pedido);
  }

  receber(eventoId: string, parcelaId: string, pedido: { valor: number; forma: FormaPagamento; data: string }) {
    return this.http.post<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro/parcelas/${parcelaId}/recebimentos`, pedido);
  }

  desfazer(eventoId: string, parcelaId: string) {
    return this.http.delete<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro/parcelas/${parcelaId}/recebimentos/ultimo`);
  }

  salvarLancamento(eventoId: string, id: string | null, pedido: Omit<LancamentoEvento, 'id'>) {
    const url = `${this.base}/api/v1/eventos/${eventoId}/dinheiro/lancamentos`;
    return id ? this.http.put<DinheiroEvento>(`${url}/${id}`, pedido) : this.http.post<DinheiroEvento>(url, pedido);
  }

  excluirLancamento(eventoId: string, id: string) {
    return this.http.delete<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro/lancamentos/${id}`);
  }

  planilhaBudget(eventoId: string) {
    return this.http.get(`${this.base}/api/v1/eventos/${eventoId}/budget/planilha`, { responseType: 'blob' });
  }

  pagamentos() {
    return this.http.get<PagamentoFornecedor[]>(`${this.base}/api/v1/pagamentos`);
  }
}
