import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { FecharModal } from '../../shared/fechar-modal';

/** Importação de um modelo de cronograma pela planilha modelo. Fecha com true quando o modelo foi criado. */
@Component({
  selector: 'app-importar-cronograma-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Importar cronograma <app-fechar-modal [manual]="true" (fechar)="ref.close(false)" /></h2>
    <mat-dialog-content>
      <ol class="passos">
        <li>
          <span class="num">1</span>
          <div>
            <strong>Baixe a planilha modelo</strong>
            <p>Na aba <em>Cronograma</em>, um item por linha, na ordem do cronograma.</p>
            <button mat-stroked-button type="button" [disabled]="baixando()" (click)="baixar()"><mat-icon>download</mat-icon> Baixar modelo</button>
          </div>
        </li>
        <li>
          <span class="num">2</span>
          <div>
            <strong>Preencha e apague os exemplos</strong>
            <p>As linhas em amarelo são exemplos. Responsável: Organizador, Assistente ou Cliente.</p>
          </div>
        </li>
        <li>
          <span class="num">3</span>
          <div class="w-full">
            <strong>Dê um título e envie a planilha</strong>
            <mat-form-field appearance="outline" class="w-full mt-2" subscriptSizing="dynamic">
              <mat-label>Título do modelo</mat-label>
              <input matInput aria-label="Título do modelo" placeholder="Se vazio, usa o nome do arquivo" [value]="nome()" (input)="nome.set($any($event.target).value)" [disabled]="enviando()" />
            </mat-form-field>
            <label
              class="drop"
              [class.ativo]="arrastando()"
              [class.desativado]="enviando()"
              (dragover)="$event.preventDefault(); arrastando.set(true)"
              (dragleave)="arrastando.set(false)"
              (drop)="soltar($event)"
            >
              <input type="file" hidden accept=".xlsx,.xls" [disabled]="enviando()" (change)="escolher($event)" />
              <mat-icon>upload_file</mat-icon>
              <span class="titulo">{{ arquivo() ?? 'Escolher arquivo ou arrastar aqui' }}</span>
              <span class="dica">Planilha .xlsx, até 2 MB</span>
            </label>
            @if (enviando()) { <mat-progress-bar mode="indeterminate" class="mt-2" /> }
          </div>
        </li>
      </ol>

      @if (erros().length > 0) {
        <div class="erros" role="alert">
          <p class="m-0 font-semibold"><mat-icon inline>error_outline</mat-icon> Nada foi importado. Corrija {{ erros().length === 1 ? 'o erro' : 'os ' + erros().length + ' erros' }} e envie de novo:</p>
          <ul>
            @for (erro of erros(); track $index) { <li>{{ erro }}</li> }
          </ul>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(false)">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .passos { list-style: none; margin: 0; padding: 0; display: grid; gap: 20px; }
    .passos > li { display: flex; gap: 12px; align-items: flex-start; }
    .passos p { margin: 4px 0 10px; color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; }
    .num {
      flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
      font-weight: 600; font-size: 0.85rem;
      background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent); color: var(--mat-sys-primary);
    }
    .drop {
      margin-top: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
      padding: 20px 16px; border: 1.5px dashed var(--mat-sys-outline-variant); border-radius: 12px;
      cursor: pointer; transition: border-color 0.15s, background 0.15s;
    }
    .drop:hover, .drop.ativo { border-color: var(--mat-sys-primary); background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent); }
    .drop.desativado { opacity: 0.6; pointer-events: none; }
    .drop mat-icon { color: var(--mat-sys-primary); }
    .titulo { font-weight: 600; word-break: break-all; }
    .dica { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .erros {
      margin-top: 20px; padding: 12px 16px; border-radius: 8px; font-size: 0.875rem;
      background: color-mix(in srgb, var(--mat-sys-error) 8%, transparent); color: var(--mat-sys-on-surface);
      border: 1px solid color-mix(in srgb, var(--mat-sys-error) 30%, transparent);
    }
    .erros mat-icon { color: var(--mat-sys-error); vertical-align: -3px; }
    .erros ul { margin: 8px 0 0; padding-left: 20px; max-height: 200px; overflow: auto; display: grid; gap: 2px; }
  `,
})
export class ImportarCronogramaDialog {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject(MatDialogRef<ImportarCronogramaDialog, boolean>);
  protected readonly baixando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly arrastando = signal(false);
  protected readonly nome = signal('');
  protected readonly arquivo = signal<string | null>(null);
  protected readonly erros = signal<string[]>([]);

  protected baixar(): void {
    this.baixando.set(true);
    this.negocio.planilhaCronograma().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cronograma.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.baixando.set(false);
      },
      error: (erro: unknown) => {
        this.baixando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected escolher(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (arquivo) {
      this.enviar(arquivo);
    }
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(false);
    const arquivo = evento.dataTransfer?.files?.[0];
    if (arquivo && !this.enviando()) {
      this.enviar(arquivo);
    }
  }

  private enviar(arquivo: File): void {
    if (!/\.xlsx?$/i.test(arquivo.name)) {
      this.toast.erro('Envie a planilha modelo em .xlsx.');
      return;
    }
    this.arquivo.set(arquivo.name);
    this.erros.set([]);
    this.enviando.set(true);
    this.negocio.importarCronograma(this.nome().trim(), arquivo).subscribe({
      next: (resultado) => {
        this.enviando.set(false);
        if (resultado.erros.length > 0) {
          this.erros.set(resultado.erros);
          return;
        }
        this.toast.sucesso(`Cronograma importado: ${resultado.itens} item(ns).`);
        this.ref.close(true);
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}
