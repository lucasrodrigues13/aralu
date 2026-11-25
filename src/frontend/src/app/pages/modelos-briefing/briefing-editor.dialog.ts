import { Component, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Briefing, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { moverControle } from '../../shared/mestre-detalhe';

/**
 * Editor de modelo de briefing em mestre e detalhe: seções à esquerda, a seção escolhida à direita
 * com título, descrição e a lista de perguntas (sem rótulo repetido, reordenável).
 */
@Component({
  selector: 'app-briefing-editor-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatMenuModule, MatTooltipModule, CdkDropList, CdkDrag, CdkDragHandle,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar briefing' : 'Novo briefing' }}</h2>
    <mat-dialog-content>
      @if (somenteLeitura) {
        <p class="flex gap-3 rounded p-4 mb-4 bg-light-info text-info">Modelo padrão: clone antes de editar.</p>
      }
      <form [formGroup]="form" (submit)="$event.preventDefault()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome" matInput formControlName="nome" [readonly]="somenteLeitura" /></mat-form-field>
        </div>

        <div class="mestre-detalhe" formArrayName="secoes">
          <nav class="mestre" aria-label="Seções do briefing">
            <div cdkDropList (cdkDropListDropped)="moverSecao($event)" [cdkDropListDisabled]="somenteLeitura">
              @for (secao of secoes.controls; track secao; let i = $index) {
                <button type="button" cdkDrag class="opcao" [class.ativa]="i === selecionada()" [attr.aria-current]="i === selecionada() ? 'true' : null" (click)="selecionada.set(i)">
                  <span class="titulo" [class.vazio]="!secao.value.titulo">{{ secao.value.titulo || 'Seção sem título' }}</span>
                  <span class="contagem">{{ perguntasDe(i).length }}</span>
                </button>
              } @empty {
                <p class="text-sm text-muted px-3 py-2 m-0">Nenhuma seção ainda.</p>
              }
            </div>
            @if (!somenteLeitura) {
              <button mat-button type="button" class="adicionar" (click)="adicionarSecao()"><mat-icon>add</mat-icon> Seção</button>
            }
          </nav>

          <section class="detalhe">
            @if (secaoAtual(); as secao) {
              <div [formGroup]="secao">
                <div class="linha">
                  <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                    <input aria-label="Título da seção" matInput formControlName="titulo" placeholder="Título da seção" [readonly]="somenteLeitura" />
                  </mat-form-field>
                  @if (!somenteLeitura) {
                    <button mat-icon-button type="button" aria-label="Ações da seção" matTooltip="Ações da seção" [matMenuTriggerFor]="menuSecao"><mat-icon>more_vert</mat-icon></button>
                    <mat-menu #menuSecao="matMenu" xPosition="before">
                      <button mat-menu-item type="button" (click)="removerSecao(selecionada())"><mat-icon>delete</mat-icon> Remover seção</button>
                    </mat-menu>
                  }
                </div>
                <mat-form-field appearance="outline" class="w-full mt-2" subscriptSizing="dynamic">
                  <textarea aria-label="Descrição da seção" matInput rows="2" formControlName="descricao" placeholder="Descrição (opcional)" [readonly]="somenteLeitura"></textarea>
                </mat-form-field>

                <div class="lista" formArrayName="perguntas">
                  <span class="rotulo">Perguntas</span>
                  <div cdkDropList (cdkDropListDropped)="moverPergunta($event)" [cdkDropListDisabled]="somenteLeitura">
                    @for (pergunta of perguntasDe(selecionada()).controls; track pergunta; let j = $index) {
                      <div class="item" cdkDrag [formGroupName]="j">
                        @if (!somenteLeitura) { <mat-icon class="alca" cdkDragHandle aria-label="Arrastar para reordenar">drag_indicator</mat-icon> }
                        <span class="numero">{{ j + 1 }}</span>
                        <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                          <input #campoPergunta [attr.aria-label]="'Pergunta ' + (j + 1)" matInput formControlName="enunciado" placeholder="Escreva a pergunta"
                            [readonly]="somenteLeitura" (keydown.enter)="$event.preventDefault(); adicionarPergunta(j)" />
                        </mat-form-field>
                        @if (!somenteLeitura) {
                          <button mat-icon-button type="button" aria-label="Remover pergunta" matTooltip="Remover pergunta" (click)="removerPergunta(j)"><mat-icon>close</mat-icon></button>
                        }
                      </div>
                    } @empty {
                      <p class="text-sm text-muted my-2">Nenhuma pergunta nesta seção.</p>
                    }
                  </div>
                  @if (!somenteLeitura) {
                    <button mat-button type="button" class="adicionar" (click)="adicionarPergunta()"><mat-icon>add</mat-icon> Adicionar pergunta</button>
                  }
                </div>
              </div>
            } @else {
              <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
                <p class="m-0">Crie a primeira seção para começar a adicionar perguntas.</p>
                @if (!somenteLeitura) { <button mat-stroked-button type="button" (click)="adicionarSecao()"><mat-icon>add</mat-icon> Nova seção</button> }
              </div>
            }
          </section>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      @if (somenteLeitura) {
        <button mat-flat-button type="button" (click)="clonar()">Clonar</button>
      } @else {
        <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
      }
    </mat-dialog-actions>
  `,
  styleUrl: '../../shared/mestre-detalhe.scss',
})
export class BriefingEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Briefing | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<BriefingEditorDialog, boolean>);
  protected readonly somenteLeitura = !!this.dados?.padrao;
  protected readonly selecionada = signal(0);
  private readonly camposPergunta = viewChildren<ElementRef<HTMLInputElement>>('campoPergunta');

  protected readonly form = this.fb.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    secoes: this.fb.array<FormGroup>([]),
  });

  constructor() {
    for (const secao of this.dados?.secoes ?? []) {
      this.secoes.push(this.novaSecao(secao.titulo, secao.descricao ?? '', secao.perguntas.map((p) => p.enunciado)));
    }
  }

  protected get secoes(): FormArray<FormGroup> {
    return this.form.controls.secoes;
  }

  protected secaoAtual(): FormGroup | null {
    return this.secoes.length > 0 ? this.secoes.at(Math.min(this.selecionada(), this.secoes.length - 1)) : null;
  }

  protected perguntasDe(i: number): FormArray {
    return this.secoes.at(i).get('perguntas') as FormArray;
  }

  protected adicionarSecao(): void {
    this.secoes.push(this.novaSecao('', '', ['']));
    this.selecionada.set(this.secoes.length - 1);
  }

  protected removerSecao(i: number): void {
    this.secoes.removeAt(i);
    this.selecionada.set(Math.max(0, Math.min(i, this.secoes.length - 1)));
  }

  protected moverSecao(evento: CdkDragDrop<unknown>): void {
    const atual = this.secoes.at(this.selecionada());
    moverControle(this.secoes, evento.previousIndex, evento.currentIndex);
    this.selecionada.set(this.secoes.controls.indexOf(atual));
  }

  /** Sem índice, adiciona no fim; com índice (Enter numa pergunta), logo abaixo dela e já com o cursor. */
  protected adicionarPergunta(depois?: number): void {
    const perguntas = this.perguntasDe(this.selecionada());
    const posicao = depois == null ? perguntas.length : depois + 1;
    perguntas.insert(posicao, this.fb.nonNullable.group({ enunciado: '' }));
    setTimeout(() => this.camposPergunta()[posicao]?.nativeElement.focus());
  }

  protected removerPergunta(j: number): void {
    this.perguntasDe(this.selecionada()).removeAt(j);
  }

  protected moverPergunta(evento: CdkDragDrop<unknown>): void {
    moverControle(this.perguntasDe(this.selecionada()), evento.previousIndex, evento.currentIndex);
  }

  protected salvar(): void {
    const semTitulo = this.secoes.controls.findIndex((secao) => !String(secao.value.titulo ?? '').trim());
    if (semTitulo >= 0) {
      this.selecionada.set(semTitulo);
      this.secoes.at(semTitulo).markAllAsTouched();
      this.toast.erro('Dê um título a todas as seções.');
      return;
    }
    const valor = this.form.getRawValue() as { nome: string | null; secoes: { titulo: string; descricao: string; perguntas: { enunciado: string }[] }[] };
    const pedido = {
      nome: valor.nome,
      secoes: valor.secoes.map((secao) => ({
        titulo: secao.titulo,
        descricao: secao.descricao || null,
        perguntas: secao.perguntas.filter((p) => p.enunciado?.trim()).map((p) => ({ enunciado: p.enunciado, tipo: 'TextoCurto' })),
      })),
    };
    const req = this.dados ? this.negocio.atualizarBriefing(this.dados.id, pedido) : this.negocio.criarBriefing(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Briefing salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected clonar(): void {
    if (!this.dados) {
      return;
    }
    this.negocio.clonarBriefing(this.dados.id).subscribe({
      next: () => {
        this.toast.sucesso('Briefing clonado.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }


  private novaSecao(titulo: string, descricao: string, perguntas: string[]): FormGroup {
    return this.fb.group({
      titulo: [titulo, Validators.required],
      descricao: [descricao],
      perguntas: this.fb.array(perguntas.map((enunciado) => this.fb.nonNullable.group({ enunciado }))),
    });
  }
}
