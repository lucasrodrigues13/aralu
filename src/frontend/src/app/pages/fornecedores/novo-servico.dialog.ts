import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable, map } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, ServicoConta } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { nomesDaLista, nomesDoTexto } from './busca-servico';
import { FecharModal } from '../../shared/fechar-modal';

export interface NovoServicoDados {
  nome?: string;
}

const EXTENSOES = ['.txt', '.csv', '.xlsx'];

/** Fecha com a lista de serviços criados (ou já existentes com o mesmo nome). */
@Component({
  selector: 'app-novo-servico-dialog',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ quantidade() > 1 ? 'Novos serviços' : 'Novo serviço' }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <p class="intro">Digite um serviço ou vários, separados por vírgula.</p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Serviços</mat-label>
        <textarea
          aria-label="Serviços"
          matInput
          cdkFocusInitial
          [formControl]="nomes"
          rows="3"
          placeholder="Ex.: Buffet — ou Buffet, Espaço, Decoração para adicionar vários"
          (keydown.enter)="enter($event)"
        ></textarea>
        <mat-hint>
          @if (quantidade() > 1) { {{ quantidade() }} serviços serão adicionados } @else { Enter cria · Shift+Enter quebra linha }
        </mat-hint>
      </mat-form-field>

      <div class="ou"><span>ou importe uma lista</span></div>

      <label
        class="drop"
        [class.ativo]="arrastando()"
        (dragover)="$event.preventDefault(); arrastando.set(true)"
        (dragleave)="arrastando.set(false)"
        (drop)="soltar($event)"
      >
        <input type="file" hidden [accept]="extensoes" (change)="escolher($event)" />
        <mat-icon>upload_file</mat-icon>
        <span class="titulo">{{ arquivo() ?? 'Escolher arquivo ou arrastar aqui' }}</span>
        <span class="dica">.txt separado por vírgula · .csv ou .xlsx com um serviço por linha, sem cabeçalho</span>
      </label>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="salvando()" (click)="salvar()">
        {{ quantidade() > 1 ? 'Criar ' + quantidade() + ' serviços' : 'Criar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .intro { margin: 0 0 12px; color: var(--mat-sys-on-surface-variant); }
    mat-form-field { display: block; }
    .ou { display: flex; align-items: center; gap: 12px; margin: 16px 0 12px; color: var(--mat-sys-on-surface-variant); font-size: 0.85rem; }
    .ou::before, .ou::after { content: ''; flex: 1; border-top: 1px solid var(--mat-sys-outline-variant); }
    .drop {
      display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
      padding: 20px 16px; border: 1.5px dashed var(--mat-sys-outline-variant); border-radius: 12px;
      cursor: pointer; transition: border-color 0.15s, background 0.15s;
    }
    .drop:hover, .drop.ativo { border-color: var(--mat-sys-primary); background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent); }
    .drop mat-icon { color: var(--mat-sys-primary); }
    .titulo { font-weight: 600; word-break: break-all; }
    .dica { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class NovoServicoDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject(MatDialogRef<NovoServicoDialog, ServicoConta[]>);
  /** Texto já digitado na busca de quem abriu o modal. */
  private readonly inicial = (inject<NovoServicoDados | null>(MAT_DIALOG_DATA, { optional: true })?.nome ?? '').trim();
  protected readonly nomes = this.fb.nonNullable.control(this.inicial);
  private readonly texto = toSignal(this.nomes.valueChanges, { initialValue: this.inicial });
  protected readonly quantidade = computed(() => nomesDaLista(this.texto()).length);
  protected readonly extensoes = EXTENSOES.join(',');
  protected readonly arquivo = signal<string | null>(null);
  protected readonly arrastando = signal(false);
  protected readonly salvando = signal(false);

  protected enter(evento: Event): void {
    if (!(evento as KeyboardEvent).shiftKey) {
      evento.preventDefault();
      this.salvar();
    }
  }

  protected escolher(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (arquivo) {
      void this.importar(arquivo);
    }
  }

  protected soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(false);
    const arquivo = evento.dataTransfer?.files?.[0];
    if (arquivo) {
      void this.importar(arquivo);
    }
  }

  /** Lê o arquivo e junta os nomes ao campo, para o usuário revisar antes de criar. */
  private async importar(arquivo: File): Promise<void> {
    const nome = arquivo.name.toLowerCase();
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      this.toast.erro('Use um arquivo .txt, .csv ou .xlsx.');
      return;
    }
    try {
      const lidos = nome.endsWith('.xlsx') ? await this.lerPlanilha(arquivo) : nomesDoTexto(await arquivo.text());
      if (lidos.length === 0) {
        this.toast.erro('Nenhum serviço encontrado no arquivo.');
        return;
      }
      const atual = nomesDaLista(this.nomes.value);
      this.nomes.setValue(nomesDaLista([...atual, ...lidos].join(',')).join(', '));
      this.arquivo.set(arquivo.name);
      this.toast.sucesso(`${lidos.length} serviço(s) lido(s) de ${arquivo.name}. Revise e clique em Criar.`);
    } catch {
      this.toast.erro('Não foi possível ler o arquivo.');
    }
  }

  private async lerPlanilha(arquivo: File): Promise<string[]> {
    const { default: lerExcel } = await import('read-excel-file');
    const linhas = await lerExcel(arquivo);
    return nomesDoTexto(linhas.map((linha) => String(linha[0] ?? '')).join('\n'));
  }

  protected salvar(): void {
    const pedido = this.pedido();
    if (!pedido) {
      return;
    }
    this.salvando.set(true);
    pedido.subscribe({
      next: (servicos) => {
        this.toast.sucesso(servicos.length > 1 ? `${servicos.length} serviços criados.` : 'Serviço criado.');
        this.ref.close(servicos);
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private pedido(): Observable<ServicoConta[]> | null {
    const lista = nomesDaLista(this.nomes.value);
    if (lista.length === 0) {
      this.nomes.markAsTouched();
      this.toast.erro('Informe ao menos um nome de serviço.');
      return null;
    }
    if (lista.some((nome) => nome.length > 200)) {
      this.toast.erro('O nome do serviço pode ter no máximo 200 caracteres.');
      return null;
    }
    if (lista.length === 1) {
      return this.negocio.criarServicoConta(lista[0]).pipe(map((servico) => [servico]));
    }
    return this.negocio.criarServicosConta(lista.join(', '));
  }
}
