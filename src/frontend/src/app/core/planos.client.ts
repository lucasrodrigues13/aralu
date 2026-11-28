import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export interface RecursoDoPlano {
  recurso: string;
  limite: number | null;
}

export interface Plano {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valorMensal: number;
  publico: boolean;
  padrao: boolean;
  ativo: boolean;
  ordem: number;
  contas: number;
  recursos: RecursoDoPlano[];
}

export type SalvarPlano = Omit<Plano, 'id' | 'contas'>;

export interface Alteracao {
  tipo: string;
  planoAnterior: string | null;
  planoNovo: string | null;
  valorAnterior: number | null;
  valorNovo: number | null;
  detalhe: string | null;
  motivo: string;
  feitoPor: string;
  feitoEm: string;
}

export interface ContaAssinatura {
  contaId: string;
  situacao: string;
  planoId: string;
  plano: string;
  valorDoPlano: number;
  valorCobrado: number;
  valorPersonalizado: number | null;
  descontoPercentual: number | null;
  descontoAte: string | null;
  trialTerminaEm: string;
  proximoVencimento: string | null;
  assinada: boolean;
  historico: Alteracao[];
}

/** Recursos que um plano pode liberar (SPEC-062 §9). A lista é a do servidor. */
export const RECURSOS_PLANO: { recurso: string; rotulo: string }[] = [
  { recurso: 'LigacoesIa', rotulo: 'Ligações com IA (minutos/mês)' },
  { recurso: 'MensagensIa', rotulo: 'Mensagens com IA (por mês)' },
  { recurso: 'Integracoes', rotulo: 'Integrações' },
];

/** Planos (SPEC-062 parte D): catálogo do Admin e escolha do Dono ao assinar. */
@Injectable({ providedIn: 'root' })
export class PlanosClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  listar() {
    return this.http.get<Plano[]>(`${this.base}/api/v1/admin/planos`);
  }

  criar(plano: SalvarPlano) {
    return this.http.post<Plano>(`${this.base}/api/v1/admin/planos`, plano);
  }

  atualizar(id: string, plano: SalvarPlano) {
    return this.http.put<Plano>(`${this.base}/api/v1/admin/planos/${id}`, plano);
  }

  conta(contaId: string) {
    return this.http.get<ContaAssinatura>(`${this.base}/api/v1/admin/contas/${contaId}/assinatura`);
  }

  ajustar(contaId: string, tipo: 'plano' | 'valor' | 'desconto' | 'trial', pedido: Record<string, unknown>) {
    return this.http.post<ContaAssinatura>(`${this.base}/api/v1/admin/contas/${contaId}/assinatura/${tipo}`, pedido);
  }

  /** Planos que o Dono pode assinar: os públicos, ou só o atribuído pelo Admin. */
  paraAssinar() {
    return this.http.get<Plano[]>(`${this.base}/api/v1/assinatura/planos`);
  }
}
