import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Inspiracao, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-inspiracao-editor-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar galeria' : 'Nova galeria' }}</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div formArrayName="itens">
          @for (item of itens.controls; track $index; let i = $index) {
            <div class="linha" [formGroupName]="i">
              <div class="campo grow">
                <mat-label class="font-semibold mb-2 block">URL</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'URL'" matInput formControlName="url" /></mat-form-field>
              </div>
              <button mat-icon-button aria-label="Remover item" matTooltip="Remover item" type="button" (click)="removerItem(i)"><mat-icon>close</mat-icon></button>
            </div>
          }
        </div>
        <button mat-stroked-button type="button" (click)="adicionarItem()">Adicionar URL</button>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .linha { display: flex; gap: 8px; align-items: flex-start; }
    .grow { flex: 1; }
  `,
})
export class InspiracaoEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Inspiracao | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<InspiracaoEditorDialog, boolean>);
  protected readonly form = this.fb.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    itens: this.fb.array([]),
  });

  protected get itens(): FormArray {
    return this.form.get('itens') as FormArray;
  }

  constructor() {
    for (const item of this.dados?.itens ?? []) {
      this.itens.push(this.fb.group({ url: [item.url ?? ''] }));
    }
  }

  protected adicionarItem(): void {
    this.itens.push(this.fb.group({ url: [''] }));
  }

  protected removerItem(i: number): void {
    this.itens.removeAt(i);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as { nome: string | null; itens: { url: string }[] };
    const pedido = {
      nome: valor.nome,
      itens: (valor.itens ?? [])
        .map((item) => ({ url: item.url || null, arquivoId: null }))
        .filter((item) => item.url),
    };
    const req = this.dados
      ? this.negocio.atualizarInspiracao(this.dados.id, pedido)
      : this.negocio.criarInspiracao(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Galeria salva.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({
  selector: 'app-modelos-inspiracoes',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Modelos de inspirações</mat-card-title>
        <mat-card-subtitle>Galerias de referência para eventos.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="abrir()">
        <mat-icon>add</mat-icon>
        Novo Modelo de Inspirações
      </button>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div class="campo w-full sm:w-64">
          <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="busca()" (input)="buscar($event)" />
        </mat-form-field>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Sem galerias cadastradas</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let item">
              {{ item.nome }}
              <span class="block text-xs text-muted">{{ item.itens.length }} item(ns)</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Clonar" matTooltip="Clonar" (click)="clonar(item)"><mat-icon>content_copy</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas"></tr>
        </table>
      }
    </mat-card-content>
    </mat-card>
  `,
})
export class ModelosInspiracoesPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<Inspiracao[]>([]);
  protected readonly busca = signal('');
  protected readonly colunas = ['nome', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: Inspiracao): void {
    if (item) {
      this.negocio.inspiracao(item.id).subscribe({
        next: (detalhe) => this.dialog.open(InspiracaoEditorDialog, { ...DIALOG, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregar()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(InspiracaoEditorDialog, { ...DIALOG, data: null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected clonar(item: Inspiracao): void {
    this.negocio.clonarInspiracao(item.id).subscribe({
      next: () => {
        this.toast.sucesso('Galeria clonada.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: Inspiracao): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir galeria', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirInspiracao(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Galeria excluída.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.inspiracoes(this.busca()).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
