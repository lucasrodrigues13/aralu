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
}

/** Assinatura da conta (SPEC-062 parte B). */
@Injectable({ providedIn: 'root' })
export class AssinaturaClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  situacao() {
    return this.http.get<SituacaoAssinatura | null>(`${this.base}/api/v1/assinatura`);
  }
}
