import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DefinirContratoCasal,
  FORMAS_PAGAMENTO,
  FormaPagamento,
  LancamentoEvento,
  ParcelaCasal,
  TipoLancamento,
} from '../../core/dinheiro.client';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';

const BASE = [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule];

/** Valor do contrato com o casal, entrada e parcelas (SPEC-029 §6.1). */
@Component({
  selector: 'app-contrato-casal-dialog',
  imports: [...BASE, MatCheckboxModule, CampoDataComponent, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Contrato com o casal</h2>
    <p class="gd-dialog-descricao">Valor, entrada e parcelas. As parcelas do casal são geradas de novo ao salvar.</p>
    <mat-dialog-content>
      <form id="contrato-casal" class="gd-campos duas" [formGroup]="form" (ngSubmit)="salvar()">
        <app-campo-dinheiro rotulo="Valor do contrato" formControlName="valor" />
        <mat-form-field appearance="outline">
          <mat-label>Número de parcelas</mat-label>
          <input matInput type="number" min="1" max="120" formControlName="quantidadeParcelas" required />
          @if (form.controls.quantidadeParcelas.invalid) { <mat-error>De 1 a 120.</mat-error> }
        </mat-form-field>
        <app-campo-data rotulo="Vencimento da 1ª parcela" formControlName="primeiraParcela" />
        <span></span>
        <mat-checkbox class="inteiro" formControlName="comEntrada">Tem entrada</mat-checkbox>
        @if (form.controls.comEntrada.value) {
          <mat-form-field appearance="outline">
            <mat-label>Entrada em</mat-label>
            <mat-select formControlName="baseEntrada">
              <mat-option value="Valor">Valor (R$)</mat-option>
              <mat-option value="Porcentagem">Porcentagem (%)</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.controls.baseEntrada.value === 'Porcentagem') {
            <mat-form-field appearance="outline">
              <mat-label>Entrada (%)</mat-label>
              <input matInput type="number" min="1" max="100" formControlName="valorEntrada" />
              <span matTextSuffix>%</span>
            </mat-form-field>
          } @else {
            <app-campo-dinheiro rotulo="Valor da entrada" formControlName="valorEntrada" />
          }
          <app-campo-data rotulo="Data da entrada" formControlName="dataEntrada" />
        }
      </form>
      @if (erro) { <p class="gd-erro-texto">{{ erro }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="contrato-casal">Gerar parcelas</button>
    </mat-dialog-actions>
  `,
  styles: `.gd-erro-texto { color: var(--gd-destructive); font-size: 13px; margin: 8px 0 0; }`,
})
export class ContratoCasalDialog {
  protected readonly ref = inject(MatDialogRef<ContratoCasalDialog, DefinirContratoCasal>);
  private readonly dados = inject<{ valor: number | null }>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  protected erro = '';
  protected readonly form = this.fb.group({
    valor: this.fb.control<number | null>(this.dados.valor, Validators.required),
    quantidadeParcelas: this.fb.control<number>(1, [Validators.required, Validators.min(1), Validators.max(120)]),
    primeiraParcela: this.fb.control<Date | null>(null, Validators.required),
    comEntrada: false,
    baseEntrada: this.fb.control<'Valor' | 'Porcentagem'>('Valor'),
    valorEntrada: this.fb.control<number | null>(null),
    dataEntrada: this.fb.control<Date | null>(null),
  });

  protected salvar(): void {
    const valor = this.form.getRawValue();
    if (this.form.invalid || !valor.valor || valor.valor <= 0) {
      this.form.markAllAsTouched();
      this.erro = 'Informe o valor, o número de parcelas e o vencimento da 1ª parcela.';
      return;
    }
    if (valor.comEntrada && (!valor.valorEntrada || !valor.dataEntrada)) {
      this.erro = 'Informe o valor e a data da entrada.';
      return;
    }
    this.ref.close({
      valor: valor.valor,
      quantidadeParcelas: Number(valor.quantidadeParcelas),
      primeiraParcela: deDataParaIso(valor.primeiraParcela),
      comEntrada: !!valor.comEntrada,
      baseEntrada: valor.comEntrada ? valor.baseEntrada : null,
      valorEntrada: valor.comEntrada ? valor.valorEntrada : null,
      dataEntrada: valor.comEntrada ? deDataParaIso(valor.dataEntrada) : null,
    });
  }
}

/** "Recebi": valor (aceita parcial), forma e data (SPEC-029 §6.3). */
@Component({
  selector: 'app-receber-dialog',
  imports: [...BASE, CampoDataComponent, CampoDinheiroComponent, GdDinheiroPipe],
  template: `
    <h2 mat-dialog-title>Recebi</h2>
    <p class="gd-dialog-descricao">
      {{ dados.entrada ? 'Entrada' : 'Parcela ' + dados.numero }} · falta receber {{ dados.saldo | gdDinheiro }}.
    </p>
    <mat-dialog-content>
      <form id="receber" class="gd-campos" [formGroup]="form" (ngSubmit)="salvar()">
        <app-campo-dinheiro rotulo="Valor recebido" formControlName="valor" />
        <mat-form-field appearance="outline">
          <mat-label>Forma de pagamento</mat-label>
          <mat-select formControlName="forma">
            @for (forma of formas; track forma.valor) { <mat-option [value]="forma.valor">{{ forma.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <app-campo-data rotulo="Data do recebimento" formControlName="data" />
      </form>
      @if (erro) { <p class="gd-erro-texto">{{ erro }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="receber">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: `.gd-erro-texto { color: var(--gd-destructive); font-size: 13px; margin: 8px 0 0; }`,
})
export class ReceberDialog {
  protected readonly dados = inject<ParcelaCasal>(MAT_DIALOG_DATA);
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
  imports: [...BASE],
  template: `
    <h2 mat-dialog-title>Chave Pix</h2>
    <p class="gd-dialog-descricao">Seu Perfil ainda não tem chave Pix. Informe a chave que vai na mensagem de cobrança.</p>
    <mat-dialog-content>
      <form id="chave-pix" class="gd-campos" (ngSubmit)="ok()">
        <mat-form-field appearance="outline">
          <mat-label>Chave Pix</mat-label>
          <input matInput [formControl]="chave" maxlength="140" required />
          @if (chave.invalid && chave.touched) { <mat-error>Informe a chave Pix.</mat-error> }
          <mat-hint>Para não pedir de novo, cadastre a chave no Perfil.</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
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
  imports: [...BASE, CampoDataComponent, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar lançamento' : 'Novo lançamento' }}</h2>
    <p class="gd-dialog-descricao">Despesa ou entrada do evento, por categoria.</p>
    <mat-dialog-content>
      <form id="lancamento" class="gd-campos duas" [formGroup]="form" (ngSubmit)="salvar()">
        <mat-form-field appearance="outline">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="tipo">
            <mat-option value="Despesa">Despesa</mat-option>
            <mat-option value="Entrada">Entrada</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Categoria</mat-label>
          <input matInput formControlName="categoria" maxlength="80" required placeholder="Ex.: Transporte, Alimentação" />
          @if (form.controls.categoria.invalid) { <mat-error>Informe a categoria.</mat-error> }
        </mat-form-field>
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <app-campo-data rotulo="Data" formControlName="data" />
        <mat-form-field class="inteiro" appearance="outline">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="descricao" maxlength="200" />
        </mat-form-field>
      </form>
      @if (erro) { <p class="gd-erro-texto">{{ erro }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="lancamento">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `.gd-erro-texto { color: var(--gd-destructive); font-size: 13px; margin: 8px 0 0; }`,
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
