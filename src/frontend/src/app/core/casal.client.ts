import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';
import { DinheiroEvento, PedidoParcelamentoPagamento } from './dinheiro.client';

/** Link do casal como a organizadora vê (SPEC-046 §6.1). */
export interface LinkCasal {
  ativo: boolean;
  token: string | null;
  financeiroLiberado: boolean;
}

/** O que a página do casal recebe (SPEC-046 §6.2 e §6.3). `financeiro` é nulo com o financeiro fechado. */
export interface CasalLeitura {
  evento: string;
  data: string | null;
  financeiroLiberado: boolean;
  financeiro: DinheiroEvento | null;
}

/** Endereço que a organizadora passa ao casal. */
export function enderecoDoLinkCasal(origem: string, token: string): string {
  return `${origem}/casal/${token}`;
}

/** Link do casal: gestão pela organizadora e acesso público do casal (SPEC-046). */
@Injectable({ providedIn: 'root' })
export class CasalClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // ---- Organizadora ----

  link(eventoId: string) {
    return this.http.get<LinkCasal>(this.url(eventoId));
  }

  /** Gera o link ou, se já existe, troca o código. */
  gerar(eventoId: string) {
    return this.http.post<LinkCasal>(this.url(eventoId), null);
  }

  liberarFinanceiro(eventoId: string, financeiroLiberado: boolean) {
    return this.http.put<LinkCasal>(this.url(eventoId), { financeiroLiberado });
  }

  desativar(eventoId: string) {
    return this.http.delete<LinkCasal>(this.url(eventoId));
  }

  private url(eventoId: string) {
    return `${this.base}/api/v1/eventos/${eventoId}/link-casal`;
  }

  // ---- Casal (sem login) ----

  obter(token: string) {
    return this.http.get<CasalLeitura>(this.publico(token));
  }

  parcelar(token: string, servicoId: string, pedido: PedidoParcelamentoPagamento) {
    return this.http.put<CasalLeitura>(`${this.pagamento(token, servicoId)}/parcelamento`, pedido);
  }

  removerParcelamento(token: string, servicoId: string) {
    return this.http.delete<CasalLeitura>(`${this.pagamento(token, servicoId)}/parcelamento`);
  }

  marcarPagamento(token: string, servicoId: string, pago: boolean) {
    return this.http.put<CasalLeitura>(`${this.pagamento(token, servicoId)}/pago`, { pago });
  }

  marcarParcela(token: string, servicoId: string, parcelaId: string, pago: boolean) {
    return this.http.put<CasalLeitura>(`${this.pagamento(token, servicoId)}/parcelas/${parcelaId}/pago`, { pago });
  }

  /** Comprovante da parcela, ou do pagamento quando `parcelaId` é nulo. */
  enviarComprovante(token: string, servicoId: string, parcelaId: string | null, arquivo: File) {
    return this.http.post<CasalLeitura>(this.comprovante(token, servicoId, parcelaId), this.formulario(arquivo));
  }

  excluirComprovante(token: string, servicoId: string, parcelaId: string | null) {
    return this.http.delete<CasalLeitura>(this.comprovante(token, servicoId, parcelaId));
  }

  enviarContratoAssinado(token: string, servicoId: string, arquivo: File) {
    return this.http.post<CasalLeitura>(`${this.pagamento(token, servicoId)}/contrato-assinado`, this.formulario(arquivo));
  }

  excluirContratoAssinado(token: string, servicoId: string) {
    return this.http.delete<CasalLeitura>(`${this.pagamento(token, servicoId)}/contrato-assinado`);
  }

  baixarArquivo(token: string, arquivoId: string) {
    return this.http.get(`${this.publico(token)}/arquivos/${arquivoId}`, { responseType: 'blob' });
  }

  private publico(token: string) {
    return `${this.base}/api/v1/publico/casal/${token}`;
  }

  private pagamento(token: string, servicoId: string) {
    return `${this.publico(token)}/pagamentos/${servicoId}`;
  }

  private comprovante(token: string, servicoId: string, parcelaId: string | null) {
    const base = this.pagamento(token, servicoId);
    return parcelaId ? `${base}/parcelas/${parcelaId}/comprovante` : `${base}/comprovante`;
  }

  private formulario(arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return dados;
  }
}
