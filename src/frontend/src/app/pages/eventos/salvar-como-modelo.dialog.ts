import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, PreviaSalvarComoModelo } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

export interface SalvarComoModeloDados {
  eventoId: string;
  nomeEvento: string;
}

@Component({
  selector: 'app-salvar-como-modelo',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Salvar como modelo</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Cria um modelo com as tarefas e serviços deste evento.</p>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
      </form>
      @if (previa(); as p) {
        <p class="text-muted">{{ p.resumo }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="form.invalid || !previa()" (click)="salvar(false)">Salvar</button>
      <button mat-stroked-button type="button" [disabled]="form.invalid || !previa()" (click)="salvar(true)">Salvar e abrir</button>
    </mat-dialog-actions>
  `,
})
export class SalvarComoModeloDialog implements OnInit {
  protected readonly dados = inject<SalvarComoModeloDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<SalvarComoModeloDialog, string | undefined>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly previa = signal<PreviaSalvarComoModelo | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    nome: [`Modelo — ${this.dados.nomeEvento}`, Validators.required],
  });

  ngOnInit(): void {
    this.atualizarPrevia();
    this.form.controls.nome.valueChanges.subscribe(() => this.atualizarPrevia());
  }

  protected salvar(abrir: boolean): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const nome = this.form.controls.nome.value.trim();
    this.negocio.salvarComoModelo(this.dados.eventoId, nome).subscribe({
      next: (modelo) => {
        this.toast.sucesso('Modelo criado.');
        this.ref.close(modelo.id);
        if (abrir) {
          void this.router.navigate(['/modelos-evento', modelo.id]);
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private atualizarPrevia(): void {
    this.negocio.previaSalvarComoModelo(this.dados.eventoId, this.form.controls.nome.value).subscribe({
      next: (previa) => this.previa.set(previa),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
