import { Component, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cronograma, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { horaParaApi } from '../../shared/mascaras';
import { moverControle } from '../../shared/mestre-detalhe';

/** Editor de cronograma em mestre e detalhe: itens à esquerda, campos do item escolhido à direita. */
@Component({
  selector: 'app-cronograma-editor-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatMenuModule, MatTooltipModule, CdkDropList, CdkDrag, CampoDataComponent, CampoHoraComponent, GdDataPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar cronograma' : 'Novo cronograma' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (submit)="$event.preventDefault()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Título</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Título" matInput formControlName="titulo" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
          <mat-form-field appearance="outline" class="w-full"><textarea aria-label="Descrição" matInput rows="2" formControlName="descricao"></textarea></mat-form-field>
        </div>

        <div class="mestre-detalhe" formArrayName="itens">
          <nav class="mestre" aria-label="Itens do cronograma">
            <div cdkDropList (cdkDropListDropped)="moverItem($event)">
              @for (item of itens.controls; track item; let i = $index) {
                <button type="button" cdkDrag class="opcao" [class.ativa]="i === selecionado()" [attr.aria-current]="i === selecionado() ? 'true' : null" (click)="selecionado.set(i)">
                  <span class="opcao-texto">
                    <span class="titulo" [class.vazio]="!item.value.rotulo">{{ item.value.rotulo || 'Item sem rótulo' }}</span>
                    @if (item.value.data || item.value.hora) {
                      <span class="sub">{{ item.value.data | gdData }}@if (item.value.data && item.value.hora) { · }{{ item.value.hora }}</span>
                    }
                  </span>
                </button>
              } @empty {
                <p class="text-sm text-muted px-3 py-2 m-0">Nenhum item ainda.</p>
              }
            </div>
            <button mat-button type="button" class="adicionar" (click)="adicionarItem()"><mat-icon>add</mat-icon> Item</button>
          </nav>

          <section class="detalhe">
            @if (itemAtual(); as item) {
              <div [formGroup]="item">
                <div class="linha">
                  <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                    <input aria-label="Rótulo do item" matInput formControlName="rotulo" placeholder="Rótulo do item" />
                  </mat-form-field>
                  <button mat-icon-button type="button" aria-label="Ações do item" matTooltip="Ações do item" [matMenuTriggerFor]="menuItem"><mat-icon>more_vert</mat-icon></button>
                  <mat-menu #menuItem="matMenu" xPosition="before">
                    <button mat-menu-item type="button" (click)="removerItem(selecionado())"><mat-icon>delete</mat-icon> Remover item</button>
                  </mat-menu>
                </div>
                <div class="linha mt-3">
                  <app-campo-data rotulo="Data" formControlName="data" />
                  <app-campo-hora rotulo="Hora" formControlName="hora" />
                </div>
                <div class="campo mt-2">
                  <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input aria-label="Responsável" matInput formControlName="responsavel" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Recado aos fornecedores</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><textarea aria-label="Recado aos fornecedores" matInput rows="2" formControlName="recadoFornecedores"></textarea></mat-form-field>
                </div>
              </div>
            } @else {
              <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
                <p class="m-0">Crie o primeiro item do cronograma.</p>
                <button mat-stroked-button type="button" (click)="adicionarItem()"><mat-icon>add</mat-icon> Novo item</button>
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
export class CronogramaEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Cronograma | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<CronogramaEditorDialog, boolean>);
  protected readonly selecionado = signal(0);

  protected readonly form = this.fb.group({
    titulo: [this.dados?.titulo ?? '', Validators.required],
    descricao: [this.dados?.descricao ?? ''],
    itens: this.fb.array<FormGroup>([]),
  });

  constructor() {
    for (const item of this.dados?.itens ?? []) {
      this.itens.push(this.novoItem(item.rotulo ?? '', deIsoParaData(item.data), (item.hora ?? '').slice(0, 5), item.responsavel ?? '', item.recadoFornecedores ?? ''));
    }
  }

  protected get itens(): FormArray<FormGroup> {
    return this.form.controls.itens;
  }

  protected itemAtual(): FormGroup | null {
    return this.itens.length > 0 ? this.itens.at(Math.min(this.selecionado(), this.itens.length - 1)) : null;
  }

  protected adicionarItem(): void {
    this.itens.push(this.novoItem('', null, '', '', ''));
    this.selecionado.set(this.itens.length - 1);
  }

  protected removerItem(i: number): void {
    this.itens.removeAt(i);
    this.selecionado.set(Math.max(0, Math.min(i, this.itens.length - 1)));
  }

  protected moverItem(evento: CdkDragDrop<unknown>): void {
    const atual = this.itens.at(this.selecionado());
    moverControle(this.itens, evento.previousIndex, evento.currentIndex);
    this.selecionado.set(this.itens.controls.indexOf(atual));
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      titulo: string | null;
      descricao: string | null;
      itens: { rotulo: string; data: Date | null; hora: string; responsavel: string; recadoFornecedores: string }[];
    };
    const pedido = {
      titulo: valor.titulo,
      descricao: valor.descricao || null,
      itens: valor.itens.map((item) => ({
        rotulo: item.rotulo || null,
        data: deDataParaIso(item.data),
        hora: horaParaApi(item.hora),
        responsavel: item.responsavel || null,
        recadoFornecedores: item.recadoFornecedores || null,
      })),
    };
    const req = this.dados ? this.negocio.atualizarCronograma(this.dados.id, pedido) : this.negocio.criarCronograma(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Cronograma salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private novoItem(rotulo: string, data: Date | null, hora: string, responsavel: string, recado: string): FormGroup {
    return this.fb.group({ rotulo: [rotulo], data: [data], hora: [hora], responsavel: [responsavel], recadoFornecedores: [recado] });
  }
}
