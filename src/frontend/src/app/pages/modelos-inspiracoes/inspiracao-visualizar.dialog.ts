import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Inspiracao } from '../../core/negocio.client';
import { PreviasArquivo } from './previas-arquivo';
import { FecharModal } from '../../shared/fechar-modal';
import { Estado } from '../../shared/estado';

/** Visualização da galeria: carrossel só com as fotos à esquerda e a lista de URLs à direita. */
@Component({
  selector: 'app-inspiracao-visualizar-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule, MatIconModule, Estado],
  providers: [PreviasArquivo],
  template: `
    <h2 mat-dialog-title>{{ dados.nome }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <p class="text-sm text-muted mb-3">{{ fotos.length }} {{ fotos.length === 1 ? 'imagem' : 'imagens' }} · {{ links.length }} {{ links.length === 1 ? 'link' : 'links' }}</p>
      @if (fotos.length === 0 && links.length === 0) {
        <app-estado titulo="Nenhuma imagem ou link ainda" texto="Esta galeria está vazia." />
      } @else {
        <div class="conteudo" [class.so-um]="fotos.length === 0 || links.length === 0">
          @if (fotos.length) {
            <div class="carrossel">
              <div class="palco">
                @if (atual(); as url) {
                  <img [src]="url" [alt]="'Imagem ' + (indice() + 1)" />
                } @else {
                  <span class="text-muted">Carregando…</span>
                }
                @if (fotos.length > 1) {
                  <button mat-icon-button type="button" class="seta esquerda" aria-label="Anterior" (click)="ir(-1)"><mat-icon>chevron_left</mat-icon></button>
                  <button mat-icon-button type="button" class="seta direita" aria-label="Próxima" (click)="ir(1)"><mat-icon>chevron_right</mat-icon></button>
                }
                <span class="contador">{{ indice() + 1 }} / {{ fotos.length }}</span>
              </div>
              @if (fotos.length > 1) {
                <div class="miniaturas">
                  @for (url of urlsFotos(); track $index; let i = $index) {
                    <button type="button" class="miniatura" [class.ativa]="i === indice()" [attr.aria-label]="'Ir para ' + (i + 1)" (click)="indice.set(i)">
                      @if (url) {
                        <img [src]="url" alt="" />
                      }
                    </button>
                  }
                </div>
              }
            </div>
          }
          @if (links.length) {
            <div class="links">
              <span class="titulo">Links</span>
              <div class="rolagem">
                @for (link of links; track $index) {
                  <a class="link" [href]="link" target="_blank" rel="noopener noreferrer" [title]="link">
                    <mat-icon>link</mat-icon>
                    <span class="truncate">{{ semProtocolo(link) }}</span>
                    <mat-icon class="abrir">open_in_new</mat-icon>
                  </a>
                }
              </div>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .conteudo { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 16px; align-items: start; }
    .conteudo.so-um { grid-template-columns: minmax(0, 1fr); }
    @media (max-width: 720px) { .conteudo { grid-template-columns: minmax(0, 1fr); } }
    .palco { position: relative; display: flex; align-items: center; justify-content: center; height: min(62vh, 600px); background: var(--mat-sys-surface-container); border-radius: 8px; overflow: hidden; }
    .palco img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .seta { position: absolute; top: 50%; transform: translateY(-50%); background: color-mix(in srgb, var(--mat-sys-surface) 85%, transparent); }
    .esquerda { left: 8px; }
    .direita { right: 8px; }
    .contador { position: absolute; bottom: 8px; right: 12px; font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--mat-sys-surface) 85%, transparent); }
    .miniaturas { display: flex; gap: 8px; overflow-x: auto; padding: 10px 2px 2px; }
    .miniatura { flex: none; width: 72px; height: 72px; padding: 0; border: 2px solid transparent; border-radius: 6px; overflow: hidden; cursor: pointer; background: var(--mat-sys-surface-container); opacity: .7; }
    .miniatura.ativa { border-color: var(--mat-sys-primary); opacity: 1; }
    .miniatura img { width: 100%; height: 100%; object-fit: cover; }
    .links { display: flex; flex-direction: column; border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; max-height: min(62vh, 600px); min-height: 0; }
    .titulo { font-weight: 600; font-size: 0.875rem; padding: 10px 12px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .rolagem { overflow-y: auto; min-height: 0; }
    .link { display: flex; align-items: center; gap: 8px; padding: 9px 12px; font-size: 0.8125rem; color: var(--mat-sys-primary); text-decoration: none; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .link:last-child { border-bottom: 0; }
    .link:hover { background: var(--mat-sys-surface-container); }
    .link mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-on-surface-variant); }
    .link .abrir { margin-left: auto; }
  `,
})
export class InspiracaoVisualizarDialog {
  protected readonly dados = inject<Inspiracao>(MAT_DIALOG_DATA);
  private readonly previas = inject(PreviasArquivo);
  protected readonly indice = signal(0);
  protected readonly fotos = this.dados.itens.filter((item) => item.arquivoId).map((item) => item.arquivoId!);
  protected readonly links = this.dados.itens.filter((item) => !item.arquivoId && item.url).map((item) => item.url!);

  protected readonly urlsFotos = computed(() => {
    const previas = this.previas.previas();
    return this.fotos.map((id) => previas[id]?.url ?? null);
  });

  protected readonly atual = computed(() => this.urlsFotos()[this.indice()] ?? null);

  constructor() {
    this.fotos.forEach((id) => this.previas.carregar(id));
  }

  @HostListener('document:keydown.arrowleft') protected anterior(): void {
    this.ir(-1);
  }

  @HostListener('document:keydown.arrowright') protected proxima(): void {
    this.ir(1);
  }

  protected ir(passo: number): void {
    const total = this.fotos.length;
    if (total) {
      this.indice.update((atual) => (atual + passo + total) % total);
    }
  }

  protected semProtocolo(url: string): string {
    return url.replace(/^https?:\/\/(www\.)?/i, '');
  }
}
