import { Component, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Inspiracao, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { moverControle } from '../../shared/mestre-detalhe';
import { LIMITE_ARQUIVO_BYTES, reduzirImagem } from '../../shared/reduzir-imagem';
import { PreviasArquivo } from './previas-arquivo';

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'application/pdf'];

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
          <span class="rotulo">Imagens</span>
          <div cdkDropList (cdkDropListDropped)="mover($event)">
            @for (item of itens.controls; track item; let i = $index) {
              <div class="item" cdkDrag [formGroupName]="i">
                <mat-icon class="alca" cdkDragHandle aria-label="Arrastar para reordenar">drag_indicator</mat-icon>
                <span class="numero">{{ i + 1 }}</span>
                @if (item.value.arquivoId; as arquivoId) {
                  <div class="arquivo grow">
                    @if (previas.previas()[arquivoId]; as previa) {
                      @if (previa.pdf) {
                        <mat-icon class="miniatura-icone">picture_as_pdf</mat-icon>
                      } @else {
                        <img class="miniatura" [src]="previa.url" alt="" />
                      }
                    } @else {
                      <mat-icon class="miniatura-icone">image</mat-icon>
                    }
                    <span class="truncate">{{ item.value.nome || 'Arquivo ' + (i + 1) }}</span>
                  </div>
                } @else {
                <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                  <input #campoUrl [attr.aria-label]="'URL ' + (i + 1)" matInput formControlName="url" placeholder="https://…"
                    (keydown.enter)="$event.preventDefault(); adicionarItem(i)" />
                </mat-form-field>
                }
                <button mat-icon-button type="button" aria-label="Remover imagem" matTooltip="Remover imagem" (click)="removerItem(i)"><mat-icon>close</mat-icon></button>
              </div>
            } @empty {
              <p class="text-sm text-muted my-2">Nenhuma imagem nesta galeria.</p>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            <button mat-button type="button" class="adicionar" (click)="adicionarItem()"><mat-icon>add</mat-icon> Adicionar URL</button>
            <button mat-button type="button" class="adicionar" [disabled]="enviando()" (click)="seletor.click()">
              <mat-icon>upload</mat-icon> {{ enviando() ? 'Enviando…' : 'Adicionar imagens' }}
            </button>
            <input #seletor type="file" hidden multiple accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" (change)="escolher($event)" />
          </div>
          <p class="text-xs text-muted mt-1">JPG, JPEG, PNG ou PDF até 5 MB. Imagens maiores são reduzidas automaticamente.</p>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="enviando()" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styleUrl: '../../shared/mestre-detalhe.scss',
  styles: `
    .sem-margem { margin-top: 0; }
    .arquivo { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 44px; }
    .miniatura { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; flex: none; }
    .miniatura-icone { width: 44px; text-align: center; color: var(--mat-sys-on-surface-variant); flex: none; }
  `,
  providers: [PreviasArquivo],
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
    itens: this.fb.array(
      (this.dados?.itens?.length ? this.dados.itens : [{ url: '', arquivoId: null }]).map((item) => this.novoItem(item.url ?? '', item.arquivoId)),
    ),
  });
  protected readonly previas = inject(PreviasArquivo);
  protected readonly enviando = signal(false);

  constructor() {
    this.dados?.itens.forEach((item) => item.arquivoId && this.previas.carregar(item.arquivoId));
  }

  private novoItem(url: string, arquivoId: string | null = null, nome = '') {
    return this.fb.nonNullable.group({ url, arquivoId: arquivoId as string | null, nome });
  }

  protected get itens(): FormArray {
    return this.form.controls.itens;
  }

  protected adicionarItem(depois?: number): void {
    const posicao = depois == null ? this.itens.length : depois + 1;
    this.itens.insert(posicao, this.novoItem(''));
    setTimeout(() => this.camposUrl()[posicao]?.nativeElement.focus());
  }

  protected removerItem(i: number): void {
    this.itens.removeAt(i);
  }

  protected mover(evento: CdkDragDrop<unknown>): void {
    moverControle(this.itens, evento.previousIndex, evento.currentIndex);
  }

  protected async escolher(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const arquivos = Array.from(campo.files ?? []);
    campo.value = '';
    if (!arquivos.length) {
      return;
    }
    this.enviando.set(true);
    try {
      for (const original of arquivos) {
        if (!TIPOS_ACEITOS.includes(original.type)) {
          this.toast.erro(`"${original.name}" não é JPG, JPEG, PNG ou PDF.`);
          continue;
        }
        const arquivo = await reduzirImagem(original);
        if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
          this.toast.erro(arquivo.type === 'application/pdf'
            ? `O PDF "${original.name}" passa de 5 MB.`
            : `Não foi possível reduzir "${original.name}" para até 5 MB.`);
          continue;
        }
        try {
          const enviado = await firstValueFrom(this.negocio.enviarArquivoInspiracao(arquivo));
          this.previas.guardar(enviado.arquivoId, arquivo);
          const vazio = this.itens.controls.findIndex((controle) => !controle.value.arquivoId && !controle.value.url?.trim());
          const novo = this.novoItem('', enviado.arquivoId, enviado.nome);
          if (vazio >= 0) {
            this.itens.setControl(vazio, novo);
          } else {
            this.itens.push(novo);
          }
        } catch (erro) {
          this.toast.erro(mensagemDeErro(erro));
        }
      }
    } finally {
      this.enviando.set(false);
    }
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as { nome: string | null; itens: { url: string; arquivoId: string | null }[] };
    const pedido = {
      nome: valor.nome,
      itens: valor.itens
        .map((item) => (item.arquivoId ? { url: null, arquivoId: item.arquivoId } : { url: item.url?.trim() || null, arquivoId: null }))
        .filter((item) => item.url || item.arquivoId),
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
