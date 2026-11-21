import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PagamentoFornecedor, PedidoParcelamentoPagamento } from '../../core/dinheiro.client';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { deDataParaIso } from '../../shared/data';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';

/** Parcelamento do pagamento a fornecedor (SPEC-043 §6.2): N parcelas mensais, com entrada opcional. O total é o valor contratado. */
@Component({
  selector: 'app-parcelar-pagamento-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, CampoDataComponent, CampoDinheiroComponent, GdDinheiroPipe],
  template: `
    <h2 mat-dialog-title>{{ dados.parcelas.length ? 'Refazer parcelamento' : 'Parcelar pagamento' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">
      {{ dados.servico }}{{ dados.fornecedor ? " · " + dados.fornecedor : "" }}. O total é o valor contratado ({{ dados.valor | gdDinheiro }}).
    </p>
    <mat-dialog-content>
      <form id="parcelar" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Número de parcelas</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input [attr.aria-label]="'Número de parcelas'" matInput type="number" min="1" max="120" formControlName="quantidade" />
          </mat-form-field>
        </div>
        <app-campo-data rotulo="Vencimento da 1ª parcela" formControlName="primeira" />
        <div class="campo sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Entrada</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Entrada'" formControlName="comEntrada">
              <mat-option [value]="false">Sem entrada</mat-option>
              <mat-option [value]="true">Com entrada</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        @if (form.controls.comEntrada.value) {
          <app-campo-dinheiro rotulo="Valor da entrada" formControlName="valorEntrada" />
          <app-campo-data rotulo="Data da entrada" formControlName="dataEntrada" />
        }
      </form>
      @if (erro) { <p class="text-error text-xs">{{ erro }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="parcelar">Salvar parcelamento</button>
    </mat-dialog-actions>
  `,
})
export class ParcelarPagamentoDialog {
  protected readonly dados = inject<PagamentoFornecedor>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ParcelarPagamentoDialog, PedidoParcelamentoPagamento>);
  private readonly fb = inject(FormBuilder);
  protected erro = '';
  protected readonly form = this.fb.group({
    quantidade: this.fb.control<number | null>(1, [Validators.required, Validators.min(1), Validators.max(120)]),
    primeira: this.fb.control<Date | null>(null, Validators.required),
    comEntrada: this.fb.nonNullable.control(false),
    valorEntrada: this.fb.control<number | null>(null),
    dataEntrada: this.fb.control<Date | null>(null),
  });

  protected salvar(): void {
    const v = this.form.getRawValue();
    if (!v.quantidade || v.quantidade < 1 || v.quantidade > 120 || !v.primeira) {
      this.erro = 'Informe o número de parcelas (1 a 120) e o vencimento da primeira.';
      return;
    }
    if (v.comEntrada && (!v.valorEntrada || v.valorEntrada <= 0 || !v.dataEntrada)) {
      this.erro = 'Informe o valor e a data da entrada.';
      return;
    }
    const pedido: PedidoParcelamentoPagamento = {
      quantidadeParcelas: v.quantidade,
      primeiraParcela: deDataParaIso(v.primeira),
      comEntrada: v.comEntrada,
      baseEntrada: v.comEntrada ? 'Valor' : null,
      valorEntrada: v.comEntrada ? v.valorEntrada : null,
      dataEntrada: v.comEntrada ? deDataParaIso(v.dataEntrada) : null,
    };
    this.ref.close(pedido);
  }
}
