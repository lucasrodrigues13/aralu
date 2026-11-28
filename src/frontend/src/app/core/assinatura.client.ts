import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export interface SituacaoAssinatura {
  situacao: 'Trial' | 'Ativa' | 'EmAtraso' | 'Cancelada' | 'Expirada' | 'Bloqueada';
  liberada: boolean;
  diasRestantesTrial: number;
  trialTerminaEm: string;
  proximoVencimento: string | null;
  pagoAte: string | null;
  plano: string;
  valor: number;
  formaPagamento: 'Cartao' | 'Pix' | null;
  /** Já existe assinatura no Asaas (paga ou aguardando o primeiro pagamento). */
  assinada: boolean;
  /** Staging: a API devolve o passo a passo das chamadas ao Asaas para o console do navegador. */
  diagnosticoNoNavegador: boolean;
  /** SPEC-065: upgrade esperando pagamento ou downgrade agendado. */
  trocaPendente: TrocaPendente | null;
}

export interface TrocaPendente {
  tipo: 'Upgrade' | 'Downgrade';
  plano: string;
  valor: number | null;
  aplicaEm: string | null;
  linkPagamento: string | null;
}

/** Um plano para o qual a conta pode trocar, com o valor calculado pela API (SPEC-065). */
export interface TrocaPrevia {
  planoId: string;
  plano: string;
  descricao: string | null;
  valorMensal: number;
  tipo: 'Upgrade' | 'Downgrade';
  valorAgora: number;
  credito: number;
  diasRestantes: number;
  diasDoCiclo: number;
  pagoAte: string | null;
  aplicaEm: string | null;
  novaMensalidade: number;
  recursosQueSaem: string[];
  permitida: boolean;
  motivo: string | null;
}

export interface TrocaResposta {
  tipo: 'Upgrade' | 'Downgrade';
  plano: string;
  valorAgora: number;
  linkPagamento: string | null;
  aplicaEm: string | null;
  diagnostico: PassoAsaas[] | null;
}

/** Um passo da conversa da API com o Asaas (só no staging). A chave da API nunca vem. */
export interface PassoAsaas {
  passo: string;
  metodo: string;
  rota: string;
  status: number;
  enviado: unknown;
  resposta: unknown;
}

export interface AssinarResposta {
  linkPagamento: string | null;
  vencimento: string;
  valor: number;
  diagnostico: PassoAsaas[] | null;
}

export interface Fatura {
  vencimento: string;
  valor: number;
  status: string;
  formaPagamento: string | null;
  pagaEm: string | null;
  link: string | null;
}

export interface EventoAsaas {
  tipo: string;
  recebidoEm: string;
  processadoEm: string | null;
  erro: string | null;
  payload: unknown;
}

/** Escreve no console do DevTools o passo a passo das chamadas ao Asaas (staging). */
export function registrarNoConsole(titulo: string, passos: PassoAsaas[] | null | undefined): void {
  if (!passos?.length) return;
  console.groupCollapsed(`[Asaas] ${titulo} — ${passos.length} chamada(s)`);
  for (const p of passos) {
    const estilo = p.status >= 400 ? 'color:#c0392b;font-weight:bold' : 'color:#12a150;font-weight:bold';
    console.groupCollapsed(`%c${p.status}%c ${p.metodo} ${p.rota} — ${p.passo}`, estilo, '');
    console.log('Enviado:', p.enviado);
    console.log('Resposta:', p.resposta);
    console.groupEnd();
  }
  console.groupEnd();
}

/** Assinatura da conta (SPEC-062 parte B). */
@Injectable({ providedIn: 'root' })
export class AssinaturaClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  situacao() {
    return this.http.get<SituacaoAssinatura | null>(`${this.base}/api/v1/assinatura`);
  }

  assinar(pedido: { documento: string; nomeCobranca: string; formaPagamento: 'pix' | 'cartao'; planoId?: string | null }) {
    return this.http.post<AssinarResposta>(`${this.base}/api/v1/assinatura/assinar`, pedido);
  }

  /** Cancelou e ainda está no período pago: volta a recorrência sem cobrar agora. */
  reativar() {
    return this.http.post<AssinarResposta>(`${this.base}/api/v1/assinatura/reativar`, null);
  }

  cancelar() {
    return this.http.post<{ mensagem: string; diagnostico: PassoAsaas[] | null }>(`${this.base}/api/v1/assinatura/cancelar`, null);
  }

  /** SPEC-065: planos para trocar, com o valor do upgrade ou a data do downgrade. */
  trocas() {
    return this.http.get<TrocaPrevia[]>(`${this.base}/api/v1/assinatura/trocas`);
  }

  trocarPlano(planoId: string) {
    return this.http.post<TrocaResposta>(`${this.base}/api/v1/assinatura/trocar-plano`, { planoId });
  }

  /** Desiste do upgrade pendente ou mantém o plano atual no downgrade agendado. */
  desistirTroca() {
    return this.http.post<{ diagnostico: PassoAsaas[] | null }>(`${this.base}/api/v1/assinatura/desistir-troca`, null);
  }

  faturas() {
    return this.http.get<Fatura[]>(`${this.base}/api/v1/assinatura/faturas`);
  }

  /** Avisos do Asaas que chegaram para a conta (só no staging). */
  eventos() {
    return this.http.get<EventoAsaas[]>(`${this.base}/api/v1/assinatura/diagnostico`);
  }
}
