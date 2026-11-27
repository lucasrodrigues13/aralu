import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FecharModal } from './fechar-modal';

export interface ConfirmaDados {
  titulo: string;
  texto: string;
  confirmar: string;
  destrutivo?: boolean;
}

@Component({
  selector: 'app-confirma-dialog',
  imports: [MatDialogModule, MatButtonModule, FecharModal],
  template: `
    <h2 mat-dialog-title>{{ dados.titulo }} <app-fechar-modal [manual]="true" (fechar)="ref.close(false)" /></h2>
    <mat-dialog-content>{{ dados.texto }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(false)">Cancelar</button>
      <button mat-flat-button type="button" [class.botao-perigo]="dados.destrutivo" (click)="ref.close(true)">{{ dados.confirmar }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmaDialog {
  protected readonly dados = inject<ConfirmaDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ConfirmaDialog, boolean>);
}
