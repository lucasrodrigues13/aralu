import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarLabel, MatSnackBarRef } from '@angular/material/snack-bar';

/** Aviso do design system (5.14): ícone do tipo, mensagem e X. */
@Component({
  selector: 'app-toast-aviso',
  imports: [MatButtonModule, MatIconModule, MatSnackBarLabel],
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
      padding: 12px 8px 12px 16px;
    }
    .toast-icone {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .toast-texto {
      flex: 1;
      min-width: 0;
      padding: 0 !important;
      font-size: 14px;
      line-height: 20px;
      overflow-wrap: anywhere;
    }
    .toast-fechar {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin: -2px 0 0;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--mat-sys-surface-container-lowest);
      cursor: pointer;
    }
    .toast-fechar:hover {
      background: var(--mat-sys-surface-bright);
      color: var(--mat-sys-on-background);
    }
    .toast-fechar mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
  `,
  template: `
    <mat-icon class="toast-icone">{{ erro ? 'error' : 'check_circle' }}</mat-icon>
    <span class="toast-texto" matSnackBarLabel>{{ mensagem }}</span>
    <button class="toast-fechar" type="button" aria-label="Fechar aviso" (click)="fechar()">
      <mat-icon>close</mat-icon>
    </button>
  `,
})
export class ToastAviso {
  private readonly dados = inject<{ mensagem: string; erro: boolean }>(MAT_SNACK_BAR_DATA);
  private readonly ref = inject(MatSnackBarRef<ToastAviso>);
  protected readonly mensagem = this.dados.mensagem;
  protected readonly erro = this.dados.erro;

  protected fechar(): void {
    this.ref.dismiss();
  }
}
