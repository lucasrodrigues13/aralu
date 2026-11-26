import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Assistente, AssistentesClient, GrupoAcesso } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { MascaraDirective } from '../../shared/mascara.directive';

export interface AssistenteFormDados {
  assistente?: Assistente;
}

/** Convidar ou editar assistente (SPEC-032 §6.1 e §6.3). */
@Component({
  selector: 'app-assistente-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MascaraDirective, CampoDataComponent],
  template: `
    <h2 mat-dialog-title>{{ dados.assistente ? 'Editar assistente' : 'Convidar assistente' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">
      {{ dados.assistente ? 'A mudança vale no próximo pedido dela.' : 'Ela recebe um e-mail com o link para criar a senha.' }}
    </p>
    <mat-dialog-content>
      <form id="assistente-form" class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input [attr.aria-label]="'Nome'" matInput formControlName="nome" maxlength="100" required />
            @if (formulario.controls.nome.invalid) { <mat-error>Informe o nome.</mat-error> }
          </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input [attr.aria-label]="'E-mail'" matInput type="email" formControlName="email" required />
            @if (formulario.controls.email.invalid) { <mat-error>Informe um e-mail válido.</mat-error> }
          </mat-form-field>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Celular (opcional)</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <input [attr.aria-label]="'Celular'" matInput formControlName="celular" gdMascara="celular" />
            </mat-form-field>
          </div>
          <app-campo-data rotulo="Nascimento (opcional)" formControlName="nascimento" />
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select [attr.aria-label]="'Tipo'" formControlName="tipo">
                <mat-option value="Membro">Membro (acesso pelo grupo)</mat-option>
                <mat-option value="Dono">Dono (acesso total e Configurações)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          @if (formulario.controls.tipo.value === 'Membro') {
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Grupo</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [attr.aria-label]="'Grupo'" formControlName="grupoId">
                  @for (grupo of grupos(); track grupo.id) {
                    <mat-option [value]="grupo.id">{{ grupo.nome }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(false)">Cancelar</button>
      <button mat-flat-button type="submit" form="assistente-form" [disabled]="enviando">
        {{ dados.assistente ? 'Salvar' : 'Convidar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class AssistenteFormDialog {
  protected readonly dados = inject<AssistenteFormDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<AssistenteFormDialog, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly cliente = inject(AssistentesClient);
  private readonly toast = inject(ToastService);
  protected enviando = false;
  protected readonly formulario = this.fb.nonNullable.group({
    nome: [this.dados.assistente?.nome ?? '', [Validators.required, Validators.pattern(/\S/)]],
    email: [this.dados.assistente?.email ?? '', [Validators.required, Validators.email]],
    celular: this.dados.assistente?.celular ?? '',
    nascimento: this.fb.control<Date | null>(deIsoParaData(this.dados.assistente?.nascimento)),
    tipo: this.dados.assistente?.tipo ?? 'Membro',
    grupoId: this.fb.control<string | null>(this.dados.assistente?.grupoId ?? null),
  });
  protected readonly grupos = signal<GrupoAcesso[]>([]);

  constructor() {
    this.cliente.grupos().subscribe((grupos) => {
      this.grupos.set(grupos);
      if (!this.formulario.controls.grupoId.value) {
        this.formulario.controls.grupoId.setValue(grupos.find((g) => g.nome === 'Assistentes')?.id ?? grupos[0]?.id ?? null);
      }
    });
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.toast.erro('Confira os campos obrigatórios destacados.');
      return;
    }

    const valor = this.formulario.getRawValue();
    const pedido = {
      nome: valor.nome.trim(),
      email: valor.email.trim(),
      celular: valor.celular.trim() || null,
      nascimento: deDataParaIso(valor.nascimento),
      tipo: valor.tipo,
      grupoId: valor.tipo === 'Membro' ? valor.grupoId : null,
    };
    this.enviando = true;
    const destino = this.dados.assistente
      ? this.cliente.atualizar(this.dados.assistente.id, pedido)
      : this.cliente.convidar(pedido);
    destino.subscribe({
      next: (assistente) => {
        if (assistente.conviteEnviado === false) {
          this.toast.erro('Não foi possível enviar o e-mail. Tente reenviar.');
        } else {
          this.toast.sucesso(this.dados.assistente ? 'Assistente atualizada.' : 'Convite enviado.');
        }

        this.ref.close(true);
      },
      error: (erro: unknown) => {
        this.enviando = false;
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}
