import { Component, ElementRef, inject, viewChildren } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Inspiracao, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { moverControle } from '../../shared/mestre-detalhe';

/**
 * Editor de galeria de inspirações. Uma lista só, então fica no modal padrão, com a mesma lista do
 * mestre e detalhe: rótulo único, linhas numeradas e reordenáveis, Enter cria a próxima.
 */
@Component({
  selector: 'app-inspiracao-editor-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatTooltipModule, CdkDropList, CdkDrag, CdkDragHandle,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar galeria' : 'Nova galeria' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (submit)="$event.preventDefault()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div class="lista sem-margem" formArrayName="itens">
          <span class="rotulo">Imagens (URL)</span>
          <div cdkDropList (cdkDropListDropped)="mover($event)">
            @for (item of itens.controls; track item; let i = $index) {
              <div class="item" cdkDrag [formGroupName]="i">
                <mat-icon class="alca" cdkDragHandle aria-label="Arrastar para reordenar">drag_indicator</mat-icon>
                <span class="numero">{{ i + 1 }}</span>
                <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                  <input #campoUrl [attr.aria-label]="'URL ' + (i + 1)" matInput formControlName="url" placeholder="https://…"
                    (keydown.enter)="$event.preventDefault(); adicionarItem(i)" />
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Remover imagem" matTooltip="Remover imagem" (click)="removerItem(i)"><mat-icon>close</mat-icon></button>
              </div>
            } @empty {
              <p class="text-sm text-muted my-2">Nenhuma imagem nesta galeria.</p>
            }
          </div>
          <button mat-button type="button" class="adicionar" (click)="adicionarItem()"><mat-icon>add</mat-icon> Adicionar URL</button>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styleUrl: '../../shared/mestre-detalhe.scss',
  styles: `.sem-margem { margin-top: 0; }`,
})
export class InspiracaoEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Inspiracao | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<InspiracaoEditorDialog, boolean>);
  private readonly camposUrl = viewChildren<ElementRef<HTMLInputElement>>('campoUrl');

  protected readonly form = this.fb.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    itens: this.fb.array((this.dados?.itens?.length ? this.dados.itens.map((item) => item.url ?? '') : ['']).map((url) => this.fb.nonNullable.group({ url }))),
  });

  protected get itens(): FormArray {
    return this.form.controls.itens;
  }

  protected adicionarItem(depois?: number): void {
    const posicao = depois == null ? this.itens.length : depois + 1;
    this.itens.insert(posicao, this.fb.nonNullable.group({ url: '' }));
    setTimeout(() => this.camposUrl()[posicao]?.nativeElement.focus());
  }

  protected removerItem(i: number): void {
    this.itens.removeAt(i);
  }

  protected mover(evento: CdkDragDrop<unknown>): void {
    moverControle(this.itens, evento.previousIndex, evento.currentIndex);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as { nome: string | null; itens: { url: string }[] };
    const pedido = {
      nome: valor.nome,
      itens: valor.itens.map((item) => ({ url: item.url?.trim() || null, arquivoId: null })).filter((item) => item.url),
    };
    const req = this.dados ? this.negocio.atualizarInspiracao(this.dados.id, pedido) : this.negocio.criarInspiracao(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Galeria salva.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
