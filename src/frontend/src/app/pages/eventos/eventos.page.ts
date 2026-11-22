import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  EstatisticasEventos,
  EventoResumo,
  MESES,
  NegocioClient,
  TIPOS,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { deDataParaIso } from '../../shared/data';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { STATUS } from '../../shared/status';
import { EventoFormPage } from './evento-form.page';
import { NovoEventoDialog } from './novo-evento.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-eventos',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatButtonToggleModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatTableModule, CampoDataComponent, GdDataPipe, MatTooltipModule],
  template: `
    @if (estatisticas(); as stats) {
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        <a routerLink="/tarefas" [queryParams]="{ semana: 1 }" class="no-underline">
          <mat-card class="shadow-none text-center mb-0! bg-light-warning card-hover">
            <mat-card-content>
              <mat-icon class="text-warning">task_alt</mat-icon>
              <h4 class="text-sm font-semibold text-warning mt-2!">{{ stats.resumo.rotuloTarefas }}</h4>
              <h6 class="text-xl font-semibold text-warning mt-2!">{{ stats.resumo.tarefasSemana }}</h6>
              <span class="text-xs text-warning">{{ stats.resumo.contadorTarefas }}</span>
            </mat-card-content>
          </mat-card>
        </a>
        <a routerLink="/anexos" class="no-underline">
          <mat-card class="shadow-none text-center mb-0! bg-light-info card-hover">
            <mat-card-content>
              <mat-icon class="text-info">attach_file</mat-icon>
              <h4 class="text-sm font-semibold text-info mt-2!">{{ stats.resumo.rotuloAnexos }}</h4>
              <h6 class="text-xl font-semibold text-info mt-2!">—</h6>
            </mat-card-content>
          </mat-card>
        </a>
        <a routerLink="/equipe" class="no-underline">
          <mat-card class="shadow-none text-center mb-0! bg-light-secondary card-hover">
            <mat-card-content>
              <mat-icon class="text-secondary">groups</mat-icon>
              <h4 class="text-sm font-semibold text-secondary mt-2!">{{ stats.resumo.rotuloEquipe }}</h4>
              <h6 class="text-xl font-semibold text-secondary mt-2!">—</h6>
            </mat-card-content>
          </mat-card>
        </a>
        <a routerLink="/aniversarios" class="no-underline">
          <mat-card class="shadow-none text-center mb-0! bg-light-success card-hover">
            <mat-card-content>
              <mat-icon class="text-success">cake</mat-icon>
              <h4 class="text-sm font-semibold text-success mt-2!">{{ stats.resumo.rotuloAniversarios }}</h4>
              <h6 class="text-xl font-semibold text-success mt-2!">{{ stats.resumo.aniversariosHoje }}</h6>
              <span class="text-xs text-success">{{ stats.resumo.contadorAniversarios }}</span>
            </mat-card-content>
          </mat-card>
        </a>
      </div>
    }

    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Eventos</mat-card-title>
        <mat-card-subtitle>Acompanhe os eventos da assessoria.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="barra-lista barra-lista-alta">
          <div class="barra-lista-filtros flex-col items-start!">
        <mat-button-toggle-group
          [value]="abaAtual()"
          (change)="trocarAba($event.value)"
          aria-label="Situação dos eventos"
        >
          @for (aba of abas; track aba.valor; let indice = $index) {
            <mat-button-toggle [value]="indice">{{ aba.rotulo }}</mat-button-toggle>
          }
        </mat-button-toggle-group>

        @if (!ehEstatisticas()) {
          <form class="flex flex-wrap items-end gap-4" [formGroup]="filtro" (ngSubmit)="carregar()">
            <div class="campo w-full sm:w-64">
              <mat-label class="font-semibold mb-2 block">Nome</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-icon matIconPrefix>search</mat-icon>
                <input [attr.aria-label]="'Nome'" matInput formControlName="nome" placeholder="Ex.: Casamento Ana e Pedro" />
              </mat-form-field>
            </div>
            <div class="campo w-full sm:w-44">
              <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [attr.aria-label]="'Tipo'" formControlName="tipo">
                  <mat-option value="">Todos</mat-option>
                  @for (tipo of tipos; track tipo.valor) { <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
            <app-campo-data class="w-full sm:w-40" rotulo="De" formControlName="de" />
            <app-campo-data class="w-full sm:w-40" rotulo="Até" formControlName="ate" />
            <div class="campo w-full sm:w-36">
              <mat-label class="font-semibold mb-2 block">Tag</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'Tag'" matInput formControlName="tag" placeholder="Ex.: VIP" />
              </mat-form-field>
            </div>
            <div class="flex gap-2">
              <button mat-flat-button type="submit">Filtrar</button>
              <button mat-stroked-button type="button" (click)="limparFiltros()">Limpar</button>
            </div>
          </form>
        }
          </div>
          <div class="barra-lista-acoes">
            <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo evento</button>
          </div>
        </div>

        @if (ehEstatisticas()) {
          @if (estatisticas(); as stats) {
            <p class="mb-4">Total de eventos: <strong>{{ stats.total }}</strong></p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              @for (item of stats.situacoes; track item.situacao) {
                <mat-card class="shadow-none text-center mb-0! bg-light-primary">
                  <mat-card-content>
                    <h4 class="text-sm font-semibold text-primary">{{ rotuloSituacao(item.situacao) }}</h4>
                    <h6 class="text-xl font-semibold text-primary mt-2!">{{ item.quantidade }}</h6>
                    <span class="text-xs text-primary">{{ item.percentual }}%</span>
                  </mat-card-content>
                </mat-card>
              }
            </div>
            <mat-card class="border! border-border! shadow-none">
              <div class="p-4"><mat-card-title>Eventos por mês (ano atual)</mat-card-title></div>
              <mat-card-content class="border-t border-border">
                <div class="flex gap-2 items-end h-36">
                  @for (mes of stats.eventosPorMes; track mes.mes) {
                    <div class="flex-1 flex flex-col items-center justify-end gap-1 h-full text-xs">
                      <div class="w-full max-w-7 min-h-1 bg-primary rounded-t" [style.height.%]="altura(mes.quantidade, stats.eventosPorMes)"></div>
                      <span class="text-muted">{{ meses[mes.mes - 1] }}</span>
                      <span class="font-semibold">{{ mes.quantidade }}</span>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
            <div class="grid grid-cols-12 gap-6">
              <mat-card class="border! border-border! shadow-none mb-0! col-span-12 lg:col-span-4">
                <div class="p-4"><mat-card-title>Ranking de orçamento</mat-card-title></div>
                <mat-card-content class="border-t border-border">
                  @if (stats.rankingOrcamento.length === 0) {
                    <p class="text-center text-muted py-6">Sem dados.</p>
                  } @else {
                    <table mat-table [dataSource]="stats.rankingOrcamento" class="min-w-full">
                      <ng-container matColumnDef="posicao"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm pl-0!">#</th><td mat-cell *matCellDef="let r" class="pl-0!">{{ r.posicao }}</td></ng-container>
                      <ng-container matColumnDef="servico"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm">Serviço</th><td mat-cell *matCellDef="let r">{{ r.servico }}</td></ng-container>
                      <ng-container matColumnDef="percentual"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm text-end!">%</th><td mat-cell *matCellDef="let r" class="text-end!">{{ r.percentual }}%</td></ng-container>
                      <tr mat-header-row *matHeaderRowDef="colsOrc"></tr>
                      <tr mat-row *matRowDef="let row; columns: colsOrc"></tr>
                    </table>
                  }
                </mat-card-content>
              </mat-card>
              <mat-card class="border! border-border! shadow-none mb-0! col-span-12 lg:col-span-4">
                <div class="p-4"><mat-card-title>Fornecedores mais contratados</mat-card-title></div>
                <mat-card-content class="border-t border-border">
                  @if (stats.rankingFornecedores.length === 0) {
                    <p class="text-center text-muted py-6">Sem dados.</p>
                  } @else {
                    <table mat-table [dataSource]="stats.rankingFornecedores" class="min-w-full">
                      <ng-container matColumnDef="posicao"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm pl-0!">#</th><td mat-cell *matCellDef="let r" class="pl-0!">{{ r.posicao }}</td></ng-container>
                      <ng-container matColumnDef="fornecedor"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm">Fornecedor</th><td mat-cell *matCellDef="let r">{{ r.fornecedor }}</td></ng-container>
                      <ng-container matColumnDef="quantidade"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm text-end!">Qtd</th><td mat-cell *matCellDef="let r" class="text-end!">{{ r.quantidade }}</td></ng-container>
                      <tr mat-header-row *matHeaderRowDef="colsForn"></tr>
                      <tr mat-row *matRowDef="let row; columns: colsForn"></tr>
                    </table>
                  }
                </mat-card-content>
              </mat-card>
              <mat-card class="border! border-border! shadow-none mb-0! col-span-12 lg:col-span-4">
                <div class="p-4"><mat-card-title>Serviços mais utilizados</mat-card-title></div>
                <mat-card-content class="border-t border-border">
                  @if (stats.rankingServicos.length === 0) {
                    <p class="text-center text-muted py-6">Sem dados.</p>
                  } @else {
                    <table mat-table [dataSource]="stats.rankingServicos" class="min-w-full">
                      <ng-container matColumnDef="posicao"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm pl-0!">#</th><td mat-cell *matCellDef="let r" class="pl-0!">{{ r.posicao }}</td></ng-container>
                      <ng-container matColumnDef="servico"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm">Serviço</th><td mat-cell *matCellDef="let r">{{ r.servico }}</td></ng-container>
                      <ng-container matColumnDef="quantidade"><th mat-header-cell *matHeaderCellDef class="font-semibold text-sm text-end!">Qtd</th><td mat-cell *matCellDef="let r" class="text-end!">{{ r.quantidade }}</td></ng-container>
                      <tr mat-header-row *matHeaderRowDef="colsServ"></tr>
                      <tr mat-row *matRowDef="let row; columns: colsServ"></tr>
                    </table>
                  }
                </mat-card-content>
              </mat-card>
            </div>
          }
        } @else if (eventos().length === 0) {
          <p class="text-center text-muted py-10">Não há evento para mostrar.</p>
        } @else {
          <div class="relative">
            <table mat-table [dataSource]="eventos()" class="min-w-full">
              <ng-container matColumnDef="nome">
                <th mat-header-cell *matHeaderCellDef class="font-semibold text-sm pl-0!">Evento</th>
                <td mat-cell *matCellDef="let evento" class="pl-0! whitespace-nowrap">
                  <a class="text-sm font-semibold no-underline" [routerLink]="['/eventos', evento.id]">{{ evento.nome }}</a>
                  <span class="block text-xs text-muted">{{ rotuloTipo(evento.tipo) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="data">
                <th mat-header-cell *matHeaderCellDef class="font-semibold text-sm">Data</th>
                <td mat-cell *matCellDef="let evento" class="whitespace-nowrap">
                  {{ evento.data | gdData }}
                  @if (evento.diasRestantes !== null && evento.diasRestantes >= 0) {
                    <span class="block text-xs text-muted">Faltam {{ evento.diasRestantes }} dias</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="situacao">
                <th mat-header-cell *matHeaderCellDef class="font-semibold text-sm">Situação</th>
                <td mat-cell *matCellDef="let evento" class="whitespace-nowrap"><span [class]="classe(evento.situacao)">{{ rotuloSituacao(evento.situacao) }}</span></td>
              </ng-container>
              <ng-container matColumnDef="tarefas">
                <th mat-header-cell *matHeaderCellDef class="font-semibold text-sm">Tarefas</th>
                <td mat-cell *matCellDef="let evento" class="whitespace-nowrap">{{ evento.tarefasConcluidas }} de {{ evento.tarefas }}</td>
              </ng-container>
              <ng-container matColumnDef="convidados">
                <th mat-header-cell *matHeaderCellDef class="font-semibold text-sm">Convidados</th>
                <td mat-cell *matCellDef="let evento" class="whitespace-nowrap">{{ evento.convidadosConfirmados }} de {{ evento.convidados }}</td>
              </ng-container>
              <ng-container matColumnDef="acoes">
                <th mat-header-cell *matHeaderCellDef class="font-semibold text-sm text-end! pr-0!">Ações</th>
                <td mat-cell *matCellDef="let evento" class="text-end! whitespace-nowrap pr-0!">
                  <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="editar(evento.id)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir()"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colunas"></tr>
              <tr mat-row *matRowDef="let row; columns: colunas"></tr>
            </table>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class EventosPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly tipos = TIPOS;
  protected readonly meses = MESES;
  protected readonly eventos = signal<EventoResumo[]>([]);
  protected readonly estatisticas = signal<EstatisticasEventos | null>(null);
  protected readonly abaAtual = signal(0);
  protected readonly colunas = ['nome', 'data', 'situacao', 'tarefas', 'convidados', 'acoes'];
  protected readonly colsOrc = ['posicao', 'servico', 'percentual'];
  protected readonly colsForn = ['posicao', 'fornecedor', 'quantidade'];
  protected readonly colsServ = ['posicao', 'servico', 'quantidade'];
  protected readonly abas = [
    { valor: 'EmAndamento', rotulo: 'Em andamento' },
    { valor: 'Concluido', rotulo: 'Concluído' },
    { valor: 'Cancelado', rotulo: 'Cancelado' },
    { valor: 'Estatisticas', rotulo: 'Estatísticas' },
  ];
  protected readonly filtro = this.fb.group({
    nome: '',
    tipo: '',
    de: this.fb.control<Date | null>(null),
    ate: this.fb.control<Date | null>(null),
    tag: '',
  });

  ngOnInit(): void {
    this.carregarEstatisticas();
    this.rota.queryParamMap.subscribe((params) => {
      const situacao = params.get('situacao') ?? 'EmAndamento';
      const indice = this.abas.findIndex((aba) => aba.valor === situacao);
      this.abaAtual.set(indice >= 0 ? indice : 0);
      if (this.ehEstatisticas()) {
        this.carregarEstatisticas();
      } else {
        this.carregar();
      }
    });
  }

  protected ehEstatisticas(): boolean {
    return this.abas[this.abaAtual()]?.valor === 'Estatisticas';
  }

  protected trocarAba(indice: number): void {
    void this.router.navigate(['/eventos'], { queryParams: { situacao: this.abas[indice].valor } });
  }

  protected abrir(): void {
    this.dialog.open(NovoEventoDialog, DIALOG_LARGO).afterClosed().subscribe((salvo) => {
      if (salvo) {
        this.carregar();
        this.carregarEstatisticas();
      }
    });
  }

  protected editar(id: string): void {
    this.dialog.open(EventoFormPage, { ...DIALOG_LARGO, data: { id } }).afterClosed().subscribe((salvo) => {
      if (salvo) {
        this.carregar();
      }
    });
  }

  protected excluir(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir evento', texto: 'Confirma a exclusão deste evento?', confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) {
        this.toast.erro('A exclusão ainda não está disponível neste fluxo.');
      }
    });
  }

  protected limparFiltros(): void {
    this.filtro.reset({ nome: '', tipo: '', de: null, ate: null, tag: '' });
    this.carregar();
  }

  protected carregar(): void {
    const valor = this.filtro.getRawValue();
    this.negocio.eventos({
      situacao: this.abas[this.abaAtual()].valor,
      nome: valor.nome ?? '',
      tipo: valor.tipo ?? '',
      de: deDataParaIso(valor.de) ?? '',
      ate: deDataParaIso(valor.ate) ?? '',
      tag: valor.tag ?? '',
    }).subscribe({
      next: (eventos) => this.eventos.set(eventos),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected carregarEstatisticas(): void {
    this.negocio.estatisticas().subscribe({
      next: (dados) => this.estatisticas.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected altura(quantidade: number, lista: { quantidade: number }[]): number {
    const max = Math.max(...lista.map((item) => item.quantidade), 1);
    return Math.max(4, (quantidade / max) * 100);
  }

  protected rotuloTipo(tipo: string): string {
    return this.tipos.find((item) => item.valor === tipo)?.rotulo ?? tipo;
  }

  protected rotuloSituacao(situacao: string): string {
    return this.abas.find((aba) => aba.valor === situacao)?.rotulo ?? situacao;
  }

  protected classe(situacao: string): string {
    if (situacao === 'Concluido') {
      return STATUS.sucesso;
    }
    if (situacao === 'Cancelado') {
      return STATUS.erro;
    }
    return STATUS.alerta;
  }
}
