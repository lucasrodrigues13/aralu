import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cliente, NegocioClient, ROTULO_PAPEL } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { Estado } from '../../shared/estado';
import { Paginacao } from '../../shared/paginacao';
import { ClienteFormDialog } from './cliente-form.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-clientes',
  imports: [MatCardModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatPaginatorModule, MatTooltipModule, Estado],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div>
        <mat-card-title class="mb-0">Clientes</mat-card-title>
        <mat-card-subtitle>Contatos da assessoria e os eventos vinculados.</mat-card-subtitle>
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
          Novo cliente
          </button>
        </div>
      </div>
      @if (!carregado()) {
        <app-estado titulo="Carregando…" />
      } @else if (clientes().length === 0) {
        <app-estado [titulo]="busca() ? 'Nada encontrado' : 'Nenhum cliente ainda'" [texto]="busca() ? 'Mude a busca ou os filtros.' : undefined" />
      } @else {
        <table mat-table class="min-w-full" [dataSource]="pagina.itens()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let cliente">
              <button type="button" class="link-nome" (click)="abrir(cliente)">{{ cliente.nome }}</button>
              <span class="block text-xs text-muted">{{ rotulo(cliente.papel) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="contato">
            <th mat-header-cell *matHeaderCellDef>Contato</th>
            <td mat-cell *matCellDef="let cliente">
              {{ cliente.email }}
              <span class="block text-xs text-muted">{{ cliente.ddi }} {{ cliente.celular }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="eventos">
            <th mat-header-cell *matHeaderCellDef>Eventos</th>
            <td mat-cell *matCellDef="let cliente">
              @if (cliente.eventos.length === 0) {
                Nenhum evento vinculado
              } @else {
                @for (evento of cliente.eventos; track evento.id) {
                  <a [routerLink]="['/eventos', evento.id]">{{ evento.nome }}</a>
                }
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let cliente" class="text-end! whitespace-nowrap">
              <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrir(cliente)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir(cliente)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas"></tr>
        </table>
        <mat-paginator showFirstLastButtons aria-label="Páginas de clientes"
          [length]="pagina.total()" [pageIndex]="pagina.indice()" [pageSize]="pagina.tamanho()"
          [pageSizeOptions]="pagina.tamanhos" (page)="pagina.mudar($event)" />
      }
    </mat-card-content>
    </mat-card>
  `,
})
export class ClientesPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly carregado = signal(false);
  protected readonly busca = signal('');
  protected readonly pagina = new Paginacao(this.clientes);
  protected readonly colunas = ['nome', 'contato', 'eventos', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected rotulo(papel: string | null): string {
    return papel ? (ROTULO_PAPEL[papel] ?? papel) : 'Sem papel';
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.pagina.inicio();
    this.carregar();
  }

  protected abrir(cliente?: Cliente): void {
    this.dialog.open(ClienteFormDialog, { ...DIALOG, data: cliente ?? null }).afterClosed().subscribe((salvo) => {
      if (salvo) {
        this.carregar();
      }
    });
  }

  protected excluir(cliente: Cliente): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: {
        titulo: 'Excluir cliente',
        texto: `Confirma a exclusão de "${cliente.nome}"? A oportunidade do funil, se houver, continua existindo.`,
        confirmar: 'Excluir', destrutivo: true,
      },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.negocio.excluirCliente(cliente.id).subscribe({
        next: () => {
          this.toast.sucesso('Cliente excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.clientes(this.busca()).subscribe({
      next: (clientes) => { this.clientes.set(clientes); this.carregado.set(true); },
      error: (erro: unknown) => { this.carregado.set(true); this.toast.erro(mensagemDeErro(erro)); },
    });
  }
}
