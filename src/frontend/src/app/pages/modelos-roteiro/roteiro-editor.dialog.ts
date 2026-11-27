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
import { NegocioClient, Roteiro } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { horaParaApi } from '../../shared/mascaras';
import { moverControle } from '../../shared/mestre-detalhe';
import { FecharModal } from '../../shared/fechar-modal';

/** Editor de roteiro em mestre e detalhe, no mesmo desenho do editor de briefing. */
@Component({
  selector: 'app-roteiro-editor-dialog',
  imports: [FecharModal, 
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatMenuModule, MatTooltipModule, CdkDropList, CdkDrag, CdkDragHandle, CampoHoraComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar roteiro' : 'Novo roteiro' }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <form [formGroup]="form" (submit)="$event.preventDefault()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome" matInput formControlName="nome" /></mat-form-field>
        </div>

        <div class="mestre-detalhe" formArrayName="secoes">
          <nav class="mestre" aria-label="Momentos do roteiro">
            <div cdkDropList (cdkDropListDropped)="moverSecao($event)">
              @for (secao of secoes.controls; track secao; let i = $index) {
                <button type="button" cdkDrag class="opcao" [class.ativa]="i === selecionada()" [attr.aria-current]="i === selecionada() ? 'true' : null" (click)="selecionada.set(i)">
                  <span class="opcao-texto">
                    <span class="titulo" [class.vazio]="!secao.value.titulo">{{ secao.value.titulo || 'Momento sem título' }}</span>
                    @if (secao.value.horario) { <span class="sub">{{ secao.value.horario }}</span> }
                  </span>
                  <span class="contagem">{{ itensDe(i).length }}</span>
                </button>
              } @empty {
                <p class="text-sm text-muted px-3 py-2 m-0">Nenhum momento ainda.</p>
              }
            </div>
            <button mat-button type="button" class="adicionar" (click)="adicionarSecao()"><mat-icon>add</mat-icon> Momento</button>
          </nav>

          <section class="detalhe">
            @if (secaoAtual(); as secao) {
              <div [formGroup]="secao">
                <div class="linha">
                  <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                    <input aria-label="Título do momento" matInput formControlName="titulo" placeholder="Título do momento" />
                  </mat-form-field>
                  <button mat-icon-button type="button" aria-label="Ações do momento" matTooltip="Ações do momento" [matMenuTriggerFor]="menuSecao"><mat-icon>more_vert</mat-icon></button>
                  <mat-menu #menuSecao="matMenu" xPosition="before">
                    <button mat-menu-item type="button" (click)="removerSecao(selecionada())"><mat-icon>delete</mat-icon> Remover momento</button>
                  </mat-menu>
                </div>
                <div class="linha mt-3">
                  <app-campo-hora rotulo="Horário" formControlName="horario" />
                  <div class="campo grow">
                    <mat-label class="font-semibold mb-2 block">Música</mat-label>
                    <mat-form-field appearance="outline" class="w-full"><input aria-label="Música" matInput formControlName="musica" /></mat-form-field>
                  </div>
                </div>

                <div class="lista" formArrayName="itens">
                  <span class="rotulo">Itens</span>
                  <div cdkDropList (cdkDropListDropped)="moverItem($event)">
                    @for (item of itensDe(selecionada()).controls; track item; let j = $index) {
                      <div class="item" cdkDrag [formGroupName]="j">
                        <mat-icon class="alca" cdkDragHandle aria-label="Arrastar para reordenar">drag_indicator</mat-icon>
                        <span class="numero">{{ j + 1 }}</span>
                        <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                          <input #campoItem [attr.aria-label]="'Item ' + (j + 1)" matInput formControlName="texto" placeholder="Descreva o item"
                            (keydown.enter)="$event.preventDefault(); adicionarItem(j)" />
                        </mat-form-field>
                        <button mat-icon-button type="button" aria-label="Remover item" matTooltip="Remover item" (click)="removerItem(j)"><mat-icon>close</mat-icon></button>
                      </div>
                    } @empty {
                      <p class="text-sm text-muted my-2">Nenhum item neste momento.</p>
                    }
                  </div>
                  <button mat-button type="button" class="adicionar" (click)="adicionarItem()"><mat-icon>add</mat-icon> Adicionar item</button>
                </div>
              </div>
            } @else {
              <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
                <p class="m-0">Crie o primeiro momento do roteiro.</p>
                <button mat-stroked-button type="button" (click)="adicionarSecao()"><mat-icon>add</mat-icon> Novo momento</button>
              </div>
            }
          </section>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styleUrl: '../../shared/mestre-detalhe.scss',
})
export class RoteiroEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Roteiro | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<RoteiroEditorDialog, boolean>);
  protected readonly selecionada = signal(0);
  private readonly camposItem = viewChildren<ElementRef<HTMLInputElement>>('campoItem');

  protected readonly form = this.fb.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    secoes: this.fb.array<FormGroup>([]),
  });

  constructor() {
    for (const secao of this.dados?.secoes ?? []) {
      this.secoes.push(this.novaSecao(secao.titulo ?? '', (secao.horario ?? '').slice(0, 5), secao.musica ?? '', secao.itens.map((item) => item.texto)));
    }
  }

  protected get secoes(): FormArray<FormGroup> {
    return this.form.controls.secoes;
  }

  protected secaoAtual(): FormGroup | null {
    return this.secoes.length > 0 ? this.secoes.at(Math.min(this.selecionada(), this.secoes.length - 1)) : null;
  }

  protected itensDe(i: number): FormArray {
    return this.secoes.at(i).get('itens') as FormArray;
  }

  protected adicionarSecao(): void {
    this.secoes.push(this.novaSecao('', '', '', ['']));
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

  protected adicionarItem(depois?: number): void {
    const itens = this.itensDe(this.selecionada());
    const posicao = depois == null ? itens.length : depois + 1;
    itens.insert(posicao, this.fb.nonNullable.group({ texto: '' }));
    setTimeout(() => this.camposItem()[posicao]?.nativeElement.focus());
  }

  protected removerItem(j: number): void {
    this.itensDe(this.selecionada()).removeAt(j);
  }

  protected moverItem(evento: CdkDragDrop<unknown>): void {
    moverControle(this.itensDe(this.selecionada()), evento.previousIndex, evento.currentIndex);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      nome: string | null;
      secoes: { titulo: string; horario: string; musica: string; itens: { texto: string }[] }[];
    };
    const pedido = {
      nome: valor.nome,
      secoes: valor.secoes.map((secao) => ({
        titulo: secao.titulo || null,
        horario: horaParaApi(secao.horario),
        musica: secao.musica || null,
        itens: secao.itens.filter((item) => item.texto?.trim()).map((item) => ({ texto: item.texto })),
      })),
    };
    const req = this.dados ? this.negocio.atualizarRoteiro(this.dados.id, pedido) : this.negocio.criarRoteiro(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Roteiro salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private novaSecao(titulo: string, horario: string, musica: string, itens: string[]): FormGroup {
    return this.fb.group({
      titulo: [titulo],
      horario: [horario],
      musica: [musica],
      itens: this.fb.array(itens.map((texto) => this.fb.nonNullable.group({ texto }))),
    });
  }
}

