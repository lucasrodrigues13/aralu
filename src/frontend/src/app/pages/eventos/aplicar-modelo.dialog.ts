import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Modelo, NegocioClient, PreviaAplicarModelo } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { FecharModal } from '../../shared/fechar-modal';

export interface AplicarModeloDados {
  eventoId: string;
  tipo: string;
}

@Component({
  selector: 'app-aplicar-modelo',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Aplicar modelo <app-fechar-modal [manual]="true" (fechar)="ref.close(false)" /></h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Acrescenta só o que ainda não existe no evento.</p>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Modelo</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Modelo'" formControlName="modeloId" (selectionChange)="carregarPrevia()">
            @for (m of modelos(); track m.id) {
              <mat-option [value]="m.id">{{ m.nome }} · {{ m.tarefas.length }} tarefas · {{ m.servicos.length }} serviços</mat-option>
            }
          </mat-select>
        </mat-form-field>
        </div>
      </form>
      @if (previa(); as p) {
        <p class="text-muted">{{ p.resumo }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(false)">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="!previa()" (click)="aplicar()">Aplicar</button>
    </mat-dialog-actions>
  `,
})
export class AplicarModeloDialog implements OnInit {
  protected readonly dados = inject<AplicarModeloDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<AplicarModeloDialog, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly modelos = signal<Modelo[]>([]);
  protected readonly previa = signal<PreviaAplicarModelo | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    modeloId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.negocio.modelos().subscribe({
      next: (lista) => {
        const doTipo = lista.filter((m) => m.tipo === this.dados.tipo);
        this.modelos.set(doTipo);
        if (doTipo.length === 1) {
          this.form.controls.modeloId.setValue(doTipo[0].id);
          this.carregarPrevia();
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected carregarPrevia(): void {
    const modeloId = this.form.controls.modeloId.value;
    if (!modeloId) {
      this.previa.set(null);
      return;
    }
    this.negocio.previaAplicarModelo(this.dados.eventoId, modeloId).subscribe({
      next: (previa) => this.previa.set(previa),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected aplicar(): void {
    const modeloId = this.form.controls.modeloId.value;
    if (!modeloId) {
      return;
    }
    this.negocio.aplicarModelo(this.dados.eventoId, modeloId).subscribe({
      next: () => {
        this.toast.sucesso('Modelo aplicado.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
