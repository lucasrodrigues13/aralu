import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export interface ConvidadoPortaria {
  id: string;
  nome: string;
  situacao: string;
  confirmado: boolean;
  /** Quando a portaria marcou a presença; nulo = ainda não entrou. */
  compareceuEm: string | null;
}

export interface ConvitePortaria {
  id: string;
  nome: string;
  convidados: ConvidadoPortaria[];
}

/** Tela da portaria: totais e a lista completa dos convites com ao menos um confirmado. */
export interface PortariaLeitura {
  evento: string;
  data: string | null;
  confirmados: number;
  compareceram: number;
  convites: ConvitePortaria[];
}

/** Texto que o QR de entrada carrega (o código do convite com este prefixo). */
export const PREFIXO_QR_ENTRADA = 'entrada:';

/** Portaria pelo link da pessoa da equipe (SPEC-058 e SPEC-067): a sessão do código vai no cookie. */
@Injectable({ providedIn: 'root' })
export class PortariaClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  ler(token: string) {
    return this.http.get<PortariaLeitura>(this.publico(token));
  }

  /** Abre o convite do texto lido no QR. */
  lerPeloQr(token: string, texto: string) {
    return this.http.get<ConvitePortaria>(`${this.publico(token)}/qr/${encodeURIComponent(texto)}`);
  }

  convite(token: string, conviteId: string) {
    return this.http.get<ConvitePortaria>(`${this.publico(token)}/convites/${conviteId}`);
  }

  /** Marca quem do convite compareceu; os confirmados fora da lista voltam a "não entrou". */
  marcar(token: string, conviteId: string, compareceram: string[]) {
    return this.http.put<ConvitePortaria>(`${this.publico(token)}/convites/${conviteId}/comparecimento`, { compareceram });
  }

  private publico(token: string) {
    return `${this.base}/api/v1/publico/equipe/${encodeURIComponent(token)}/portaria`;
  }
}
