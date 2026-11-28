import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { NegocioClient } from '../../core/negocio.client';

export interface PreviaArquivo {
  url: string;
  pdf: boolean;
}

/**
 * Baixa (com o token da sessão) os arquivos da galeria e guarda um endereço local para cada um, liberado quando o
 * componente que forneceu o serviço some.
 */
@Injectable()
export class PreviasArquivo {
  private readonly negocio = inject(NegocioClient);
  readonly previas = signal<Record<string, PreviaArquivo>>({});
  private readonly pedidos = new Set<string>();

  constructor() {
    inject(DestroyRef).onDestroy(() => Object.values(this.previas()).forEach((previa) => URL.revokeObjectURL(previa.url)));
  }

  carregar(arquivoId: string): void {
    if (this.pedidos.has(arquivoId)) {
      return;
    }
    this.pedidos.add(arquivoId);
    this.negocio.baixarArquivo(arquivoId).subscribe({
      next: (blob) => this.guardar(arquivoId, blob),
      error: () => this.pedidos.delete(arquivoId),
    });
  }

  guardar(arquivoId: string, blob: Blob): void {
    this.pedidos.add(arquivoId);
    const previa = { url: URL.createObjectURL(blob), pdf: blob.type === 'application/pdf' };
    this.previas.update((atual) => ({ ...atual, [arquivoId]: previa }));
  }
}
