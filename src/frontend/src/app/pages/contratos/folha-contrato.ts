import { Component, ElementRef, afterRenderEffect, input, signal, untracked, viewChild } from '@angular/core';

/**
 * Folha do contrato (SPEC-056): apresentada como um PDF, em folhas A4 empilhadas. A logo e o título ficam no topo
 * da primeira folha e a imagem de fundo se repete, com transparência, atrás de cada folha. Serve ao Live Preview do
 * modelo (SPEC-055) e ao contrato já gerado. O HTML recebido deve vir escapado (previaDestacada ou textoEmHtml).
 * A paginação mede cada linha (separada por <br>) num medidor invisível com a largura útil da folha.
 */
@Component({
  selector: 'app-folha-contrato',
  template: `
    <div class="area">
      <div class="medidor conteudo" #medidor aria-hidden="true"></div>
      @for (pagina of paginas(); track $index; let primeira = $first, n = $index) {
        <div class="folha">
          @if (fundoUrl()) {
            <img class="fundo" [src]="fundoUrl()" alt="" aria-hidden="true" />
          }
          <div class="conteudo">
            @if (primeira) {
              @if (logoUrl()) {
                <img class="logo" [src]="logoUrl()" alt="Logo" />
              }
              <h3 class="titulo">{{ titulo() }}</h3>
            }
            @for (linha of pagina; track $index) {
              <div class="linha" [innerHTML]="linha"></div>
            }
          </div>
          <span class="numero">{{ n + 1 }} / {{ paginas().length }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .area { position: relative; overflow: auto; max-height: 70vh; padding: 16px; background: var(--mat-sys-surface-container-high, #e5e5e5); border-radius: var(--mat-sys-corner-small); display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .folha { position: relative; flex: none; width: 595px; height: 842px; overflow: hidden; background: #fff; color: #1a1a1a; box-shadow: 0 2px 8px rgb(0 0 0 / 20%); }
    .conteudo { position: relative; box-sizing: border-box; width: 595px; padding: 51px; font-family: Georgia, 'Times New Roman', serif; font-size: 12px; line-height: 1.6; white-space: normal; overflow-wrap: anywhere; }
    .medidor { position: absolute; left: 0; top: 0; visibility: hidden; pointer-events: none; }
    .linha, .medidor ::ng-deep .linha { min-height: 1.6em; }
    .medidor ::ng-deep .logo { display: block; margin: 0 auto 12px; height: 80px; }
    .medidor ::ng-deep .titulo { font-size: 14px; font-weight: 700; margin: 0 0 16px; }
    .fundo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.18; pointer-events: none; }
    .logo { display: block; margin: 0 auto 12px; max-width: 200px; height: 80px; object-fit: contain; }
    .titulo { text-align: center; font-size: 14px; font-weight: 700; margin: 0 0 16px; }
    .numero { position: absolute; bottom: 20px; right: 51px; font: 10px Georgia, serif; color: #777; }
    .conteudo ::ng-deep mark { background: color-mix(in oklab, var(--mat-sys-primary) 18%, transparent); color: inherit; border-radius: 4px; padding: 0 2px; }
    .conteudo ::ng-deep mark.desconhecida { background: #fde68a; }
  `,
})
export class FolhaContrato {
  readonly titulo = input('Contrato');
  readonly html = input('');
  readonly logoUrl = input<string | null>(null);
  readonly fundoUrl = input<string | null>(null);

  /** Linhas de HTML de cada folha. */
  protected readonly paginas = signal<string[][]>([[]]);
  private readonly medidor = viewChild.required<ElementRef<HTMLDivElement>>('medidor');

  /** Altura útil da folha A4 (842px) menos as margens (51px em cima e embaixo). */
  private static readonly ALTURA_UTIL = 842 - 2 * 51;

  constructor() {
    afterRenderEffect({
      read: () => {
        const linhas = this.html().split(/<br\s*\/?>/i);
        const el = this.medidor().nativeElement;
        const cabecalho = (this.logoUrl() ? '<img class="logo" alt="">' : '') + `<h3 class="titulo">x</h3>`;
        el.innerHTML = cabecalho + linhas.map((linha) => `<div class="linha">${linha}</div>`).join('');
        const filhos = Array.from(el.children) as HTMLElement[];
        const topoLinhas = filhos.length > linhas.length ? filhos[filhos.length - linhas.length].offsetTop : 0;
        const inicio = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetTop : 0;
        const divs = filhos.slice(filhos.length - linhas.length);
        const paginas: string[][] = [[]];
        let usado = topoLinhas - inicio;
        divs.forEach((div, i) => {
          const altura = div.offsetHeight;
          if (usado + altura > FolhaContrato.ALTURA_UTIL && paginas[paginas.length - 1].length > 0) {
            paginas.push([]);
            usado = 0;
          }
          paginas[paginas.length - 1].push(linhas[i]);
          usado += altura;
        });
        el.innerHTML = '';
        if (JSON.stringify(paginas) !== JSON.stringify(untracked(this.paginas))) {
          this.paginas.set(paginas);
        }
      },
    });
  }
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
