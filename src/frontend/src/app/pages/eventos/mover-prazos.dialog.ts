import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

/** true = mover, false = manter, undefined = cancelar (SPEC-012 §6.6). */
@Component({
  selector: 'app-mover-prazos',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Data do evento alterada</h2>
    <mat-dialog-content>
      Mover os prazos das tarefas não concluídas junto com a data?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close(undefined)">Cancelar</button>
      <button mat-stroked-button type="button" (click)="ref.close(false)">Manter</button>
      <button mat-flat-button type="button" (click)="ref.close(true)">Mover</button>
    </mat-dialog-actions>
  `,
})
export class MoverPrazosDialog {
  protected readonly ref = inject(MatDialogRef<MoverPrazosDialog, boolean | undefined>);
}
