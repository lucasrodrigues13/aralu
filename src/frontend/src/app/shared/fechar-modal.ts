import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/** X de fechar do topo do modal. Vai dentro do h2[mat-dialog-title]. */
@Component({
  selector: 'app-fechar-modal',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button mat-icon-button type="button" aria-label="Fechar" matTooltip="Fechar" (click)="clicar()">
      <mat-icon>close</mat-icon>
    </button>
  `,
})
export class FecharModal {
  readonly manual = input(false);
  readonly fechar = output<void>();

  private readonly ref = inject(MatDialogRef, { optional: true });

  protected clicar(): void {
    if (this.manual()) {
      this.fechar.emit();
    } else {
      this.ref?.close();
    }
  }
}
