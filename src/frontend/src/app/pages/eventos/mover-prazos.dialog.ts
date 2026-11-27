import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FecharModal } from '../../shared/fechar-modal';

/** true = mover, false = manter, undefined = cancelar (SPEC-012 §6.6). */
@Component({
  selector: 'app-mover-prazos',
  imports: [FecharModal, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Data do evento alterada <app-fechar-modal [manual]="true" (fechar)="ref.close(undefined)" /></h2>
    <mat-dialog-content>
      Mover os prazos com data exata das tarefas não concluídas junto com a data? Os prazos relativos ao evento acompanham a data sozinhos.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(undefined)">Cancelar</button>
      <button mat-stroked-button type="button" (click)="ref.close(false)">Manter</button>
      <button mat-flat-button type="button" (click)="ref.close(true)">Mover</button>
    </mat-dialog-actions>
  `,
})
export class MoverPrazosDialog {
  protected readonly ref = inject(MatDialogRef<MoverPrazosDialog, boolean | undefined>);
}
