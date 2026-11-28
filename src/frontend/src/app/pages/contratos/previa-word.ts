import { Component, ElementRef, effect, input, signal, viewChild } from '@angular/core';
import { ajustarPaginasWord } from './paginacao-word';

/** Mede só depois que as imagens carregarem, para a altura de cada bloco estar certa. */
function esperarImagens(el: HTMLElement): Promise<unknown> {
  const pendentes = Array.from(el.querySelectorAll('img')).filter((img) => !img.complete);
  return Promise.all(pendentes.map((img) => new Promise((ok) => { img.onload = img.onerror = ok; })));
}

/**
 * Live Preview do modelo Word: desenha o .docx (já com os exemplos no lugar das tags, destacados em amarelo)
 * em folhas, com cabeçalho e rodapé, como o Word mostraria. Recebe o documento em base64.
 */
@Component({
  selector: 'app-previa-word',
  template: `
    <div class="area" [class.ampliada]="ampliada()">
      @if (erro()) {
        <p class="erro" role="alert">{{ erro() }}</p>
      }
      <div #destino class="destino"></div>
    </div>
  `,
  styles: `
    .area { overflow: auto; max-height: 70vh; padding: 16px; background: var(--mat-sys-surface-container-high, #e5e5e5); border-radius: var(--mat-sys-corner-small); }
    .area.ampliada { max-height: none; height: 100%; box-sizing: border-box; }
    .destino ::ng-deep .docx-wrapper { background: transparent; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .destino ::ng-deep .docx-wrapper > section.docx { box-shadow: 0 2px 8px rgb(0 0 0 / 20%); margin: 0; flex: none; }
    .erro { margin: 0 0 8px; font-size: 12px; color: #92400e; }
  `,
})
export class PreviaWordComponent {
  /** Documento .docx em base64 ou em bytes. */
  readonly documento = input<string | ArrayBuffer | null>(null);
  /** No modal grande a área ocupa toda a altura disponível. */
  readonly ampliada = input(false);
  protected readonly erro = signal('');
  private readonly destino = viewChild.required<ElementRef<HTMLDivElement>>('destino');

  constructor() {
    effect(() => {
      const base64 = this.documento();
      const el = this.destino().nativeElement;
      void this.desenhar(base64, el);
    });
  }

  private async desenhar(documento: string | ArrayBuffer | null, el: HTMLElement): Promise<void> {
    el.innerHTML = '';
    this.erro.set('');
    if (!documento) return;
    try {
      const bytes = typeof documento === 'string' ? Uint8Array.from(atob(documento), (c) => c.charCodeAt(0)).buffer : documento;
      const { renderAsync } = await import('docx-preview');
      await renderAsync(bytes, el, undefined, {
        inWrapper: true,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        ignoreLastRenderedPageBreak: true,
        useBase64URL: true,
      });
      await esperarImagens(el);
      ajustarPaginasWord(el);
    } catch {
      this.erro.set('Não foi possível mostrar este documento. Confira se ele abre normalmente no Word.');
    }
  }
}
