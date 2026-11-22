import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subscription, timer } from 'rxjs';
import { ImportacaoConvidados, ROTULO_SITUACAO_IMPORTACAO, temImportacaoEmAndamento } from '../core/importacoes';
import { mensagemDeErro } from '../core/mensagem-erro';
import { ToastService } from '../core/toast.service';

export interface ImportacoesDados {
  listar: () => Observable<ImportacaoConvidados[]>;
  enviar: (arquivo: File) => Observable<ImportacaoConvidados>;
}

const INTERVALO_MS = 2000;

/**
 * Importar planilha (SPEC-059 §6.6), igual na organizadora e no link do cliente: o envio entra na fila e responde
 * na hora; a lista mostra as importações com a situação (Pendente, Processando, Importado, Erro) e atualiza sozinha
 * enquanto alguma está na fila. Importação com erro abre num acordeão com todos os erros da planilha.
 * Fecha com `true` se alguma importação terminou como Importado enquanto o modal estava aberto.
 */
@Component({
  selector: 'app-importacoes-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DatePipe],
  template: `
    <h2 mat-dialog-title>Importar planilha</h2>
    <mat-dialog-content class="text-sm">
      <p class="mt-0">Escolha a planilha preenchida a partir do modelo. A lista é verificada em segundo plano e em breve será confirmada aqui; você pode fechar esta janela e voltar depois.</p>
      <button mat-flat-button type="button" [disabled]="enviando()" (click)="arquivo.click()"><mat-icon>upload</mat-icon> Escolher planilha</button>
      <input #arquivo type="file" accept=".xlsx,.xls" hidden (change)="escolher($event)" />

      <h3 class="text-base font-semibold mt-6 mb-2">Importações</h3>
      @if (itens().length === 0) {
        <p class="text-muted">Nenhuma importação ainda.</p>
      } @else {
        <ul class="list-none p-0 m-0 grid gap-2" aria-live="polite">
          @for (item of itens(); track item.id) {
            <li class="border border-border rounded p-3">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="font-semibold break-all">{{ item.nomeArquivo }}</span>
                <span [class]="classe(item.situacao)" [attr.data-situacao]="item.situacao">{{ rotulos[item.situacao] }}</span>
                <span class="text-xs text-muted">Enviada em {{ item.criadaEm | date: 'dd/MM/yyyy HH:mm' }}</span>
              </div>
              @if (item.situacao === 'Pendente' || item.situacao === 'Processando') {
                <p class="text-xs text-muted mt-1 mb-0">A lista está sendo verificada e em breve será confirmada.</p>
              } @else if (item.situacao === 'Importado') {
                <p class="text-xs text-muted mt-1 mb-0">{{ item.convites }} {{ item.convites === 1 ? 'convite importado' : 'convites importados' }}.</p>
              } @else {
                <button mat-button type="button" class="mt-1" [attr.aria-expanded]="aberto(item.id)" [attr.aria-controls]="'erros-' + item.id" (click)="alternar(item.id)">
                  <mat-icon>{{ aberto(item.id) ? 'expand_less' : 'expand_more' }}</mat-icon>
                  {{ item.erros.length }} {{ item.erros.length === 1 ? 'erro' : 'erros' }} na planilha. Nada foi importado.
                </button>
                @if (aberto(item.id)) {
                  <ul class="mt-1 mb-0 pl-5 grid gap-1 text-error" [id]="'erros-' + item.id">
                    @for (erro of item.erros; track $index) { <li>{{ erro }}</li> }
                  </ul>
                }
              }
            </li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" (click)="fechar()">Fechar</button>
    </mat-dialog-actions>
  `,
})
export class ImportacoesDialog implements OnInit {
  private readonly dados = inject<ImportacoesDados>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ImportacoesDialog, boolean>);
  private readonly toast = inject(ToastService);
  private readonly destroy = inject(DestroyRef);
  protected readonly itens = signal<ImportacaoConvidados[]>([]);
  protected readonly enviando = signal(false);
  protected readonly rotulos = ROTULO_SITUACAO_IMPORTACAO;
  private readonly abertos = signal<ReadonlySet<string>>(new Set());
  private readonly acompanhadas = new Set<string>();
  private importou = false;
  private consulta: Subscription | null = null;

  ngOnInit(): void {
    this.atualizar();
  }

  protected escolher(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (!arquivo) return;
    this.enviando.set(true);
    this.dados.enviar(arquivo).subscribe({
      next: (importacao) => {
        this.enviando.set(false);
        this.acompanhadas.add(importacao.id);
        this.itens.update((itens) => [importacao, ...itens.filter((item) => item.id !== importacao.id)]);
        this.toast.sucesso('A lista está sendo verificada e em breve será confirmada.');
        this.agendar();
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected aberto(id: string): boolean {
    return this.abertos().has(id);
  }

  protected alternar(id: string): void {
    const abertos = new Set(this.abertos());
    if (abertos.has(id)) abertos.delete(id);
    else abertos.add(id);
    this.abertos.set(abertos);
  }

  protected classe(situacao: ImportacaoConvidados['situacao']): string {
    const base = 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap ';
    if (situacao === 'Importado') return base + 'bg-light-success text-success';
    if (situacao === 'Erro') return base + 'bg-light-error text-error';
    return base + 'bg-light-warning text-warning';
  }

  protected fechar(): void {
    this.ref.close(this.importou);
  }

  private atualizar(): void {
    this.dados.listar().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (itens) => {
        for (const item of itens) {
          if (this.acompanhadas.has(item.id) && item.situacao === 'Importado') this.importou = true;
          if (item.situacao === 'Pendente' || item.situacao === 'Processando') this.acompanhadas.add(item.id);
        }
        this.itens.set(itens);
        this.agendar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Enquanto houver importação na fila, consulta de novo em poucos segundos. */
  private agendar(): void {
    if (this.consulta || !temImportacaoEmAndamento(this.itens())) return;
    this.consulta = timer(INTERVALO_MS).pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.consulta = null;
      this.atualizar();
    });
  }
}
