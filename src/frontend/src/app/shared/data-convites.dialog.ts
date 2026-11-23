import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CampoDataComponent } from './campo-data';
import { deDataParaIso, deIsoParaData } from './data';

export interface DataConvitesDados {
  titulo: string;
  texto: string;
  rotulo: string;
  /** `aaaa-mm-dd` ou nulo. */
  valor: string | null;
}

/** Data opcional da aba Convidados: prazo de confirmação (SPEC-054) e data de envio (SPEC-059). Fecha com `{ data }`. */
@Component({
  selector: 'app-data-convites-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, CampoDataComponent],
  template: `
    <h2 mat-dialog-title>{{ dados.titulo }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">{{ dados.texto }}</p>
    <mat-dialog-content>
      <form id="data-convites-form" class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="salvar()">
        <app-campo-data [rotulo]="dados.rotulo" formControlName="data" />
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="submit" form="data-convites-form">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class DataConvitesDialog {
  protected readonly dados = inject<DataConvitesDados>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DataConvitesDialog, { data: string | null }>);
  protected readonly form = inject(FormBuilder).group({ data: deIsoParaData(this.dados.valor) });

  protected salvar(): void {
    this.ref.close({ data: deDataParaIso(this.form.getRawValue().data) });
  }
}

export const DADOS_PRAZO = (valor: string | null): DataConvitesDados => ({
  titulo: 'Prazo de confirmação',
  texto: 'Depois desta data o link do convite mostra que expirou. Deixe vazio para não ter prazo.',
  rotulo: 'Data limite',
  valor,
});

export const DADOS_ENVIO = (valor: string | null): DataConvitesDados => ({
  titulo: 'Data de envio dos convites',
  texto: 'Uma data só para todos os convites do evento. Deixe vazio se ainda não definiu.',
  rotulo: 'Data de envio',
  valor,
});
