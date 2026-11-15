import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel } from '@angular/material/snack-bar';

@Component({
  selector: 'app-toast-aviso',
  imports: [MatButtonModule, MatIconModule, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
    }
  `,
  template: `
    <span matSnackBarLabel>{{ mensagem }}</span>
    <span matSnackBarActions>
      <button mat-icon-button type="button" matSnackBarAction aria-label="Fechar aviso">
        <mat-icon>close</mat-icon>
      </button>
    </span>
  `,
})
export class ToastAviso {
  protected readonly mensagem = inject<string>(MAT_SNACK_BAR_DATA);
}
