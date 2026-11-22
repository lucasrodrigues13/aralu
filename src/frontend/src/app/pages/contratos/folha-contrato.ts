import { Component, input } from '@angular/core';

/**
 * Folha do contrato (SPEC-056): logo centralizada no topo, título, texto e, atrás de tudo, a imagem de fundo
 * cobrindo a folha com transparência para o texto continuar legível. Serve ao Live Preview do modelo (SPEC-055)
 * e ao contrato já gerado. O HTML recebido deve vir escapado (previaDestacada ou textoEmHtml).
 */
@Component({
  selector: 'app-folha-contrato',
  template: `
    <div class="folha">
      @if (fundoUrl()) {
        <img class="fundo" [src]="fundoUrl()" alt="" aria-hidden="true" />
      }
      <div class="conteudo">
        @if (logoUrl()) {
          <img class="logo" [src]="logoUrl()" alt="Logo" />
        }
        <h3 class="titulo">{{ titulo() }}</h3>
        <div [innerHTML]="html()"></div>
      </div>
    </div>
  `,
  styles: `
    .folha { position: relative; overflow: auto; min-height: 360px; max-height: 60vh; background: #fff; color: #1a1a1a; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-small); box-shadow: 0 1px 4px rgb(0 0 0 / 12%); font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.6; white-space: normal; }
    .fundo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.18; pointer-events: none; }
    .conteudo { position: relative; padding: 20px 24px; }
    .logo { display: block; margin: 0 auto 12px; max-width: 200px; max-height: 80px; object-fit: contain; }
    .titulo { text-align: center; font-size: 16px; font-weight: 700; margin: 0 0 16px; }
    .conteudo ::ng-deep mark { background: color-mix(in oklab, var(--mat-sys-primary) 18%, transparent); color: inherit; border-radius: 4px; padding: 0 2px; }
    .conteudo ::ng-deep mark.desconhecida { background: #fde68a; }
  `,
})
export class FolhaContrato {
  readonly titulo = input('Contrato');
  readonly html = input('');
  readonly logoUrl = input<string | null>(null);
  readonly fundoUrl = input<string | null>(null);
}

function escaparAtributo(valor: string): string {
  return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Impressão do contrato (SPEC-056 §17): abre uma janela só com a folha (logo, texto e fundo) e chama a impressão.
 * O fundo sai impresso (print-color-adjust). As URLs são blob: do próprio app; `html` já vem escapado.
 */
export function imprimirContrato(titulo: string, html: string, logoUrl: string | null, fundoUrl: string | null): void {
  const janela = window.open('', '_blank');
  if (!janela) {
    return;
  }
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparAtributo(titulo)}</title>
<style>
  @page { margin: 18mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; }
  .fundo { position: fixed; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.18; z-index: -1; }
  .logo { display: block; margin: 0 auto 12px; max-width: 200px; max-height: 80px; object-fit: contain; }
  h1 { text-align: center; font-size: 14pt; margin: 0 0 16px; }
</style></head><body>
${fundoUrl ? `<img class="fundo" src="${escaparAtributo(fundoUrl)}" alt="">` : ''}
${logoUrl ? `<img class="logo" src="${escaparAtributo(logoUrl)}" alt="Logo">` : ''}
<h1>${escaparAtributo(titulo)}</h1>
<div>${html}</div>
<script>window.addEventListener('load', function () { window.print(); });</script>
</body></html>`);
  janela.document.close();
}
