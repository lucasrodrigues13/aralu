import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cliente, NegocioClient, ROTULO_PAPEL } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { ClienteFormDialog } from './cliente-form.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-clientes',
  imports: [MatCardModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Clientes</mat-card-title>
        <mat-card-subtitle>Contatos da assessoria e os eventos vinculados.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="abrir()">
        <mat-icon>add</mat-icon>
        Novo cliente
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
      @if (clientes().length === 0) {
        <p class="text-center text-muted py-10">Não há cliente para mostrar.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="clientes()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let cliente">
              {{ cliente.nome }}
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
          <ng-container matColumnDef="acesso">
            <th mat-header-cell *matHeaderCellDef>Último acesso</th>
            <td mat-cell *matCellDef="let cliente">{{ cliente.ultimoAcesso ?? '—' }}</td>
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
  protected readonly busca = signal('');
  protected readonly colunas = ['nome', 'contato', 'eventos', 'acesso', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected rotulo(papel: string | null): string {
    return papel ? (ROTULO_PAPEL[papel] ?? papel) : 'Sem papel';
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
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
        confirmar: 'Excluir',
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
      next: (clientes) => this.clientes.set(clientes),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
