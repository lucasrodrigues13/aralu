import { STATUS } from '../shared/status';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export type SituacaoParcelaContrato = 'AReceber' | 'Parcial' | 'Recebida' | 'Atrasada';
export type TipoCobranca = 'Lembrete' | 'VenceHoje' | 'Atrasada';
export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartao' | 'Transferencia' | 'Boleto' | 'Outro';

export const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'Pix', rotulo: 'Pix' },
  { valor: 'Dinheiro', rotulo: 'Dinheiro' },
  { valor: 'Cartao', rotulo: 'Cartão' },
  { valor: 'Transferencia', rotulo: 'Transferência' },
  { valor: 'Boleto', rotulo: 'Boleto' },
  { valor: 'Outro', rotulo: 'Outro' },
];

export const SITUACOES_PARCELA_CONTRATO: Record<SituacaoParcelaContrato, { rotulo: string; classe: string }> = {
  AReceber: { rotulo: 'A receber', classe: STATUS.neutro },
  Parcial: { rotulo: 'Parcial', classe: STATUS.info },
  Recebida: { rotulo: 'Recebida', classe: STATUS.sucesso },
  Atrasada: { rotulo: 'Atrasada', classe: STATUS.erro },
};

export interface RecebimentoParcela {
  id: string;
  valor: number;
  forma: FormaPagamento;
  data: string;
}

/** Parcela do contrato com o cliente (SPEC-040): o que o cliente paga à organizadora. */
export interface ParcelaContrato {
  id: string;
  numero: number;
  vencimento: string;
  valor: number;
  entrada: boolean;
  recebido: number;
  saldo: number;
  situacao: SituacaoParcelaContrato;
  cobranca: TipoCobranca;
  recebimentos: RecebimentoParcela[];
}

/** Parcela do orçamento do funil (SPEC-040). */
export interface ParcelaOrcamento {
  numero: number;
  vencimento: string;
  valor: number;
  entrada: boolean;
}

export interface ComprovantePagamento {
  arquivoId: string;
  nome: string;
  tipoConteudo: string;
}

export interface ParcelaPagamento {
  id: string;
  numero: number;
  vencimento: string;
  valor: number;
  entrada: boolean;
  paga: boolean;
  pagoEm: string | null;
  comprovante: ComprovantePagamento | null;
}

/** Um pagamento a fornecedor: o serviço contratado do evento, com ou sem parcelas (SPEC-043). */
export interface PagamentoFornecedor {
  eventoId: string;
  evento: string;
  servicoId: string;
  servico: string;
  fornecedor: string | null;
  valor: number;
  pago: boolean;
  pagoEm: string | null;
  vencimento: string | null;
  comprovante: ComprovantePagamento | null;
  parcelas: ParcelaPagamento[];
  /** Contrato assinado do fornecedor (SPEC-045); o cliente também sobe pelo link (SPEC-046). */
  contratoAssinado: ComprovantePagamento | null;
}

/** Comprovantes aceitos (SPEC-029 §6.6). */
export const TIPOS_COMPROVANTE = ['image/jpeg', 'image/png', 'application/pdf'];
export const EXTENSOES_COMPROVANTE = ['.jpg', '.jpeg', '.png', '.pdf'];
export const TAMANHO_MAXIMO_COMPROVANTE = 5 * 1024 * 1024;

/** Confere tipo e tamanho antes de enviar; o servidor confere de novo. */
export function validarComprovante(arquivo: { name: string; size: number }): string | null {
  const nome = arquivo.name.toLowerCase();
  if (!EXTENSOES_COMPROVANTE.some((extensao) => nome.endsWith(extensao))) {
    return 'Use um arquivo JPG, JPEG, PNG ou PDF.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_COMPROVANTE) {
    return 'O arquivo passa de 5 MB.';
  }
  return null;
}

/**
 * Refazer o parcelamento apaga o que já foi registrado (SPEC-043 §6.2): pagamento marcado e comprovantes.
 * Quando há algo a perder, o modal avisa antes e o pedido leva a confirmação `substituirPagamentos`.
 */
export function refazerPerdePagamentos(pagamento: Pick<PagamentoFornecedor, 'pago' | 'comprovante' | 'parcelas'>): boolean {
  return pagamento.pago || pagamento.comprovante !== null || pagamento.parcelas.some((parcela) => parcela.paga || parcela.comprovante !== null);
}

export interface DinheiroEvento {
  contratado: number;
  pago: number;
  pagamentosFornecedores: PagamentoFornecedor[];
}

export interface PedidoParcelamentoPagamento {
  quantidadeParcelas: number;
  primeiraParcela: string | null;
  comEntrada: boolean;
  baseEntrada: 'Valor' | 'Porcentagem' | null;
  valorEntrada: number | null;
  dataEntrada: string | null;
  /** Confirma que refazer apaga pagamentos e comprovantes já registrados. */
  substituirPagamentos?: boolean;
}

/** Dinheiro do evento (SPEC-043): pagamentos a fornecedores com parcelas e comprovantes. */
@Injectable({ providedIn: 'root' })
export class DinheiroClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  obter(eventoId: string) {
    return this.http.get<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro`);
  }

  private pagamento(eventoId: string, servicoId: string) {
    return `${this.base}/api/v1/eventos/${eventoId}/dinheiro/pagamentos/${servicoId}`;
  }

  parcelar(eventoId: string, servicoId: string, pedido: PedidoParcelamentoPagamento) {
    return this.http.put<DinheiroEvento>(`${this.pagamento(eventoId, servicoId)}/parcelamento`, pedido);
  }

  removerParcelamento(eventoId: string, servicoId: string) {
    return this.http.delete<DinheiroEvento>(`${this.pagamento(eventoId, servicoId)}/parcelamento`);
  }

  marcarPagamento(eventoId: string, servicoId: string, pago: boolean) {
    return this.http.put<DinheiroEvento>(`${this.pagamento(eventoId, servicoId)}/pago`, { pago });
  }

  marcarParcela(eventoId: string, servicoId: string, parcelaId: string, pago: boolean) {
    return this.http.put<DinheiroEvento>(`${this.pagamento(eventoId, servicoId)}/parcelas/${parcelaId}/pago`, { pago });
  }

  /** Comprovante da parcela, ou do pagamento quando `parcelaId` é nulo. */
  enviarComprovante(eventoId: string, servicoId: string, parcelaId: string | null, arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<DinheiroEvento>(this.comprovante(eventoId, servicoId, parcelaId), dados);
  }

  excluirComprovante(eventoId: string, servicoId: string, parcelaId: string | null) {
    return this.http.delete<DinheiroEvento>(this.comprovante(eventoId, servicoId, parcelaId));
  }

  private comprovante(eventoId: string, servicoId: string, parcelaId: string | null) {
    const base = this.pagamento(eventoId, servicoId);
    return parcelaId ? `${base}/parcelas/${parcelaId}/comprovante` : `${base}/comprovante`;
  }

  planilhaBudget(eventoId: string) {
    return this.http.get(`${this.base}/api/v1/eventos/${eventoId}/budget/planilha`, { responseType: 'blob' });
  }

  baixarArquivo(arquivoId: string) {
    return this.http.get(`${this.base}/api/v1/arquivos/${arquivoId}`, { responseType: 'blob' });
  }
}
