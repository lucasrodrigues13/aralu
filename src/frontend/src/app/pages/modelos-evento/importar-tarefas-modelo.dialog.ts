import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { switchMap } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Modelo, NegocioClient, TIPOS } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { DIALOG_EM_MASSA } from '../../shared/dialog';
import { AdicionarTarefasEmMassaDialog, ResultadoTarefasEmMassaModelo } from '../tarefas/adicionar-tarefas-em-massa.dialog';

/**
 * "Importar modelo" da biblioteca (SPEC-012 v3 §6.1): pede Nome e Tipo e abre "Adicionar tarefas em massa". O modelo
 * só é criado quando as tarefas são confirmadas. Fecha com o modelo criado.
 */
@Component({
  selector: 'app-importar-tarefas-modelo',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Importar modelo</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Informe o nome e o tipo. Em seguida, cole a lista ou envie a planilha.</p>
    <mat-dialog-content>
      <form id="importar-modelo" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (submit)="continuar(); $event.preventDefault()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Tipo'" formControlName="tipo">
              @for (tipo of tipos; track tipo.valor) { <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="importar-modelo" [disabled]="gravando()">Continuar</button>
    </mat-dialog-actions>
  `,
})
export class ImportarTarefasModeloDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly ref = inject(MatDialogRef<ImportarTarefasModeloDialog, Modelo>);
  protected readonly tipos = TIPOS;
  protected readonly gravando = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.pattern(/\S/)]],
    tipo: ['Casamento', Validators.required],
  });

  protected continuar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o nome e o tipo do modelo.');
      return;
    }
    this.dialog.open(AdicionarTarefasEmMassaDialog, { ...DIALOG_EM_MASSA, data: { modo: 'modelo', servicosDoModelo: [] } })
      .afterClosed().subscribe((resultado?: ResultadoTarefasEmMassaModelo | boolean) => {
        if (!resultado || resultado === true || resultado.tarefas.length === 0) return;
        this.gravar(resultado);
      });
  }

  private gravar(resultado: ResultadoTarefasEmMassaModelo): void {
    const { nome, tipo } = this.form.getRawValue();
    const chaves = [...new Set(resultado.tarefas.map((tarefa) => tarefa.servicoContaId).filter((id) => !!id))];
    this.gravando.set(true);
    this.negocio.servicosConta().pipe(
      switchMap((catalogo) => this.negocio.criarModelo({ nome, tipo }).pipe(
        switchMap((modelo) => this.negocio.atualizarModelo(modelo.id, {
          nome,
          tipo,
          permissoes: modelo.permissoes,
          servicos: chaves.map((id) => ({ chave: id, servicoContaId: id, nome: catalogo.find((servico) => servico.id === id)?.nome ?? resultado.servicosCadastrados.find((servico) => servico.id === id)?.nome ?? '', valorEstimado: null })),
          tarefas: resultado.tarefas.map((tarefa) => ({ ...tarefa, servicoChave: tarefa.servicoContaId || null })),
          vinculos: [],
        })),
      )),
    ).subscribe({
      next: (modelo) => {
        this.toast.sucesso(`${resultado.tarefas.length} tarefas importadas.`);
        this.ref.close(modelo);
      },
      error: (erro: unknown) => {
        this.gravando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}
