import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { FornecedorResumo, NegocioClient, ServicoConta } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { Estado } from '../../shared/estado';
import { Paginacao } from '../../shared/paginacao';
import { FornecedorFormDialog } from './fornecedor-form.dialog';
import { NovoServicoDialog } from './novo-servico.dialog';
import { servicoCombina } from './busca-servico';
import { ImportarFornecedoresDialog } from './importar-fornecedores.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-fornecedores',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTabsModule, MatTooltipModule, MatPaginatorModule, MatAutocompleteModule, Estado],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Serviços e Fornecedores</mat-card-title>
        <mat-card-subtitle>Catálogo da conta e lista de serviços.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
      <mat-tab-group dynamicHeight class="abas-barra-lista">
        <mat-tab label="Fornecedores">
          <div class="barra-lista">
            <div class="barra-lista-filtros">
              <div class="campo w-full sm:w-64">
                <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-icon matIconPrefix>search</mat-icon>
                  <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="buscaForn()" (input)="buscarForn($event)" />
                </mat-form-field>
              </div>
              <div class="campo w-full sm:w-64">
                <mat-label class="font-semibold mb-2 block">Serviço prestado</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-icon matIconPrefix>search</mat-icon>
                  <input #buscaServico matInput aria-label="Serviço prestado" placeholder="Todos"
                    [value]="textoServico()" [matAutocomplete]="listaServicos"
                    (input)="textoServico.set(buscaServico.value)" (focus)="textoServico.set('')" (blur)="aoSairServico()" />
                  @if (servicoForn()) {
                    <button matIconSuffix mat-icon-button type="button" aria-label="Limpar o filtro de serviço" matTooltip="Limpar" (click)="filtrarServico('')"><mat-icon>close</mat-icon></button>
                  }
                  <mat-autocomplete #listaServicos="matAutocomplete" (optionSelected)="filtrarServico($event.option.value); buscaServico.blur()">
                    <mat-option value="">Todos</mat-option>
                    @for (servico of servicosDoFiltro(); track servico.id) {
                      <mat-option [value]="servico.nome">{{ servico.nome }}</mat-option>
                    } @empty {
                      <mat-option disabled>Nenhum serviço encontrado</mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>
              </div>
            </div>
            <div class="barra-lista-acoes">
              <button mat-stroked-button type="button" (click)="importarFornecedores()"><mat-icon>upload_file</mat-icon> Importar planilha</button>
              <button mat-flat-button type="button" (click)="abrirFornecedor()"><mat-icon>add</mat-icon> Novo fornecedor</button>
            </div>
          </div>
          @if (!fornecedoresCarregado()) {
            <app-estado titulo="Carregando…" />
          } @else if (fornecedoresFiltrados().length === 0) {
            <app-estado [titulo]="servicoForn() || buscaForn() ? 'Nada encontrado' : 'Nenhum fornecedor ainda'" [texto]="servicoForn() || buscaForn() ? 'Mude a busca ou os filtros.' : undefined" />
          } @else {
            <table mat-table class="min-w-full" [dataSource]="paginaForn.itens()">
              <ng-container matColumnDef="nome">
                <th mat-header-cell *matHeaderCellDef>Nome</th>
                <td mat-cell *matCellDef="let item">
                  <button type="button" class="link-nome" (click)="abrirFornecedor(item)">{{ item.nome }}</button>
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
            <mat-paginator showFirstLastButtons aria-label="Páginas de fornecedores"
              [length]="paginaForn.total()" [pageIndex]="paginaForn.indice()" [pageSize]="paginaForn.tamanho()"
              [pageSizeOptions]="paginaForn.tamanhos" (page)="paginaForn.mudar($event)" />
          }
        </mat-tab>
        <mat-tab label="Serviços da conta">
          <div class="barra-lista">
            <div class="barra-lista-filtros">
              <div class="campo w-full sm:w-64">
                <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-icon matIconPrefix>search</mat-icon>
                  <input matInput aria-label="Buscar" placeholder="Buscar" [value]="buscaServ()" (input)="buscarServ($event)" />
                </mat-form-field>
              </div>
            </div>
            <div class="barra-lista-acoes">
              <button mat-flat-button type="button" (click)="criarServico()"><mat-icon>add</mat-icon> Novo serviço</button>
            </div>
          </div>
          @if (!servicosCarregado()) {
            <app-estado titulo="Carregando…" />
          } @else if (servicos().length === 0) {
            <app-estado [titulo]="buscaServ() ? 'Nada encontrado' : 'Nenhum serviço ainda'" [texto]="buscaServ() ? 'Mude a busca ou os filtros.' : undefined" />
          } @else {
            <table mat-table class="min-w-full" [dataSource]="paginaServ.itens()">
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
            <mat-paginator showFirstLastButtons aria-label="Páginas de serviços"
              [length]="paginaServ.total()" [pageIndex]="paginaServ.indice()" [pageSize]="paginaServ.tamanho()"
              [pageSizeOptions]="paginaServ.tamanhos" (page)="paginaServ.mudar($event)" />
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
  protected readonly fornecedoresCarregado = signal(false);
  protected readonly servicosCarregado = signal(false);
  protected readonly buscaForn = signal('');
  protected readonly buscaServ = signal('');
  /** Nome do serviço escolhido no filtro; vazio mostra todos. */
  protected readonly servicoForn = signal('');
  /** Catálogo completo para o filtro, sem a busca da aba Serviços. */
  protected readonly todosServicos = signal<ServicoConta[]>([]);
  /** Texto do campo do filtro: o que a pessoa digita para achar o serviço na lista. */
  protected readonly textoServico = signal('');
  protected readonly servicosDoFiltro = computed(() => this.todosServicos().filter((s) => servicoCombina(s, this.textoServico())));
  protected readonly fornecedoresFiltrados = computed(() => {
    const servico = this.servicoForn();
    const lista = this.fornecedores();
    return servico ? lista.filter((f) => f.servicos.includes(servico)) : lista;
  });
  protected readonly paginaForn = new Paginacao(this.fornecedoresFiltrados);
  protected readonly paginaServ = new Paginacao(this.servicos);
  protected readonly colsForn = ['nome', 'servicos', 'acoes'];
  protected readonly colsServ = ['nome', 'acoes'];

  ngOnInit(): void {
    this.carregarFornecedores();
    this.carregarServicos();
  }

  protected buscarForn(evento: Event): void {
    this.buscaForn.set((evento.target as HTMLInputElement).value);
    this.paginaForn.inicio();
    this.carregarFornecedores();
  }

  protected filtrarServico(nome: string): void {
    this.servicoForn.set(nome);
    this.textoServico.set(nome);
    this.paginaForn.inicio();
  }

  /** Texto digitado sem escolher uma opção volta para o filtro atual. */
  protected aoSairServico(): void {
    setTimeout(() => this.textoServico.set(this.servicoForn()), 150);
  }

  protected buscarServ(evento: Event): void {
    this.buscaServ.set((evento.target as HTMLInputElement).value);
    this.paginaServ.inicio();
    this.carregarServicos();
  }

  protected abrirFornecedor(resumo?: FornecedorResumo): void {
    if (resumo) {
      this.negocio.fornecedor(resumo.id).subscribe({
        next: (detalhe) => this.dialog.open(FornecedorFormDialog, { ...DIALOG_LARGO, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregarFornecedores()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(FornecedorFormDialog, { ...DIALOG_LARGO, data: null }).afterClosed().subscribe((ok) => {
      if (ok) {
        this.carregarFornecedores();
        this.carregarServicos();
      }
    });
  }

  protected importarFornecedores(): void {
    this.dialog.open(ImportarFornecedoresDialog, DIALOG).afterClosed().subscribe((ok) => {
      if (ok) {
        this.carregarFornecedores();
        this.carregarServicos();
      }
    });
  }

  protected excluirFornecedor(item: FornecedorResumo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir fornecedor', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir', destrutivo: true },
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
      data: { titulo: 'Excluir serviço', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir', destrutivo: true },
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
      next: (lista) => { this.fornecedores.set(lista); this.fornecedoresCarregado.set(true); },
      error: (erro: unknown) => { this.fornecedoresCarregado.set(true); this.toast.erro(mensagemDeErro(erro)); },
    });
  }

  private carregarServicos(): void {
    this.negocio.servicosConta(this.buscaServ()).subscribe({
      next: (lista) => {
        this.servicos.set(lista);
        if (!this.buscaServ()) {
          this.todosServicos.set(lista);
        }
        this.servicosCarregado.set(true);
      },
      error: (erro: unknown) => { this.servicosCarregado.set(true); this.toast.erro(mensagemDeErro(erro)); },
    });
  }
}
