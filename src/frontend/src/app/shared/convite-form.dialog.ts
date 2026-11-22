import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ConviteDoFormulario, DDI_PADRAO, PedidoConvite, pedidoDoFormulario } from '../core/convite-formulario';
import { MascaraDirective } from './mascara.directive';

export interface ConviteFormDados {
  /** Nulo = novo convite. */
  convite: ConviteDoFormulario | null;
  /** A organizadora vê e preenche a observação; o link do cliente não (SPEC-059). */
  mostrarObservacao: boolean;
}

/**
 * Formulário único de convite (SPEC-059), usado pela organizadora (aba Convidados) e pelo link do cliente,
 * ao criar e ao editar. Telefone por convidado; o do primeiro é obrigatório e vira o principal.
 */
@Component({
  selector: 'app-convite-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatCheckboxModule, MascaraDirective],
  template: `
    <h2 mat-dialog-title>{{ dados.convite ? 'Editar convite' : 'Novo convite' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Um convite reúne quem recebe junto, como a família. O telefone do primeiro convidado é obrigatório e é para ele que o convite vai.</p>
    <mat-dialog-content>
      <form id="convite-form" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Nome do convite</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome do convite" matInput formControlName="nome" placeholder="Ex.: Família Souza" /></mat-form-field>
        </div>
        <div class="sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="E-mail" matInput type="email" formControlName="email" /></mat-form-field>
        </div>
        @if (dados.mostrarObservacao) {
          <div class="sm:col-span-2">
            <mat-label class="font-semibold mb-2 block">Observação</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input aria-label="Observação" matInput formControlName="observacao" placeholder="Ex.: por que este convite foi cadastrado" /></mat-form-field>
          </div>
        }
        <div class="sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Convidados</mat-label>
          <div formArrayName="convidados" class="grid gap-3">
            @for (item of convidados.controls; track item; let i = $index) {
              <div class="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_88px_160px_auto] gap-2 items-start" [formGroupName]="i">
                <mat-form-field appearance="outline" class="w-full col-span-2 sm:col-span-1">
                  <input [attr.aria-label]="'Nome completo do convidado ' + (i + 1)" matInput formControlName="nome" placeholder="Nome completo" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'DDI do convidado ' + (i + 1)" matInput formControlName="ddi" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Telefone do convidado ' + (i + 1)" matInput type="tel" formControlName="celular" gdMascara="celular" [placeholder]="i === 0 ? 'Telefone' : 'Telefone (opcional)'" />
                  @if (i === 0 && item.get('celular')?.hasError('required') && item.get('celular')?.touched) {
                    <mat-error>Obrigatório no primeiro convidado.</mat-error>
                  }
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Remover convidado" [disabled]="convidados.length === 1" (click)="remover(i)"><mat-icon>delete</mat-icon></button>
              </div>
            }
          </div>
          <button mat-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Adicionar convidado</button>
        </div>
        <div class="sm:col-span-2">
          <mat-checkbox formControlName="excecaoPrazoRsvp">Aceitar confirmação pelo link após o prazo</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="convite-form" [disabled]="form.invalid">Salvar convite</button>
    </mat-dialog-actions>
  `,
})
export class ConviteFormDialog {
  protected readonly dados = inject<ConviteFormDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ConviteFormDialog, PedidoConvite>);
  private readonly fb = inject(FormBuilder);
  private readonly ids: (string | null)[] = this.dados.convite?.convidados.map((item) => item.id) ?? [null];

  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados.convite?.nome ?? '', Validators.required],
    email: [this.dados.convite?.email ?? '', Validators.email],
    observacao: [this.dados.convite?.observacao ?? ''],
    excecaoPrazoRsvp: [this.dados.convite?.excecaoPrazoRsvp ?? false],
    convidados: this.fb.nonNullable.array(
      (this.dados.convite?.convidados ?? [{ id: null, nome: '', ddi: DDI_PADRAO, celular: null }])
        .map((item) => this.linha(item.nome, item.ddi ?? DDI_PADRAO, item.celular ?? '')),
      Validators.minLength(1)),
  });

  constructor() {
    this.exigirTelefoneDoPrimeiro();
  }

  protected get convidados(): FormArray<FormGroup> {
    return this.form.controls.convidados as unknown as FormArray<FormGroup>;
  }

  protected adicionar(): void {
    this.ids.push(null);
    this.form.controls.convidados.push(this.linha('', DDI_PADRAO, ''));
  }

  protected remover(indice: number): void {
    this.ids.splice(indice, 1);
    this.form.controls.convidados.removeAt(indice);
    this.exigirTelefoneDoPrimeiro();
  }

  protected salvar(): void {
    if (this.form.invalid) return;
    this.ref.close(pedidoDoFormulario(this.form.getRawValue(), this.ids, this.dados.mostrarObservacao));
  }

  private linha(nome: string, ddi: string, celular: string) {
    return this.fb.nonNullable.group({ nome: [nome, Validators.required], ddi: [ddi], celular: [celular] });
  }

  /** Só o telefone do primeiro convidado é obrigatório; os demais são opcionais. */
  private exigirTelefoneDoPrimeiro(): void {
    this.form.controls.convidados.controls.forEach((grupo, indice) => {
      const celular = grupo.controls.celular;
      celular.setValidators(indice === 0 ? Validators.required : null);
      celular.updateValueAndValidity();
    });
  }
}
