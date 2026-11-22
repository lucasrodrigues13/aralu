import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { FornecedorResumo, NegocioClient, ServicoConta } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { DIALOG_FORNECEDOR, FornecedorFormDialog } from './fornecedor-form.dialog';
import { NovoServicoDialog } from './novo-servico.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-fornecedores',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTabsModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Serviços e Fornecedores</mat-card-title>
        <mat-card-subtitle>Catálogo da conta e lista de serviços.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="abrirFornecedor()">
        <mat-icon>add</mat-icon>
        Novo fornecedor
      </button>
    </div>
      <mat-card-content class="border-t border-border">
      <mat-tab-group dynamicHeight>
        <mat-tab label="Fornecedores">
          <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div class="campo w-full sm:w-64">
              <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="buscaForn()" (input)="buscarForn($event)" />
            </mat-form-field>
            </div>
          </div>
          @if (fornecedores().length === 0) {
            <p class="text-center text-muted py-10">Não há fornecedor cadastrado.</p>
          } @else {
            <table mat-table class="min-w-full" [dataSource]="fornecedores()">
              <ng-container matColumnDef="nome">
                <th mat-header-cell *matHeaderCellDef>Nome</th>
                <td mat-cell *matCellDef="let item">
                  {{ item.nome }}
                  <span class="block text-xs text-muted">{{ item.completo ? 'Completo' : 'Incompleto' }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="servicos">
                <th mat-header-cell *matHeaderCellDef>Serviços</th>
                <td mat-cell *matCellDef="let item">{{ item.servicos.join(', ') || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="acoes">
                <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
                <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
                  <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrirFornecedor(item)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluirFornecedor(item)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colsForn"></tr>
              <tr mat-row *matRowDef="let row; columns: colsForn"></tr>
            </table>
          }
        </mat-tab>
        <mat-tab label="Serviços da conta">
          <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
            <button mat-stroked-button type="button" (click)="criarServico()"><mat-icon>add</mat-icon> Adicionar serviço</button>
            <div class="campo w-full sm:w-64">
              <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput aria-label="Buscar" placeholder="Buscar" [value]="buscaServ()" (input)="buscarServ($event)" />
            </mat-form-field>
            </div>
          </div>
          @if (servicos().length === 0) {
            <p class="text-center text-muted py-10">Não há serviço da conta.</p>
          } @else {
            <table mat-table class="min-w-full" [dataSource]="servicos()">
              <ng-container matColumnDef="nome">
                <th mat-header-cell *matHeaderCellDef>Nome</th>
                <td mat-cell *matCellDef="let item">
                  {{ item.nome }}
                  @if (item.padrao) { <span class="block text-xs text-muted">Padrão</span> }
                </td>
              </ng-container>
              <ng-container matColumnDef="acoes">
                <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
                <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
                  <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluirServico(item)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colsServ"></tr>
              <tr mat-row *matRowDef="let row; columns: colsServ"></tr>
            </table>
          }
        </mat-tab>
      </mat-tab-group>
    </mat-card-content>
    </mat-card>
  `,
})
export class FornecedoresPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly fornecedores = signal<FornecedorResumo[]>([]);
  protected readonly servicos = signal<ServicoConta[]>([]);
  protected readonly buscaForn = signal('');
  protected readonly buscaServ = signal('');
  protected readonly colsForn = ['nome', 'servicos', 'acoes'];
  protected readonly colsServ = ['nome', 'acoes'];

  ngOnInit(): void {
    this.carregarFornecedores();
    this.carregarServicos();
  }

  protected buscarForn(evento: Event): void {
    this.buscaForn.set((evento.target as HTMLInputElement).value);
    this.carregarFornecedores();
  }

  protected buscarServ(evento: Event): void {
    this.buscaServ.set((evento.target as HTMLInputElement).value);
    this.carregarServicos();
  }

  protected abrirFornecedor(resumo?: FornecedorResumo): void {
    if (resumo) {
      this.negocio.fornecedor(resumo.id).subscribe({
        next: (detalhe) => this.dialog.open(FornecedorFormDialog, { ...DIALOG_FORNECEDOR, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregarFornecedores()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(FornecedorFormDialog, { ...DIALOG_FORNECEDOR, data: null }).afterClosed().subscribe((ok) => {
      if (ok) {
        this.carregarFornecedores();
        this.carregarServicos();
      }
    });
  }

  protected excluirFornecedor(item: FornecedorResumo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir fornecedor', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirFornecedor(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Fornecedor excluído.');
          this.carregarFornecedores();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected criarServico(): void {
    this.dialog.open(NovoServicoDialog, { ...DIALOG, width: 'min(420px, calc(100vw - 32px))' }).afterClosed().subscribe((ok) => ok && this.carregarServicos());
  }

  protected excluirServico(item: ServicoConta): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir serviço', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirServicoConta(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Serviço excluído.');
          this.carregarServicos();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregarFornecedores(): void {
    this.negocio.fornecedores(this.buscaForn()).subscribe({
      next: (lista) => this.fornecedores.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private carregarServicos(): void {
    this.negocio.servicosConta(this.buscaServ()).subscribe({
      next: (lista) => this.servicos.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
