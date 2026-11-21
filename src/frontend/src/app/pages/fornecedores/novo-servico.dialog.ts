import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, ServicoConta } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-novo-servico-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Novo serviço</h2>
    <mat-dialog-content>
      <div class="campo full">
        <mat-label class="font-semibold mb-2 block">Nome</mat-label>
        <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Nome'" matInput [formControl]="nome" maxlength="200" (keydown.enter)="salvar()" />
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Criar</button>
    </mat-dialog-actions>
  `,
  styles: `.full { width: 100%; display: block; margin-top: 8px; }`,
})
export class NovoServicoDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject(MatDialogRef<NovoServicoDialog, ServicoConta>);
  protected readonly nome = this.fb.nonNullable.control('', Validators.required);

  protected salvar(): void {
    if (this.nome.invalid || !this.nome.value.trim()) {
      this.nome.markAsTouched();
      return;
    }
    this.negocio.criarServicoConta(this.nome.value.trim()).subscribe({
      next: (servico) => {
        this.toast.sucesso('Serviço criado.');
        this.ref.close(servico);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
