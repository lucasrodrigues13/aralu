import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export interface CampoMesclagem {
  marca: string;
  rotulo: string;
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

export interface ContratoEvento {
  id: string;
  nome: string;
  ultimoEnvio: string | null;
  expiraEm: string | null;
  enviadoPara: string | null;
}

export interface ContratosEvento {
  emailCliente: string | null;
  contratos: ContratoEvento[];
}

export interface ContratoPreenchido {
  id: string;
  nome: string;
  texto: string;
  empresa: string | null;
}

export interface ContratoPublico {
  nome: string;
  texto: string;
  empresa: string | null;
  expiraEm: string;
}

/** Contratos da conta, do modelo e do evento (SPEC-030 v2). */
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

  doModelo(modeloId: string) {
    return this.http.get<string[]>(`${this.base}/api/v1/modelos/${modeloId}/contratos`);
  }

  vincularAoModelo(modeloId: string, contratoIds: string[]) {
    return this.http.put<string[]>(`${this.base}/api/v1/modelos/${modeloId}/contratos`, { contratoIds });
  }

  doEvento(eventoId: string) {
    return this.http.get<ContratosEvento>(`${this.base}/api/v1/eventos/${eventoId}/contratos`);
  }

  adicionarAoEvento(eventoId: string, contratoId: string) {
    return this.http.post<ContratosEvento>(`${this.base}/api/v1/eventos/${eventoId}/contratos/${contratoId}`, {});
  }

  removerDoEvento(eventoId: string, contratoId: string) {
    return this.http.delete<ContratosEvento>(`${this.base}/api/v1/eventos/${eventoId}/contratos/${contratoId}`);
  }

  preenchido(eventoId: string, contratoId: string) {
    return this.http.get<ContratoPreenchido>(`${this.base}/api/v1/eventos/${eventoId}/contratos/${contratoId}/texto`);
  }

  enviar(eventoId: string, contratoId: string) {
    return this.http.post<{ email: string; expiraEm: string }>(`${this.base}/api/v1/eventos/${eventoId}/contratos/${contratoId}/enviar`, {});
  }

  publico(token: string) {
    return this.http.get<ContratoPublico>(`${this.base}/api/v1/publico/contratos/${token}`);
  }
}
