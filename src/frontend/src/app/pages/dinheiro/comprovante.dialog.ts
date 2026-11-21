import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { validarComprovante } from '../../core/dinheiro.client';

/** Envio de comprovante: JPG, JPEG, PNG ou PDF até 5 MB (SPEC-043 §6.4). */
@Component({
  selector: 'app-comprovante-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ dados?.titulo ?? "Enviar comprovante" }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">JPG, JPEG, PNG ou PDF de até 5 MB. Fotos são reduzidas ao guardar, sem perder a leitura.</p>
    <mat-dialog-content>
      <form id="comprovante" class="grid grid-cols-1 gap-4" (submit)="enviar(); $event.preventDefault()">
        <label class="arquivo flex flex-col gap-2 font-semibold">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" (change)="escolher($event)" />
        </label>
        @if (erro()) { <p class="text-error text-xs">{{ erro() }}</p> }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="comprovante" [disabled]="!arquivo()">Enviar</button>
    </mat-dialog-actions>
  `,
})
export class ComprovanteDialog {
  protected readonly dados = inject<{ titulo?: string } | null>(MAT_DIALOG_DATA, { optional: true });
  protected readonly ref = inject(MatDialogRef<ComprovanteDialog, File>);
  protected readonly arquivo = signal<File | null>(null);
  protected readonly erro = signal('');

  protected escolher(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const problema = arquivo ? validarComprovante(arquivo) : null;
    this.erro.set(problema ?? '');
    this.arquivo.set(problema ? null : arquivo);
  }

  protected enviar(): void {
    const arquivo = this.arquivo();
    if (!arquivo) {
      this.erro.set('Escolha o arquivo.');
      return;
    }
    this.ref.close(arquivo);
  }
}
