import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer } from '@angular/platform-browser';
import { Inspiracao } from '../../core/negocio.client';
import { PreviasArquivo } from './previas-arquivo';

interface Slide {
  url: string | null;
  pdf: boolean;
}

/** Visualização da galeria: nome, quantidade e carrossel com as imagens (e PDFs) na ordem salva. */
@Component({
  selector: 'app-inspiracao-visualizar-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  providers: [PreviasArquivo],
  template: `
    <h2 mat-dialog-title>{{ dados.nome }}</h2>
    <mat-dialog-content>
      <p class="text-sm text-muted mb-3">{{ slides().length }} item(ns)</p>
      @if (slides().length === 0) {
        <p class="text-center text-muted py-10">Nenhuma imagem nesta galeria.</p>
      } @else {
        <div class="palco">
          @if (atual(); as slide) {
            @if (!slide.url) {
              <span class="text-muted">Carregando…</span>
            } @else if (slide.pdf) {
              <iframe class="pdf" [src]="seguro(slide.url)" title="PDF"></iframe>
            } @else {
              <img [src]="slide.url" [alt]="'Imagem ' + (indice() + 1)" />
            }
          }
          @if (slides().length > 1) {
            <button mat-icon-button type="button" class="seta esquerda" aria-label="Anterior" (click)="ir(-1)"><mat-icon>chevron_left</mat-icon></button>
            <button mat-icon-button type="button" class="seta direita" aria-label="Próxima" (click)="ir(1)"><mat-icon>chevron_right</mat-icon></button>
          }
          <span class="contador">{{ indice() + 1 }} / {{ slides().length }}</span>
        </div>
        @if (slides().length > 1) {
          <div class="miniaturas">
            @for (slide of slides(); track $index; let i = $index) {
              <button type="button" class="miniatura" [class.ativa]="i === indice()" [attr.aria-label]="'Ir para ' + (i + 1)" (click)="indice.set(i)">
                @if (slide.pdf) {
                  <mat-icon>picture_as_pdf</mat-icon>
                } @else if (slide.url) {
                  <img [src]="slide.url" alt="" />
                }
              </button>
            }
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (atual()?.url; as url) {
        <a mat-stroked-button [href]="url" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> Abrir</a>
      }
      <button mat-flat-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .palco { position: relative; display: flex; align-items: center; justify-content: center; height: min(60vh, 520px); background: var(--mat-sys-surface-container); border-radius: 8px; overflow: hidden; }
    .palco img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .pdf { width: 100%; height: 100%; border: 0; }
    .seta { position: absolute; top: 50%; transform: translateY(-50%); background: color-mix(in srgb, var(--mat-sys-surface) 85%, transparent); }
    .esquerda { left: 8px; }
    .direita { right: 8px; }
    .contador { position: absolute; bottom: 8px; right: 12px; font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--mat-sys-surface) 85%, transparent); }
    .miniaturas { display: flex; gap: 8px; overflow-x: auto; padding: 10px 2px 2px; }
    .miniatura { flex: none; width: 64px; height: 64px; padding: 0; border: 2px solid transparent; border-radius: 6px; overflow: hidden; cursor: pointer; background: var(--mat-sys-surface-container); display: flex; align-items: center; justify-content: center; opacity: .7; }
    .miniatura.ativa { border-color: var(--mat-sys-primary); opacity: 1; }
    .miniatura img { width: 100%; height: 100%; object-fit: cover; }
  `,
})
export class InspiracaoVisualizarDialog {
  protected readonly dados = inject<Inspiracao>(MAT_DIALOG_DATA);
  private readonly previas = inject(PreviasArquivo);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly indice = signal(0);

  protected readonly slides = computed<Slide[]>(() => {
    const previas = this.previas.previas();
    return this.dados.itens.map((item) => {
      if (item.arquivoId) {
        const previa = previas[item.arquivoId];
        return { url: previa?.url ?? null, pdf: previa?.pdf ?? false };
      }
      // URLs externas são exibidas só como imagem; o iframe de PDF fica restrito aos arquivos baixados (blob:).
      return { url: item.url, pdf: false };
    });
  });

  protected readonly atual = computed(() => this.slides()[this.indice()] ?? null);

  constructor() {
    this.dados.itens.forEach((item) => item.arquivoId && this.previas.carregar(item.arquivoId));
  }

  @HostListener('document:keydown.arrowleft') protected anterior(): void {
    this.ir(-1);
  }

  @HostListener('document:keydown.arrowright') protected proxima(): void {
    this.ir(1);
  }

  protected ir(passo: number): void {
    const total = this.slides().length;
    if (total) {
      this.indice.update((atual) => (atual + passo + total) % total);
    }
  }

  private readonly cacheSeguro = new Map<string, unknown>();

  protected seguro(url: string) {
    if (!this.cacheSeguro.has(url)) {
      this.cacheSeguro.set(url, this.sanitizer.bypassSecurityTrustResourceUrl(url));
    }
    return this.cacheSeguro.get(url) as ReturnType<DomSanitizer['bypassSecurityTrustResourceUrl']>;
  }
}
