import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ConviteCasal, PedidoConviteCasal } from '../../core/casal.client';

/** Convite do casal (SPEC-052 §6.2): nome do convite, telefone, e-mail e o nome completo de cada convidado. */
@Component({
  selector: 'app-convite-casal-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ convite ? 'Editar convite' : 'Novo convite' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Um convite reúne quem recebe junto, como a família. O telefone e o e-mail são de quem recebe o convite.</p>
    <mat-dialog-content>
      <form id="convite-casal" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Nome do convite</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome do convite" matInput formControlName="nome" placeholder="Ex.: Família Souza" /></mat-form-field>
        </div>
        <div>
          <mat-label class="font-semibold mb-2 block">DDI</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="DDI" matInput formControlName="ddi" /></mat-form-field>
        </div>
        <div>
          <mat-label class="font-semibold mb-2 block">Telefone</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Telefone" matInput type="tel" formControlName="telefone" /></mat-form-field>
        </div>
        <div class="sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="E-mail" matInput type="email" formControlName="email" /></mat-form-field>
        </div>
        <div class="sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Convidados</mat-label>
          <div formArrayName="convidados" class="grid gap-2">
            @for (item of convidados.controls; track $index) {
              <div class="flex items-start gap-2">
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Nome completo do convidado ' + ($index + 1)" matInput [formControlName]="$index" placeholder="Nome completo" />
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Remover convidado" [disabled]="convidados.length === 1" (click)="remover($index)"><mat-icon>delete</mat-icon></button>
              </div>
            }
          </div>
          <button mat-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Adicionar convidado</button>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="convite-casal" [disabled]="form.invalid">Salvar convite</button>
    </mat-dialog-actions>
  `,
})
export class ConviteCasalDialog {
  protected readonly convite = inject<ConviteCasal | null>(MAT_DIALOG_DATA, { optional: true });
  protected readonly ref = inject(MatDialogRef<ConviteCasalDialog, PedidoConviteCasal>);
  private readonly fb = inject(FormBuilder);
  private readonly ids: (string | null)[] = this.convite?.convidados.map((item) => item.id) ?? [null];

  protected readonly form = this.fb.nonNullable.group({
    nome: [this.convite?.nome ?? '', Validators.required],
    ddi: [this.convite?.ddi ?? '+55'],
    telefone: [this.convite?.telefone ?? ''],
    email: [this.convite?.email ?? '', Validators.email],
    convidados: this.fb.nonNullable.array(
      (this.convite?.convidados.map((item) => item.nome) ?? ['']).map((nome) => this.fb.nonNullable.control(nome, Validators.required)),
      Validators.minLength(1)),
  });

  protected get convidados(): FormArray {
    return this.form.controls.convidados;
  }

  protected adicionar(): void {
    this.ids.push(null);
    this.convidados.push(this.fb.nonNullable.control('', Validators.required));
  }

  protected remover(indice: number): void {
    this.ids.splice(indice, 1);
    this.convidados.removeAt(indice);
  }

  protected salvar(): void {
    if (this.form.invalid) return;
    const valor = this.form.getRawValue();
    this.ref.close({
      nome: valor.nome,
      ddi: valor.telefone ? valor.ddi : null,
      telefone: valor.telefone || null,
      email: valor.email || null,
      convidados: valor.convidados.map((nome, indice) => ({ id: this.ids[indice] ?? null, nome })),
    } satisfies PedidoConviteCasal);
  }
}
