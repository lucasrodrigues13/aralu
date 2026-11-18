import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
} from '@angular/material/snack-bar';

/** Aviso do design system (5.14): ícone do tipo, mensagem e X. */
@Component({
  selector: 'app-toast-aviso',
  imports: [MatButtonModule, MatIconModule, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      padding-left: 14px;
    }
    .gd-toast-icone {
      flex-shrink: 0;
    }
    [matSnackBarLabel] {
      flex: 1;
    }
  `,
  template: `
    <mat-icon class="gd-toast-icone">{{ erro ? 'error' : 'check_circle' }}</mat-icon>
    <span matSnackBarLabel>{{ mensagem }}</span>
    <span matSnackBarActions>
      <button mat-icon-button type="button" matSnackBarAction aria-label="Fechar aviso">
        <mat-icon>close</mat-icon>
      </button>
    </span>
  `,
})
export class ToastAviso {
  private readonly dados = inject<{ mensagem: string; erro: boolean }>(MAT_SNACK_BAR_DATA);
  protected readonly mensagem = this.dados.mensagem;
  protected readonly erro = this.dados.erro;
}
