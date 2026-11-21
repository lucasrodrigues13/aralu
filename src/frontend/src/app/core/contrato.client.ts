import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export interface CampoMesclagem {
  marca: string;
  rotulo: string;
  fonte: string;
  exemplo: string;
}

export interface ContratoResumo {
  id: string;
  nome: string;
  atualizadoEm: string;
}

export interface Contrato extends ContratoResumo {
  texto: string;
}

/** Contratos da conta, sem vínculo com modelo nem evento (SPEC-030 v3). */
@Injectable({ providedIn: 'root' })
export class ContratoClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  campos() {
    return this.http.get<{ campos: CampoMesclagem[] }>(`${this.base}/api/v1/contratos/campos`);
  }

  listar() {
    return this.http.get<ContratoResumo[]>(`${this.base}/api/v1/contratos`);
  }

  obter(id: string) {
    return this.http.get<Contrato>(`${this.base}/api/v1/contratos/${id}`);
  }

  salvar(id: string | null, pedido: { nome: string; texto: string }) {
    return id
      ? this.http.put<Contrato>(`${this.base}/api/v1/contratos/${id}`, pedido)
      : this.http.post<Contrato>(`${this.base}/api/v1/contratos`, pedido);
  }

  excluir(id: string) {
    return this.http.delete(`${this.base}/api/v1/contratos/${id}`);
  }
}
