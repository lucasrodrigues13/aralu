import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Inspiracao, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_EM_MASSA, DIALOG_PEQUENO } from '../../shared/dialog';
import { Estado } from '../../shared/estado';
import { InspiracaoEditorDialog } from './inspiracao-editor.dialog';
import { InspiracaoVisualizarDialog } from './inspiracao-visualizar.dialog';

@Component({
  selector: 'app-modelos-inspiracoes',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule, Estado],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div>
        <mat-card-title class="mb-0">Modelos de inspirações</mat-card-title>
        <mat-card-subtitle>Galerias de referência para eventos.</mat-card-subtitle>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
      <div class="barra-lista">
        <div class="barra-lista-filtros">
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="busca()" (input)="buscar($event)" />
          </mat-form-field>
          </div>
        </div>
        <div class="barra-lista-acoes">
          <button mat-flat-button type="button" (click)="abrir()">
          <mat-icon>add</mat-icon>
          Novo Modelo de Inspirações
          </button>
        </div>
      </div>
      @if (!carregado()) {
        <app-estado titulo="Carregando…" />
      } @else if (lista().length === 0) {
        <app-estado [titulo]="busca() ? 'Nada encontrado' : 'Nenhuma galeria ainda'" [texto]="busca() ? 'Mude a busca ou os filtros.' : undefined" />
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let item">
              <button type="button" class="link-nome" (click)="visualizar(item)">{{ item.nome }}</button>
              <span class="text-muted"> - {{ item.itens.length }} item(ns)</span>
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
  protected readonly carregado = signal(false);
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

  protected visualizar(item: Inspiracao): void {
    this.negocio.inspiracao(item.id).subscribe({
      next: (detalhe) => this.dialog.open(InspiracaoVisualizarDialog, { ...DIALOG_EM_MASSA, data: detalhe }),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
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
      data: { titulo: 'Excluir galeria', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir', destrutivo: true },
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
      next: (lista) => { this.lista.set(lista); this.carregado.set(true); },
      error: (erro: unknown) => { this.carregado.set(true); this.toast.erro(mensagemDeErro(erro)); },
    });
  }
}
