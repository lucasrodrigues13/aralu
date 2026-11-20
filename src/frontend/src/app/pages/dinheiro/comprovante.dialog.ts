import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { validarComprovante } from '../../core/dinheiro.client';

/** Envio de comprovante: JPG, JPEG, PNG ou PDF até 5 MB (SPEC-029 §6.6). */
@Component({
  selector: 'app-comprovante-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Enviar comprovante</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">JPG, JPEG, PNG ou PDF de até 5 MB. Fotos são reduzidas ao guardar, sem perder a leitura.</p>
    <mat-dialog-content>
      <form id="comprovante" class="grid grid-cols-1 gap-4" (ngSubmit)="enviar()">
        <label class="arquivo flex flex-col gap-2 font-semibold">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" (change)="escolher($event)" />
        </label>
        @if (erro()) { <p class="text-error text-xs">{{ erro() }}</p> }
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Descrição'" matInput [formControl]="descricao" maxlength="200" placeholder="Ex.: Sinal do buffet" />
        </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="comprovante" [disabled]="!arquivo()">Enviar</button>
    </mat-dialog-actions>
  `,
})
export class ComprovanteDialog {
  protected readonly ref = inject(MatDialogRef<ComprovanteDialog, { arquivo: File; descricao: string }>);
  protected readonly descricao = new FormControl('', { nonNullable: true });
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
    this.ref.close({ arquivo, descricao: this.descricao.value });
  }
}
