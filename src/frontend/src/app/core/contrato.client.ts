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
  /** Logo (topo) e imagem de fundo do modelo, no armazenamento de arquivos (SPEC-056). */
  logoArquivoId?: string | null;
  fundoArquivoId?: string | null;
}

/** Imagem de modelo: logo (topo do contrato) ou fundo da folha. */
export type ImagemDoModelo = 'logo' | 'fundo';

/** Formatos e tamanho aceitos para a logo e o fundo (SPEC-056 §17): os do armazenamento de imagens. */
export const IMAGEM_MODELO_ACEITA = 'image/jpeg,image/png,image/webp';
export const IMAGEM_MODELO_MAX_BYTES = 5 * 1024 * 1024;

export function imagemModeloValida(arquivo: { type: string; size: number }): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > IMAGEM_MODELO_MAX_BYTES) {
    return 'A imagem não foi aceita. Use JPG, PNG ou WebP de até 5 MB.';
  }
  return null;
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

  enviarImagem(id: string, qual: ImagemDoModelo, arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<{ arquivoId: string }>(`${this.base}/api/v1/contratos/${id}/${qual}`, dados);
  }

  removerImagem(id: string, qual: ImagemDoModelo) {
    return this.http.delete(`${this.base}/api/v1/contratos/${id}/${qual}`);
  }
}
