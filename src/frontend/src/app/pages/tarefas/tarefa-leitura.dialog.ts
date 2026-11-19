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
import { validarComprovante as validarArquivo } from '../../core/dinheiro.client';
import { AnexoTarefa } from '../../core/negocio.client';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { ChecklistTarefaComponent } from './checklist-tarefa';

export type AcaoLeitura = 'editar' | 'mudou' | false;

@Component({
  selector: 'app-tarefa-leitura',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, GdDataPipe, ChecklistTarefaComponent],
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
          <app-checklist-tarefa [tarefa]="tarefa()" [editavel]="tarefa().eventoEmAndamento" (mudou)="checklistMudou($event)" />
        }
      }

      <button mat-button type="button" (click)="anexosAberto.set(!anexosAberto())">
        <mat-icon>{{ anexosAberto() ? 'expand_less' : 'expand_more' }}</mat-icon>
        Anexos ({{ tarefa().anexos.length }})
      </button>
      @if (anexosAberto()) {
        @if (tarefa().anexos.length === 0) {
          <p class="gd-vazio">Nenhum anexo.</p>
        } @else {
          <ul class="anexos">
            @for (anexo of tarefa().anexos; track anexo.id) {
              <li>
                <mat-icon>{{ anexo.tipoConteudo === 'application/pdf' ? 'picture_as_pdf' : 'image' }}</mat-icon>
                <button type="button" class="nome-anexo" (click)="abrirAnexo(anexo)">{{ anexo.nome }}</button>
                <span class="gd-sub">{{ anexo.enviadoEm | gdData }}</span>
                @if (tarefa().eventoEmAndamento) {
                  <button mat-icon-button type="button" [attr.aria-label]="'Remover ' + anexo.nome" (click)="removerAnexo(anexo)"><mat-icon>delete</mat-icon></button>
                }
              </li>
            }
          </ul>
        }
        @if (tarefa().eventoEmAndamento) {
          <label class="enviar-anexo">
            <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" (change)="anexar($event)" [disabled]="enviando()" />
            <span><mat-icon>attach_file</mat-icon> {{ enviando() ? 'Enviando…' : 'Anexar arquivo' }}</span>
          </label>
          <p class="gd-sub">JPG, JPEG, PNG ou PDF de até 5 MB. Fotos são reduzidas sem perder a leitura.</p>
        }
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
  styles: `.anexos { list-style: none; margin: 0 0 8px; padding: 0; } .anexos li { display: flex; align-items: center; gap: 8px; } .anexos mat-icon { color: var(--gd-muted-foreground); font-size: 18px; width: 18px; height: 18px; } .nome-anexo { border: 0; background: none; padding: 0; color: var(--gd-primary); cursor: pointer; font: inherit; text-align: left; } .enviar-anexo { display: inline-flex; position: relative; cursor: pointer; } .enviar-anexo input { position: absolute; inset: 0; opacity: 0; cursor: pointer; } .enviar-anexo span { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid var(--gd-border); border-radius: var(--gd-radius-botao); font-size: 14px; } .leitura { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; } dt { color: var(--gd-texto-suave); } dd { margin: 0; }`,
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
  protected readonly enviando = signal(false);
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

  protected anexar(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (!arquivo) return;
    const problema = validarArquivo(arquivo);
    if (problema) {
      this.toast.erro(problema);
      return;
    }
    this.enviando.set(true);
    this.negocio.anexarTarefa(this.tarefa().id, arquivo).subscribe({
      next: (tarefa) => {
        this.enviando.set(false);
        this.tarefa.set(tarefa);
        this.mudou = true;
        this.toast.sucesso('Arquivo anexado.');
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected abrirAnexo(anexo: AnexoTarefa): void {
    const janela = window.open('', '_blank');
    this.negocio.baixarArquivo(anexo.arquivoId).subscribe({
      next: (conteudo) => {
        const url = URL.createObjectURL(conteudo);
        if (janela) janela.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        janela?.close();
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected removerAnexo(anexo: AnexoTarefa): void {
    this.negocio.removerAnexoTarefa(this.tarefa().id, anexo.id).subscribe({
      next: (tarefa) => {
        this.tarefa.set(tarefa);
        this.mudou = true;
        this.toast.sucesso('Anexo removido.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected checklistMudou(tarefa: Tarefa): void {
    this.tarefa.set(tarefa);
    this.mudou = true;
  }

  protected fechar(): void {
    this.ref.close(this.mudou ? 'mudou' : false);
  }
}
