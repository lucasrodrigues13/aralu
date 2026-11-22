import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable, map } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, ServicoConta } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { nomesDaLista } from './busca-servico';

export interface NovoServicoDados {
  nome?: string;
}

/** Fecha com a lista de serviços criados (ou já existentes com o mesmo nome). */
@Component({
  selector: 'app-novo-servico-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ emMassa() ? 'Novos serviços' : 'Novo serviço' }}</h2>
    <mat-dialog-content>
      <mat-checkbox [checked]="emMassa()" (change)="emMassa.set($event.checked)">Adicionar vários</mat-checkbox>
      @if (emMassa()) {
        <div class="campo full">
          <mat-label class="font-semibold mb-2 block">Nomes</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <textarea [attr.aria-label]="'Nomes'" matInput [formControl]="nomes" rows="4" placeholder="Banda, Fotografia, Buffet"></textarea>
            <mat-hint>Separe os nomes por vírgula.</mat-hint>
          </mat-form-field>
        </div>
      } @else {
        <div class="campo full">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input [attr.aria-label]="'Nome'" matInput [formControl]="nome" maxlength="200" (keydown.enter)="salvar()" />
          </mat-form-field>
        </div>
      }
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
  protected readonly ref = inject(MatDialogRef<NovoServicoDialog, ServicoConta[]>);
  /** Texto já digitado na busca de quem abriu o modal; com vírgula, já abre no modo em massa. */
  private readonly inicial = (inject<NovoServicoDados | null>(MAT_DIALOG_DATA, { optional: true })?.nome ?? '').trim();
  protected readonly emMassa = signal(this.inicial.includes(','));
  protected readonly nome = this.fb.nonNullable.control(this.emMassa() ? '' : this.inicial, Validators.required);
  protected readonly nomes = this.fb.nonNullable.control(this.emMassa() ? this.inicial : '', Validators.required);

  protected salvar(): void {
    const pedido = this.emMassa() ? this.pedidoEmMassa() : this.pedidoUnico();
    if (!pedido) {
      return;
    }
    pedido.subscribe({
      next: (servicos) => {
        this.toast.sucesso(servicos.length > 1 ? `${servicos.length} serviços criados.` : 'Serviço criado.');
        this.ref.close(servicos);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private pedidoUnico(): Observable<ServicoConta[]> | null {
    if (this.nome.invalid || !this.nome.value.trim()) {
      this.nome.markAsTouched();
      return null;
    }
    return this.negocio.criarServicoConta(this.nome.value.trim()).pipe(map((servico) => [servico]));
  }

  private pedidoEmMassa(): Observable<ServicoConta[]> | null {
    const lista = nomesDaLista(this.nomes.value);
    if (lista.length === 0) {
      this.nomes.markAsTouched();
      this.toast.erro('Informe ao menos um nome de serviço.');
      return null;
    }
    const longo = lista.find((nome) => nome.length > 200);
    if (longo) {
      this.toast.erro('O nome do serviço pode ter no máximo 200 caracteres.');
      return null;
    }
    return this.negocio.criarServicosConta(lista.join(', '));
  }
}
