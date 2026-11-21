import { STATUS } from '../shared/status';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export type SituacaoParcelaContrato = 'AReceber' | 'Parcial' | 'Recebida' | 'Atrasada';
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

export interface ComprovanteEvento {
  id: string;
  arquivoId: string;
  nome: string;
  tipoConteudo: string;
  descricao: string | null;
  enviadoEm: string;
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

export interface DinheiroEvento {
  despesas: number;
  entradas: number;
  pagamentosFornecedores: PagamentoFornecedor[];
  lancamentos: LancamentoEvento[];
  comprovantes: ComprovanteEvento[];
}

/** Dinheiro do evento (SPEC-029 v2): pagamentos a fornecedores, despesas e comprovantes. */
@Injectable({ providedIn: 'root' })
export class DinheiroClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  obter(eventoId: string) {
    return this.http.get<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro`);
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

  enviarComprovante(eventoId: string, arquivo: File, descricao: string) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    if (descricao.trim()) dados.append('descricao', descricao.trim());
    return this.http.post<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro/comprovantes`, dados);
  }

  excluirComprovante(eventoId: string, id: string) {
    return this.http.delete<DinheiroEvento>(`${this.base}/api/v1/eventos/${eventoId}/dinheiro/comprovantes/${id}`);
  }

  baixarArquivo(arquivoId: string) {
    return this.http.get(`${this.base}/api/v1/arquivos/${arquivoId}`, { responseType: 'blob' });
  }

  pagamentos() {
    return this.http.get<PagamentoFornecedor[]>(`${this.base}/api/v1/pagamentos`);
  }
}
