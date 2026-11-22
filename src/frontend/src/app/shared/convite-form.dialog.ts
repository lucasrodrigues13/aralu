import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ConviteDoFormulario, DDI_PADRAO, FAIXAS, GENEROS, PedidoConvite, pedidoDoFormulario } from '../core/convite-formulario';
import { MascaraDirective } from './mascara.directive';
import { MatTooltipModule } from '@angular/material/tooltip';

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
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatCheckboxModule, MatSelectModule, MatRadioModule, MascaraDirective, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados.convite ? 'Editar convite' : 'Novo convite' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Um convite reúne quem recebe junto, como a família. Marque o convidado principal: ele recebe as comunicações e precisa de telefone.</p>
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
          <mat-radio-group formControlName="principal" aria-label="Convidado principal" class="block">
          <div formArrayName="convidados" class="grid gap-4">
            @for (item of convidados.controls; track item; let i = $index) {
              <div class="convidado grid grid-cols-2 sm:grid-cols-[88px_1fr_1fr_1fr] gap-x-2 items-start" [formGroupName]="i">
                <div class="col-span-2 sm:col-span-4 flex items-start gap-2">
                  <mat-form-field appearance="outline" class="w-full">
                    <input [attr.aria-label]="'Nome completo do convidado ' + (i + 1)" matInput formControlName="nome" placeholder="Nome completo" />
                  </mat-form-field>
                  <button mat-icon-button type="button" aria-label="Remover convidado" matTooltip="Remover convidado" [disabled]="convidados.length === 1" (click)="remover(i)"><mat-icon>delete</mat-icon></button>
                </div>
                <mat-radio-button class="col-span-2 sm:col-span-4 -mt-2 mb-2" [value]="i" [attr.data-teste]="'principal-' + i">Convidado principal (recebe as comunicações)</mat-radio-button>
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'DDI do convidado ' + (i + 1)" matInput formControlName="ddi" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Telefone do convidado ' + (i + 1)" matInput type="tel" formControlName="celular" gdMascara="celular" [placeholder]="form.controls.principal.value === i ? 'Telefone' : 'Telefone (opcional)'" />
                  @if (item.get('celular')?.hasError('required')) {
                    <mat-error>Obrigatório no convidado principal.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select [aria-label]="'Gênero do convidado ' + (i + 1)" formControlName="genero" placeholder="Gênero">
                    <mat-option value="">Não informado</mat-option>
                    @for (opcao of generos; track opcao.valor) { <mat-option [value]="opcao.valor">{{ opcao.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select [aria-label]="'Faixa etária do convidado ' + (i + 1)" formControlName="faixa" placeholder="Faixa etária">
                    <mat-option value="">Não informada</mat-option>
                    @for (opcao of faixas; track opcao.valor) { <mat-option [value]="opcao.valor">{{ opcao.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
              </div>
            }
          </div>
          </mat-radio-group>
          @if (form.controls.principal.invalid) {
            <p class="text-sm text-error mt-1 mb-0" role="alert">Marque o convidado principal.</p>
          }
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
  styles: `
    .convidado { border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 8px; }
  `,
})
export class ConviteFormDialog {
  protected readonly dados = inject<ConviteFormDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ConviteFormDialog, PedidoConvite>);
  private readonly fb = inject(FormBuilder);
  protected readonly generos = GENEROS;
  protected readonly faixas = FAIXAS;
  private readonly ids: (string | null)[] = this.dados.convite?.convidados.map((item) => item.id) ?? [null];

  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados.convite?.nome ?? '', Validators.required],
    email: [this.dados.convite?.email ?? '', Validators.email],
    observacao: [this.dados.convite?.observacao ?? ''],
    excecaoPrazoRsvp: [this.dados.convite?.excecaoPrazoRsvp ?? false],
    principal: this.fb.control<number | null>(this.indiceDoPrincipal(), Validators.required),
    convidados: this.fb.nonNullable.array(
      (this.dados.convite?.convidados ?? [{ id: null, nome: '', ddi: DDI_PADRAO, celular: null, genero: null, faixa: null, principal: false }])
        .map((item) => this.linha(item.nome, item.ddi ?? DDI_PADRAO, item.celular ?? '', item.genero ?? '', item.faixa ?? '')),
      Validators.minLength(1)),
  });

  constructor() {
    this.exigirTelefoneDoPrincipal();
    this.form.controls.principal.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.exigirTelefoneDoPrincipal());
  }

  protected get convidados(): FormArray<FormGroup> {
    return this.form.controls.convidados as unknown as FormArray<FormGroup>;
  }

  protected adicionar(): void {
    this.ids.push(null);
    this.form.controls.convidados.push(this.linha('', DDI_PADRAO, '', '', ''));
  }

  protected remover(indice: number): void {
    const principal = this.form.controls.principal.value;
    this.ids.splice(indice, 1);
    this.form.controls.convidados.removeAt(indice);
    if (principal === indice) this.form.controls.principal.setValue(null);
    else if (principal !== null && principal > indice) this.form.controls.principal.setValue(principal - 1);
    this.exigirTelefoneDoPrincipal();
  }

  protected salvar(): void {
    if (this.form.invalid) return;
    this.ref.close(pedidoDoFormulario(this.form.getRawValue(), this.ids, this.dados.mostrarObservacao));
  }

  private linha(nome: string, ddi: string, celular: string, genero: string, faixa: string) {
    return this.fb.nonNullable.group({ nome: [nome, Validators.required], ddi: [ddi], celular: [celular], genero: [genero], faixa: [faixa] });
  }

  private indiceDoPrincipal(): number | null {
    const indice = this.dados.convite?.convidados.findIndex((item) => item.principal) ?? -1;
    return indice >= 0 ? indice : null;
  }

  /** Só o telefone do convidado principal é obrigatório; os demais são opcionais. */
  private exigirTelefoneDoPrincipal(): void {
    const principal = this.form?.controls.principal.value ?? this.indiceDoPrincipal();
    this.form.controls.convidados.controls.forEach((grupo, indice) => {
      const celular = grupo.controls.celular;
      celular.setValidators(indice === principal ? Validators.required : null);
      celular.updateValueAndValidity();
    });
  }
}
