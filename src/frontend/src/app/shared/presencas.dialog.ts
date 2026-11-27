import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { PresencaEvento } from '../core/negocio.client';
import { FecharModal } from './fechar-modal';

/** Lista de presença do evento (SPEC-054 e SPEC-058), igual na organizadora e no link do cliente. */
@Component({
  selector: 'app-presencas-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule, DatePipe],
  template: `
    <h2 mat-dialog-title>Lista de presença <app-fechar-modal /></h2>
    <mat-dialog-content>
      @if (presencas.length === 0) {
        <p>Ninguém confirmou ainda.</p>
      } @else {
        <table class="w-full text-sm">
          <thead><tr><th class="text-start">Id</th><th class="text-start">Convidado</th><th class="text-start">Convite</th><th class="text-start">Confirmou em</th><th class="text-start">Compareceu</th></tr></thead>
          <tbody>
            @for (item of presencas; track item.id) {
              <tr>
                <td class="font-mono text-xs" [attr.title]="item.id">{{ item.id.slice(0, 8) }}</td>
                <td>{{ item.convidado }}</td>
                <td>{{ item.convite }}</td>
                <td>{{ item.confirmadoEm | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ item.compareceuEm ? (item.compareceuEm | date: 'dd/MM/yyyy HH:mm') : 'Não' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
})
export class PresencasDialog {
  protected readonly presencas = inject<PresencaEvento[]>(MAT_DIALOG_DATA);
}
