import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, OrcamentoFunil } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';

/** Parcelar o orçamento do funil: entrada, número de parcelas e vencimentos (SPEC-042 §6.1). */
@Component({
  selector: 'app-parcelas-orcamento-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, CampoDataComponent, CampoDinheiroComponent, GdDataPipe, GdDinheiroPipe],
  template: `
    <h2 mat-dialog-title>Parcelas do orçamento</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">
      Total: {{ dados.valor | gdDinheiro }}. As parcelas atuais são substituídas ao gerar.
      @if (dados.tokenLink) { A proposta já foi enviada: mudar as parcelas pede nova resposta do cliente. }
    </p>
    <mat-dialog-content>
      <form id="parcelas-orcamento" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Número de parcelas</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input aria-label="Número de parcelas" matInput type="number" min="1" max="120" formControlName="quantidadeParcelas" required />
            @if (form.controls.quantidadeParcelas.invalid) { <mat-error>De 1 a 120.</mat-error> }
          </mat-form-field>
        </div>
        <app-campo-data rotulo="Vencimento da 1ª parcela" formControlName="primeiraParcela" />
        <mat-checkbox class="sm:col-span-2" formControlName="comEntrada">Tem entrada</mat-checkbox>
        @if (form.controls.comEntrada.value) {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Entrada em</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select aria-label="Entrada em" formControlName="baseEntrada">
                <mat-option value="Valor">Valor (R$)</mat-option>
                <mat-option value="Porcentagem">Porcentagem (%)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          @if (form.controls.baseEntrada.value === 'Porcentagem') {
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Entrada (%)</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <input aria-label="Entrada (%)" matInput type="number" min="1" max="100" formControlName="valorEntrada" />
                <span matTextSuffix>%</span>
              </mat-form-field>
            </div>
          } @else {
            <app-campo-dinheiro rotulo="Valor da entrada" formControlName="valorEntrada" />
          }
          <app-campo-data rotulo="Data da entrada" formControlName="dataEntrada" />
        }
      </form>
      @if (dados.parcelas.length > 0) {
        <ul class="text-xs text-muted mt-4">
          @for (p of dados.parcelas; track p.numero) {
            <li>{{ p.entrada ? 'Entrada' : 'Parcela ' + p.numero }}: {{ p.valor | gdDinheiro }} em {{ p.vencimento | gdData }}</li>
          }
        </ul>
      }
      @if (erro()) { <p class="text-error text-xs">{{ erro() }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="parcelas-orcamento" [disabled]="enviando()">Gerar parcelas</button>
    </mat-dialog-actions>
  `,
})
export class ParcelasOrcamentoDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<OrcamentoFunil>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ParcelasOrcamentoDialog, boolean>);
  protected readonly erro = signal('');
  protected readonly enviando = signal(false);
  protected readonly form = this.fb.group({
    quantidadeParcelas: this.fb.control<number>(1, [Validators.required, Validators.min(1), Validators.max(120)]),
    primeiraParcela: this.fb.control<Date | null>(null, Validators.required),
    comEntrada: false,
    baseEntrada: this.fb.control<'Valor' | 'Porcentagem'>('Valor'),
    valorEntrada: this.fb.control<number | null>(null),
    dataEntrada: this.fb.control<Date | null>(null),
  });

  constructor() {
    this.preencherComParcelamentoAtual();
  }

  /** Reabre com o parcelamento já gerado, para editar em vez de começar do zero. */
  private preencherComParcelamentoAtual(): void {
    const atuais = this.dados.parcelas ?? [];
    if (atuais.length === 0) return;
    const entrada = atuais.find((p) => p.entrada);
    const regulares = atuais.filter((p) => !p.entrada).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    this.form.patchValue({
      quantidadeParcelas: regulares.length || 1,
      primeiraParcela: deIsoParaData(regulares[0]?.vencimento),
      comEntrada: !!entrada,
      baseEntrada: 'Valor',
      valorEntrada: entrada?.valor ?? null,
      dataEntrada: deIsoParaData(entrada?.vencimento),
    });
  }

  protected salvar(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erro.set('Informe o número de parcelas e o vencimento da 1ª parcela.');
      return;
    }
    if (v.comEntrada && (!v.valorEntrada || !v.dataEntrada)) {
      this.erro.set('Informe o valor e a data da entrada.');
      return;
    }
    this.enviando.set(true);
    this.erro.set('');
    this.negocio
      .definirParcelasOrcamentoFunil(this.dados.id, {
        quantidadeParcelas: Number(v.quantidadeParcelas),
        primeiraParcela: deDataParaIso(v.primeiraParcela),
        comEntrada: !!v.comEntrada,
        baseEntrada: v.comEntrada ? v.baseEntrada : null,
        valorEntrada: v.comEntrada ? v.valorEntrada : null,
        dataEntrada: v.comEntrada ? deDataParaIso(v.dataEntrada) : null,
      })
      .subscribe({
        next: () => {
          this.toast.sucesso('Parcelas geradas.');
          this.ref.close(true);
        },
        error: (e: unknown) => {
          this.erro.set(mensagemDeErro(e));
          this.enviando.set(false);
        },
      });
  }
}
