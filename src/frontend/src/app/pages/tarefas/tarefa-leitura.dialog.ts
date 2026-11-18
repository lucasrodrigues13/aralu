import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  NegocioClient,
  PAPEIS_RESPONSAVEL_TAREFA,
  PRIORIDADES_TAREFA,
  SITUACOES_TAREFA,
  Tarefa,
  VISIBILIDADES_TAREFA,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { GdDataPipe } from '../../shared/gd-data.pipe';

export type AcaoLeitura = 'editar' | 'mudou' | false;

@Component({
  selector: 'app-tarefa-leitura',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, GdDataPipe],
  template: `
    <h2 mat-dialog-title>{{ tarefa().titulo }}</h2>
    <p class="gd-dialog-descricao">{{ tarefa().evento }}</p>
    <mat-dialog-content>
      <dl class="leitura">
        <div><dt>Prazo</dt><dd>{{ tarefa().prazo | gdData }}</dd></div>
        <div><dt>Situação</dt><dd>{{ rotulo(situacoes, tarefa().situacao) }}</dd></div>
        <div><dt>Responsáveis</dt><dd>{{ responsaveis() }}</dd></div>
        <div><dt>Visibilidade</dt><dd>{{ rotulo(visibilidades, tarefa().visibilidade) }}</dd></div>
        <div><dt>Prioridade</dt><dd>{{ rotulo(prioridades, tarefa().prioridade) }}</dd></div>
        <div><dt>Grupo</dt><dd>{{ tarefa().grupo || '—' }}</dd></div>
        <div><dt>Serviço</dt><dd>{{ tarefa().servico || '—' }}</dd></div>
      </dl>
      @if (tarefa().descricao) { <p>{{ tarefa().descricao }}</p> }

      <button mat-button type="button" (click)="checklistAberto.set(!checklistAberto())">
        <mat-icon>{{ checklistAberto() ? 'expand_less' : 'expand_more' }}</mat-icon>
        Checklist
      </button>
      @if (checklistAberto()) {
        @if (tarefa().checklist.length === 0) {
          <p class="gd-vazio">Nenhum item.</p>
        } @else {
          <ul>
            @for (item of tarefa().checklist; track item.id) {
              <li>{{ item.feito ? 'Feito' : 'A fazer' }} — {{ item.texto }}</li>
            }
          </ul>
        }
      }

      <button mat-button type="button" (click)="anexosAberto.set(!anexosAberto())">
        <mat-icon>{{ anexosAberto() ? 'expand_less' : 'expand_more' }}</mat-icon>
        Anexos
      </button>
      @if (anexosAberto()) {
        <p class="gd-vazio">Nenhum anexo.</p>
      }

      <h3>Comentários</h3>
      @if (tarefa().comentarios.length === 0) {
        <p class="gd-vazio">Nenhum comentário.</p>
      } @else {
        <ul>
          @for (comentario of tarefa().comentarios; track comentario.id) {
            <li>{{ comentario.texto }}</li>
          }
        </ul>
      }
      @if (tarefa().eventoEmAndamento) {
        <form class="gd-campos" [formGroup]="comentario" (ngSubmit)="comentar()">
          <mat-form-field class="inteiro" appearance="outline">
            <mat-label>Comentário</mat-label>
            <textarea matInput rows="2" formControlName="texto"></textarea>
          </mat-form-field>
          <button mat-stroked-button type="submit">Comentar</button>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="fechar()">Fechar</button>
      @if (tarefa().eventoEmAndamento) {
        <button mat-flat-button type="button" (click)="ref.close('editar')">Editar</button>
      }
    </mat-dialog-actions>
  `,
  styles: `.leitura { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; } dt { color: var(--gd-texto-suave); } dd { margin: 0; }`,
})
export class TarefaLeituraDialog {
  private readonly dados = inject<Tarefa>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<TarefaLeituraDialog, AcaoLeitura>);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly tarefa = signal(this.dados);
  protected readonly checklistAberto = signal(false);
  protected readonly anexosAberto = signal(false);
  protected readonly situacoes = SITUACOES_TAREFA;
  protected readonly prioridades = PRIORIDADES_TAREFA;
  protected readonly visibilidades = VISIBILIDADES_TAREFA;
  private mudou = false;
  protected readonly comentario = this.fb.nonNullable.group({ texto: ['', Validators.required] });

  protected rotulo(lista: { valor: string; rotulo: string }[], valor: string): string {
    return lista.find((item) => item.valor === valor)?.rotulo ?? valor;
  }

  protected responsaveis(): string {
    return this.tarefa().responsaveis
      .map((item) => PAPEIS_RESPONSAVEL_TAREFA.find((papel) => papel.valor === item.papel)?.rotulo ?? item.papel)
      .join(', ');
  }

  protected comentar(): void {
    if (this.comentario.invalid) {
      this.toast.erro('Informe o comentário.');
      return;
    }
    this.negocio.comentarTarefa(this.tarefa().id, this.comentario.controls.texto.value).subscribe({
      next: (tarefa) => {
        this.tarefa.set(tarefa);
        this.comentario.reset();
        this.mudou = true;
        this.toast.sucesso('Comentário registrado.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected fechar(): void {
    this.ref.close(this.mudou ? 'mudou' : false);
  }
}
