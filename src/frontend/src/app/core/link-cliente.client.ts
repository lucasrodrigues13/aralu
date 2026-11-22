import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';
import { PedidoConvite } from './convite-formulario';
import { ImportacaoConvidados } from './importacoes';
import { PresencaEvento } from './negocio.client';
import { DinheiroEvento, PedidoParcelamentoPagamento } from './dinheiro.client';

/** Link do cliente como a organizadora vê (SPEC-046 §6.1). */
export interface LinkCliente {
  ativo: boolean;
  token: string | null;
  financeiroLiberado: boolean;
  /** O cliente vê e cadastra os convites (SPEC-052). */
  convidadosLiberado: boolean;
}

/** Convidado de um convite, como o cliente vê (SPEC-052). */
export interface ConvidadoDoLink {
  id: string;
  nome: string;
  situacao: string;
  ddi: string | null;
  celular: string | null;
  genero: string | null;
  faixa: string | null;
  /** Quem recebe as comunicações do convite. */
  principal: boolean;
}

export interface ConviteDoLink {
  id: string;
  nome: string;
  ddi: string | null;
  telefone: string | null;
  email: string | null;
  convidados: ConvidadoDoLink[];
  /** O link deste convite aceita resposta após o prazo (SPEC-054). */
  excecaoPrazoRsvp: boolean;
}

/** O que a página do cliente recebe (SPEC-046 §6.2 e §6.3). `financeiro` é nulo com o financeiro fechado. */
export interface PaginaClienteLeitura {
  evento: string;
  data: string | null;
  financeiroLiberado: boolean;
  financeiro: DinheiroEvento | null;
  convidadosLiberado: boolean;
  /** Nulo com o cadastro de convidados fechado. */
  convites: ConviteDoLink[] | null;
  /** Prazo de confirmação e data de envio do evento, `aaaa-mm-dd` (SPEC-059 §6.5); nulos com os convidados fechados. */
  prazoRsvp: string | null;
  dataEnvioConvites: string | null;
}

/** Endereço que a organizadora passa ao cliente. */
export function enderecoDoLinkCliente(origem: string, token: string): string {
  return `${origem}/cliente/${token}`;
}

/** Link do cliente: gestão pela organizadora e acesso público do cliente (SPEC-046). */
@Injectable({ providedIn: 'root' })
export class LinkClienteClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // ---- Organizadora ----

  link(eventoId: string) {
    return this.http.get<LinkCliente>(this.url(eventoId));
  }

  /** Gera o link ou, se já existe, troca o código. */
  gerar(eventoId: string) {
    return this.http.post<LinkCliente>(this.url(eventoId), null);
  }

  /** Liga ou desliga cada área do link; as duas marcações vão juntas. */
  liberar(eventoId: string, marcacoes: { financeiroLiberado: boolean; convidadosLiberado: boolean }) {
    return this.http.put<LinkCliente>(this.url(eventoId), marcacoes);
  }

  desativar(eventoId: string) {
    return this.http.delete<LinkCliente>(this.url(eventoId));
  }

  private url(eventoId: string) {
    return `${this.base}/api/v1/eventos/${eventoId}/link-cliente`;
  }

  // ---- Cliente (sem login) ----

  obter(token: string) {
    return this.http.get<PaginaClienteLeitura>(this.publico(token));
  }

  criarConvite(token: string, pedido: PedidoConvite) {
    return this.http.post<PaginaClienteLeitura>(`${this.publico(token)}/convites`, pedido);
  }

  atualizarConvite(token: string, conviteId: string, pedido: PedidoConvite) {
    return this.http.put<PaginaClienteLeitura>(`${this.publico(token)}/convites/${conviteId}`, pedido);
  }

  // Ferramentas da aba Convidados, as mesmas da organizadora (SPEC-059 §6.5).

  definirPrazoRsvp(token: string, prazo: string | null) {
    return this.http.put<PaginaClienteLeitura>(`${this.publico(token)}/prazo-rsvp`, { prazo });
  }

  definirEnvioConvites(token: string, data: string | null) {
    return this.http.put<PaginaClienteLeitura>(`${this.publico(token)}/envio-convites`, { data });
  }

  presencas(token: string) {
    return this.http.get<PresencaEvento[]>(`${this.publico(token)}/presencas`);
  }

  planilha(token: string) {
    return this.http.get(`${this.publico(token)}/convites/planilha`, { responseType: 'blob' });
  }

  importar(token: string, arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<ImportacaoConvidados>(`${this.publico(token)}/convites/importar`, dados);
  }

  importacoes(token: string) {
    return this.http.get<ImportacaoConvidados[]>(`${this.publico(token)}/convites/importacoes`);
  }

  parcelar(token: string, servicoId: string, pedido: PedidoParcelamentoPagamento) {
    return this.http.put<PaginaClienteLeitura>(`${this.pagamento(token, servicoId)}/parcelamento`, pedido);
  }

  removerParcelamento(token: string, servicoId: string) {
    return this.http.delete<PaginaClienteLeitura>(`${this.pagamento(token, servicoId)}/parcelamento`);
  }

  marcarPagamento(token: string, servicoId: string, pago: boolean) {
    return this.http.put<PaginaClienteLeitura>(`${this.pagamento(token, servicoId)}/pago`, { pago });
  }

  marcarParcela(token: string, servicoId: string, parcelaId: string, pago: boolean) {
    return this.http.put<PaginaClienteLeitura>(`${this.pagamento(token, servicoId)}/parcelas/${parcelaId}/pago`, { pago });
  }

  /** Comprovante da parcela, ou do pagamento quando `parcelaId` é nulo. */
  enviarComprovante(token: string, servicoId: string, parcelaId: string | null, arquivo: File) {
    return this.http.post<PaginaClienteLeitura>(this.comprovante(token, servicoId, parcelaId), this.formulario(arquivo));
  }

  excluirComprovante(token: string, servicoId: string, parcelaId: string | null) {
    return this.http.delete<PaginaClienteLeitura>(this.comprovante(token, servicoId, parcelaId));
  }

  enviarContratoAssinado(token: string, servicoId: string, arquivo: File) {
    return this.http.post<PaginaClienteLeitura>(`${this.pagamento(token, servicoId)}/contrato-assinado`, this.formulario(arquivo));
  }

  excluirContratoAssinado(token: string, servicoId: string) {
    return this.http.delete<PaginaClienteLeitura>(`${this.pagamento(token, servicoId)}/contrato-assinado`);
  }

  baixarArquivo(token: string, arquivoId: string) {
    return this.http.get(`${this.publico(token)}/arquivos/${arquivoId}`, { responseType: 'blob' });
  }

  private publico(token: string) {
    return `${this.base}/api/v1/publico/cliente/${token}`;
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
