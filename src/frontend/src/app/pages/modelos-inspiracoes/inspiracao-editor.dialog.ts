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

const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];

/**
 * Editor de galeria de inspirações. Fotos enviadas e URLs ficam em listas separadas, cada uma reordenável; ao salvar
 * vão as fotos primeiro e depois as URLs.
 */
@Component({
  selector: 'app-inspiracao-editor-dialog',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatTooltipModule, CdkDropList, CdkDrag, CdkDragHandle,
  ],
  providers: [PreviasArquivo],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar galeria' : 'Nova galeria' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (submit)="$event.preventDefault()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome" matInput formControlName="nome" /></mat-form-field>
        </div>

        <div class="lista sem-margem">
          <span class="rotulo">Fotos ({{ fotos.length }})</span>
          <div class="grade" cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="moverFoto($event)">
            @for (foto of fotos.controls; track foto; let i = $index) {
              <div class="foto" cdkDrag [matTooltip]="foto.value.nome || ''">
                @if (previas.previas()[foto.value.arquivoId]; as previa) {
                  <img [src]="previa.url" [alt]="'Foto ' + (i + 1)" />
                } @else {
                  <mat-icon class="icone">image</mat-icon>
                }
                <button type="button" class="remover" aria-label="Remover foto" (click)="fotos.removeAt(i)"><mat-icon>close</mat-icon></button>
              </div>
            }
            <button type="button" class="foto adicionar-foto" [disabled]="enviando()" (click)="seletor.click()">
              <mat-icon>{{ enviando() ? 'hourglass_empty' : 'upload' }}</mat-icon>
              <span>{{ enviando() ? 'Enviando…' : 'Adicionar' }}</span>
            </button>
          </div>
          <input #seletor type="file" hidden multiple accept=".jpg,.jpeg,.png,image/jpeg,image/png" (change)="escolher($event)" />
          <p class="text-xs text-muted mt-1">JPG, JPEG ou PNG até 5 MB. Arraste para reordenar; imagens grandes são reduzidas automaticamente.</p>
        </div>

        <div class="lista" formArrayName="urls">
          <span class="rotulo">URLs ({{ urls.length }})</span>
          <div cdkDropList (cdkDropListDropped)="moverUrl($event)">
            @for (item of urls.controls; track item; let i = $index) {
              <div class="item" cdkDrag [formGroupName]="i">
                <mat-icon class="alca" cdkDragHandle aria-label="Arrastar para reordenar">drag_indicator</mat-icon>
                <span class="numero">{{ i + 1 }}</span>
                <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
                  <input #campoUrl [attr.aria-label]="'URL ' + (i + 1)" matInput formControlName="url" placeholder="https://…"
                    (keydown.enter)="$event.preventDefault(); adicionarUrl(i)" />
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Remover URL" matTooltip="Remover URL" (click)="urls.removeAt(i)"><mat-icon>close</mat-icon></button>
              </div>
            } @empty {
              <p class="text-sm text-muted my-2">Nenhuma URL nesta galeria.</p>
            }
          </div>
          <button mat-button type="button" class="adicionar" (click)="adicionarUrl()"><mat-icon>add</mat-icon> Adicionar URL</button>
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
    .grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; margin-top: 6px; }
    .foto { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--mat-sys-surface-container); display: flex; align-items: center; justify-content: center; cursor: grab; }
    .foto img { width: 100%; height: 100%; object-fit: cover; }
    .icone { color: var(--mat-sys-on-surface-variant); }
    .remover { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--mat-sys-surface) 90%, transparent); color: var(--mat-sys-on-surface); }
    .remover mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .adicionar-foto { flex-direction: column; gap: 2px; border: 1px dashed var(--mat-sys-outline); background: transparent; color: var(--mat-sys-on-surface-variant); font: inherit; font-size: 0.75rem; cursor: pointer; }
  `,
})
export class InspiracaoEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Inspiracao | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<InspiracaoEditorDialog, boolean>);
  protected readonly previas = inject(PreviasArquivo);
  protected readonly enviando = signal(false);
  private readonly camposUrl = viewChildren<ElementRef<HTMLInputElement>>('campoUrl');

  protected readonly form = this.fb.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    fotos: this.fb.array((this.dados?.itens ?? []).filter((item) => item.arquivoId).map((item) => this.novaFoto(item.arquivoId!))),
    urls: this.fb.array((this.dados?.itens ?? []).filter((item) => !item.arquivoId && item.url).map((item) => this.novaUrl(item.url!))),
  });

  constructor() {
    this.dados?.itens.forEach((item) => item.arquivoId && this.previas.carregar(item.arquivoId));
  }

  protected get fotos(): FormArray {
    return this.form.controls.fotos;
  }

  protected get urls(): FormArray {
    return this.form.controls.urls;
  }

  private novaFoto(arquivoId: string, nome = '') {
    return this.fb.nonNullable.group({ arquivoId, nome });
  }

  private novaUrl(url: string) {
    return this.fb.nonNullable.group({ url });
  }

  protected adicionarUrl(depois?: number): void {
    const posicao = depois == null ? this.urls.length : depois + 1;
    this.urls.insert(posicao, this.novaUrl(''));
    setTimeout(() => this.camposUrl()[posicao]?.nativeElement.focus());
  }

  protected moverFoto(evento: CdkDragDrop<unknown>): void {
    moverControle(this.fotos, evento.previousIndex, evento.currentIndex);
  }

  protected moverUrl(evento: CdkDragDrop<unknown>): void {
    moverControle(this.urls, evento.previousIndex, evento.currentIndex);
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
          this.toast.erro(`"${original.name}" não é JPG, JPEG ou PNG.`);
          continue;
        }
        const arquivo = await reduzirImagem(original);
        if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
          this.toast.erro(`Não foi possível reduzir "${original.name}" para até 5 MB.`);
          continue;
        }
        try {
          const enviado = await firstValueFrom(this.negocio.enviarArquivoInspiracao(arquivo));
          this.previas.guardar(enviado.arquivoId, arquivo);
          this.fotos.push(this.novaFoto(enviado.arquivoId, enviado.nome));
        } catch (erro) {
          this.toast.erro(mensagemDeErro(erro));
        }
      }
    } finally {
      this.enviando.set(false);
    }
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as { nome: string | null; fotos: { arquivoId: string }[]; urls: { url: string }[] };
    const pedido = {
      nome: valor.nome,
      itens: [
        ...valor.fotos.map((foto) => ({ arquivoId: foto.arquivoId, url: null })),
        ...valor.urls.map((item) => item.url?.trim()).filter((url) => url).map((url) => ({ arquivoId: null, url })),
      ],
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
