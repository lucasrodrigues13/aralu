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
    <p class="gd-dialog-descricao">JPG, JPEG, PNG ou PDF de até 5 MB. Fotos são reduzidas ao guardar, sem perder a leitura.</p>
    <mat-dialog-content>
      <form id="comprovante" class="gd-campos" (ngSubmit)="enviar()">
        <label class="gd-arquivo">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" (change)="escolher($event)" />
        </label>
        @if (erro()) { <p class="gd-erro-texto">{{ erro() }}</p> }
        <mat-form-field appearance="outline">
          <mat-label>Descrição</mat-label>
          <input matInput [formControl]="descricao" maxlength="200" placeholder="Ex.: Sinal do buffet" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="comprovante" [disabled]="!arquivo()">Enviar</button>
    </mat-dialog-actions>
  `,
  styles: `.gd-erro-texto { color: var(--gd-destructive); font-size: 13px; margin: 0; }`,
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
