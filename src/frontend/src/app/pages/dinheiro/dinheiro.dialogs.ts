import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  FORMAS_PAGAMENTO,
  FormaPagamento,
  LancamentoEvento,
  ParcelaContrato,
  TipoLancamento,
} from '../../core/dinheiro.client';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';

const BASE = [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule];

/** "Recebi": valor (aceita parcial), forma e data (SPEC-029 §6.3). */
@Component({
  selector: 'app-receber-dialog',
  imports: [MatFormFieldModule, ...BASE, CampoDataComponent, CampoDinheiroComponent, GdDinheiroPipe],
  template: `
    <h2 mat-dialog-title>Recebi</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">
      {{ dados.entrada ? 'Entrada' : 'Parcela ' + dados.numero }} · falta receber {{ dados.saldo | gdDinheiro }}.
    </p>
    <mat-dialog-content>
      <form id="receber" class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="salvar()">
        <app-campo-dinheiro rotulo="Valor recebido" formControlName="valor" />
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Forma de pagamento</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Forma de pagamento'" formControlName="forma">
            @for (forma of formas; track forma.valor) { <mat-option [value]="forma.valor">{{ forma.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <app-campo-data rotulo="Data do recebimento" formControlName="data" />
      </form>
      @if (erro) { <p class="text-error text-xs">{{ erro }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="receber">Registrar</button>
    </mat-dialog-actions>
  `,
})
export class ReceberDialog {
  protected readonly dados = inject<ParcelaContrato>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ReceberDialog, { valor: number; forma: FormaPagamento; data: string }>);
  private readonly fb = inject(FormBuilder);
  protected readonly formas = FORMAS_PAGAMENTO;
  protected erro = '';
  protected readonly form = this.fb.group({
    valor: this.fb.control<number | null>(this.dados.saldo, Validators.required),
    forma: this.fb.nonNullable.control<FormaPagamento>('Pix'),
    data: this.fb.control<Date | null>(new Date(), Validators.required),
  });

  protected salvar(): void {
    const valor = this.form.getRawValue();
    if (!valor.valor || valor.valor <= 0 || !valor.data) {
      this.erro = 'Informe o valor e a data.';
      return;
    }
    if (valor.valor > this.dados.saldo + 0.001) {
      this.erro = 'O valor passa do que falta receber nesta parcela.';
      return;
    }
    this.ref.close({ valor: valor.valor, forma: valor.forma, data: deDataParaIso(valor.data)! });
  }
}

/** Pede a chave Pix quando o Perfil não tem (SPEC-029 §6.2). */
@Component({
  selector: 'app-chave-pix-dialog',
  imports: [MatFormFieldModule, ...BASE],
  template: `
    <h2 mat-dialog-title>Chave Pix</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Seu Perfil ainda não tem chave Pix. Informe a chave que vai na mensagem de cobrança.</p>
    <mat-dialog-content>
      <form id="chave-pix" class="grid grid-cols-1 gap-4" (ngSubmit)="ok()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Chave Pix</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Chave Pix'" matInput [formControl]="chave" maxlength="140" required />
          @if (chave.invalid && chave.touched) { <mat-error>Informe a chave Pix.</mat-error> }
          <mat-hint>Para não pedir de novo, cadastre a chave no Perfil.</mat-hint>
        </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="chave-pix">Abrir WhatsApp</button>
    </mat-dialog-actions>
  `,
})
export class ChavePixDialog {
  protected readonly ref = inject(MatDialogRef<ChavePixDialog, string>);
  protected readonly chave = inject(FormBuilder).nonNullable.control('', [Validators.required, Validators.pattern(/\S/)]);

  protected ok(): void {
    if (this.chave.invalid) {
      this.chave.markAsTouched();
      return;
    }
    this.ref.close(this.chave.value.trim());
  }
}

/** Despesa ou entrada avulsa do evento (SPEC-029 §6.6). */
@Component({
  selector: 'app-lancamento-dialog',
  imports: [MatFormFieldModule, ...BASE, CampoDataComponent, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar lançamento' : 'Novo lançamento' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Despesa ou entrada do evento, por categoria.</p>
    <mat-dialog-content>
      <form id="lancamento" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Tipo'" formControlName="tipo">
            <mat-option value="Despesa">Despesa</mat-option>
            <mat-option value="Entrada">Entrada</mat-option>
          </mat-select>
        </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Categoria</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Categoria'" matInput formControlName="categoria" maxlength="80" required placeholder="Ex.: Transporte, Alimentação" />
          @if (form.controls.categoria.invalid) { <mat-error>Informe a categoria.</mat-error> }
        </mat-form-field>
        </div>
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <app-campo-data rotulo="Data" formControlName="data" />
        <div class="campo sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Descrição'" matInput formControlName="descricao" maxlength="200" />
        </mat-form-field>
        </div>
      </form>
      @if (erro) { <p class="text-error text-xs">{{ erro }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="lancamento">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class LancamentoDialog {
  protected readonly dados = inject<LancamentoEvento | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<LancamentoDialog, Omit<LancamentoEvento, 'id'>>);
  private readonly fb = inject(FormBuilder);
  protected erro = '';
  protected readonly form = this.fb.group({
    tipo: this.fb.nonNullable.control<TipoLancamento>(this.dados?.tipo ?? 'Despesa'),
    categoria: [this.dados?.categoria ?? '', [Validators.required, Validators.pattern(/\S/)]],
    valor: this.fb.control<number | null>(this.dados?.valor ?? null, Validators.required),
    data: this.fb.control<Date | null>(this.dados ? deIsoParaData(this.dados.data) : new Date(), Validators.required),
    descricao: this.dados?.descricao ?? '',
  });

  protected salvar(): void {
    const valor = this.form.getRawValue();
    if (this.form.invalid || !valor.valor || valor.valor <= 0) {
      this.form.markAllAsTouched();
      this.erro = 'Informe categoria, valor e data.';
      return;
    }
    this.ref.close({
      tipo: valor.tipo,
      categoria: (valor.categoria ?? '').trim(),
      descricao: (valor.descricao ?? '').trim() || null,
      valor: valor.valor,
      data: deDataParaIso(valor.data)!,
    });
  }
}
