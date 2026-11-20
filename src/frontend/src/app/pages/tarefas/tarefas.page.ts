import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventoAbasComponent } from '../eventos/evento-abas.component';
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
import { AssistentesClient } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { NegocioClient, SITUACOES_TAREFA, Tarefa } from '../../core/negocio.client';
import { chaveResponsavel, opcoesResponsavel, OpcaoResponsavel, rotuloResponsavel } from '../../shared/responsaveis';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso } from '../../shared/data';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { AplicarModeloDialog } from '../eventos/aplicar-modelo.dialog';
import { colunasPorDia, filtrarTarefas, FiltroTarefasLista, secoesAteEvento } from './grupo-tarefa';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TarefaFormDialog } from './tarefa-form.dialog';
import { TarefaLeituraDialog } from './tarefa-leitura.dialog';
import { ChecklistTarefaComponent, progressoChecklist } from './checklist-tarefa';

@Component({
  selector: 'app-tarefas',
  imports: [RouterLink, ReactiveFormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, GdDataPipe, EventoAbasComponent, CampoDataComponent, ChecklistTarefaComponent, MatCheckboxModule],
  template: `
    @if (eventoId()) { <app-evento-abas [eventoId]="eventoId()" /> }
    <mat-card class="cardWithShadow">
    <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Tarefas</mat-card-title>
        <mat-card-subtitle>Pendências dos eventos da assessoria.</mat-card-subtitle>
      </div>
      @if (eventoId() && podeEditar()) {
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button type="button" (click)="aplicarModelo()">
            <mat-icon>playlist_add</mat-icon>
            Aplicar modelo
          </button>
          <button mat-flat-button type="button" (click)="nova()">
            <mat-icon>add</mat-icon>
            Nova tarefa
          </button>
        </div>
      }
    </div>
    <mat-card-content class="border-t border-border">
    @if (somenteAtrasadas()) {
      <div class="flex items-center gap-3 rounded p-4 mb-6 bg-light-warning text-warning">
        <mat-icon>warning</mat-icon>
        <strong class="flex-1 min-w-0">Mostrando só as tarefas atrasadas.</strong>
        <button mat-stroked-button type="button" (click)="somenteAtrasadas.set(false)">Ver todas</button>
      </div>
    }
    @if (eventoId()) {
        <div class="flex flex-wrap items-end gap-4 mb-6">
            <div class="campo w-full sm:w-64">
              <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput aria-label="Buscar" placeholder="Título da tarefa" [value]="buscaEvento()" (input)="buscaEvento.set($any($event.target).value)" />
            </mat-form-field>
            </div>
            <div class="campo w-full sm:w-48">
              <mat-label class="font-semibold mb-2 block">Situação</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [value]="situacaoEvento()" (valueChange)="situacaoEvento.set($event)" aria-label="Situação">
                  <mat-option value="">Todas</mat-option>
                  @for (item of situacoes; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="campo w-full sm:w-48">
              <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [value]="responsavelEvento()" (valueChange)="responsavelEvento.set($event)" aria-label="Responsável">
                  <mat-option value="">Todos</mat-option>
                  @for (papel of papeis(); track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
            @if (servicos().length > 0) {
              <div class="campo w-full sm:w-48">
                <mat-label class="font-semibold mb-2 block">Serviço</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select [value]="servicoEvento()" (valueChange)="servicoEvento.set($event)" aria-label="Serviço">
                    <mat-option value="">Todos</mat-option>
                    <mat-option value="-">Sem serviço</mat-option>
                    @for (servico of servicos(); track servico.id) { <mat-option [value]="servico.id">{{ servico.nome }}</mat-option> }
                  </mat-select>
                </mat-form-field>
              </div>
            }
            <mat-checkbox class="mb-1" [checked]="soChecklist()" (change)="soChecklist.set($event.checked)">Só com checklist</mat-checkbox>
            <span class="text-sm text-muted mb-2.5 ml-auto">{{ plural(visiveisEvento().length, 'tarefa encontrada', 'tarefas encontradas') }}</span>
        </div>
        @if (secoesEvento().length === 0) {
          <p class="text-center text-muted py-10">Não há tarefa para mostrar.</p>
        } @else {
          <div class="relative overflow-auto">
            <table class="tabela agrupada">
              <thead>
                <tr>
                  <th class="coluna-expandir"><span class="sr-only">Checklist</span></th>
                  <th>Tarefa</th>
                  <th>Prazo</th>
                  <th>Serviço</th>
                  <th>Responsáveis</th>
                  <th class="text-end! whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              @for (secao of secoesEvento(); track secao.id) {
                <tbody>
                  <tr class="cabeca-grupo" (click)="alternarGrupo(secao.id)">
                    <td colspan="6">
                      <button type="button" class="botao-grupo" [attr.aria-expanded]="!grupoFechado(secao.id)">
                        <span class="nome-grupo">{{ secao.rotulo }}</span>
                        <span class="contagem-grupo">
                          {{ plural(secao.tarefas.length, 'tarefa', 'tarefas') }}
                          <mat-icon>{{ grupoFechado(secao.id) ? 'expand_more' : 'expand_less' }}</mat-icon>
                        </span>
                      </button>
                    </td>
                  </tr>
                  @if (!grupoFechado(secao.id)) {
                    @for (tarefa of secao.tarefas; track tarefa.id) {
                      <tr class="linha-tarefa" [class.com-detalhe]="aberta(tarefa)" (click)="ler(tarefa)">
                        <td class="coluna-expandir" (click)="$event.stopPropagation()">
                          @if (tarefa.checklist.length > 0) {
                            <button
                              mat-icon-button
                              type="button"
                              class="seta"
                              [class.aberta]="aberta(tarefa)"
                              [attr.aria-expanded]="aberta(tarefa)"
                              [attr.aria-label]="(aberta(tarefa) ? 'Recolher' : 'Expandir') + ' checklist de ' + tarefa.titulo"
                              (click)="alternar(tarefa)"
                            >
                              <mat-icon>chevron_right</mat-icon>
                            </button>
                          }
                        </td>
                        <td>
                          <div class="titulo-tarefa">
                            <span class="ponto" [class]="'ponto ' + corSituacao(tarefa.situacao)" [title]="rotulo(tarefa.situacao)"></span>
                            <div>
                              {{ tarefa.titulo }}
                              @if (tarefa.grupo || tarefa.checklist.length > 0) {
                                <span class="block text-xs text-muted">
                                  {{ tarefa.grupo }}
                                  @if (tarefa.checklist.length > 0) {
                                    @if (tarefa.grupo) { · }
                                    <span class="progresso"><mat-icon>checklist</mat-icon>{{ progresso(tarefa).feitos }}/{{ progresso(tarefa).total }}</span>
                                  }
                                </span>
                              }
                            </div>
                          </div>
                        </td>
                        <td class="prazo">{{ tarefa.prazo ? (tarefa.prazo | gdData) : '—' }}</td>
                        <td>{{ tarefa.servico ?? '—' }}</td>
                        <td>{{ nomesResponsaveis(tarefa) }}</td>
                        <td class="text-end! whitespace-nowrap" (click)="$event.stopPropagation()">
                          @if (tarefa.eventoEmAndamento) {
                            <button mat-icon-button type="button" aria-label="Editar" (click)="editar(tarefa)"><mat-icon>edit</mat-icon></button>
                          }
                          <button mat-icon-button type="button" aria-label="Excluir" (click)="excluir()"><mat-icon>delete</mat-icon></button>
                        </td>
                      </tr>
                      @if (aberta(tarefa)) {
                        <tr class="linha-detalhe">
                          <td class="detalhe" colspan="6">
                            <app-checklist-tarefa [tarefa]="tarefa" [editavel]="tarefa.eventoEmAndamento" (mudou)="atualizar($event)" />
                          </td>
                        </tr>
                      }
                    }
                  }
                </tbody>
              }
            </table>
          </div>
        }
    } @else {
    <form class="flex flex-wrap items-end gap-4 mb-6" [formGroup]="filtro" (ngSubmit)="aplicarFiltro()">
      <div class="campo w-full sm:w-48">
        <mat-label class="font-semibold mb-2 block">Situação</mat-label>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
        <mat-select [attr.aria-label]="'Situação'" formControlName="situacao">
          <mat-option value="">Todas</mat-option>
          @for (item of situacoes; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
        </mat-select>
      </mat-form-field>
      </div>
      <div class="campo w-full sm:w-48">
        <mat-label class="font-semibold mb-2 block">Evento</mat-label>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <mat-select [attr.aria-label]="'Evento'" formControlName="eventoId">
            <mat-option value="">Todos</mat-option>
            @for (evento of eventos(); track evento.id) { <mat-option [value]="evento.id">{{ evento.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
        <div class="campo w-full sm:w-48">
          <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <mat-select [attr.aria-label]="'Responsável'" formControlName="responsavel">
            <mat-option value="">Todos</mat-option>
            @for (papel of papeis(); track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <div class="campo w-full sm:w-48">
          <mat-label class="font-semibold mb-2 block">Serviço</mat-label>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <mat-select [attr.aria-label]="'Serviço'" formControlName="servicoId">
            <mat-option value="">Todos</mat-option>
            @for (servico of servicos(); track servico.id) { <mat-option [value]="servico.id">{{ servico.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <app-campo-data class="w-full sm:w-40" rotulo="Prazo de" formControlName="prazoDe" />
        <app-campo-data class="w-full sm:w-40" rotulo="Prazo até" formControlName="prazoAte" />
        <div class="campo w-full sm:w-48">
          <mat-label class="font-semibold mb-2 block">Tag</mat-label>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <input [attr.aria-label]="'Tag'" matInput formControlName="tag" />
        </mat-form-field>
        </div>
      <div class="flex gap-2"><button mat-flat-button type="submit">Filtrar</button>
      <button mat-stroked-button type="button" (click)="limparFiltros()">Limpar</button></div>
    </form>
    <mat-button-toggle-group [value]="visao()" (change)="visao.set($event.value)" aria-label="Visão" class="mb-6">
      <mat-button-toggle value="lista">Lista</mat-button-toggle>
      <mat-button-toggle value="situacao">Quadro por situação</mat-button-toggle>
      <mat-button-toggle value="dia">Quadro por dia</mat-button-toggle>
    </mat-button-toggle-group>
    @if (visao() === 'lista') {
        @if (visiveis().length === 0) {
          <p class="text-center text-muted py-10">Não há tarefa.</p>
        } @else {
          <div class="relative overflow-auto">
          <table mat-table class="min-w-full" [dataSource]="visiveis()" multiTemplateDataRows>
            <ng-container matColumnDef="expandir">
              <th mat-header-cell *matHeaderCellDef class="coluna-expandir"><span class="sr-only">Checklist</span></th>
              <td mat-cell *matCellDef="let tarefa" class="coluna-expandir" (click)="$event.stopPropagation()">
                @if (tarefa.checklist.length > 0) {
                  <button
                    mat-icon-button
                    type="button"
                    class="seta"
                    [class.aberta]="aberta(tarefa)"
                    [attr.aria-expanded]="aberta(tarefa)"
                    [attr.aria-label]="(aberta(tarefa) ? 'Recolher' : 'Expandir') + ' checklist de ' + tarefa.titulo"
                    (click)="alternar(tarefa)"
                  >
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="detalhe">
              <td mat-cell *matCellDef="let tarefa" class="detalhe" [attr.colspan]="colunas.length">
                @if (aberta(tarefa)) {
                  <app-checklist-tarefa [tarefa]="tarefa" [editavel]="tarefa.eventoEmAndamento" (mudou)="atualizar($event)" />
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="titulo">
              <th mat-header-cell *matHeaderCellDef>Tarefa</th>
              <td mat-cell *matCellDef="let tarefa">
                {{ tarefa.titulo }}
                @if (tarefa.grupo || tarefa.checklist.length > 0) {
                  <span class="block text-xs text-muted">
                    {{ tarefa.grupo }}
                    @if (tarefa.checklist.length > 0) {
                      @if (tarefa.grupo) { · }
                      <span class="progresso"><mat-icon>checklist</mat-icon>{{ progresso(tarefa).feitos }}/{{ progresso(tarefa).total }}</span>
                    }
                  </span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="evento">
              <th mat-header-cell *matHeaderCellDef>Evento</th>
              <td mat-cell *matCellDef="let tarefa"><a [routerLink]="['/eventos', tarefa.eventoId, 'tarefas']" (click)="$event.stopPropagation()">{{ tarefa.evento }}</a></td>
            </ng-container>
            <ng-container matColumnDef="prazo">
              <th mat-header-cell *matHeaderCellDef>Prazo</th>
              <td mat-cell *matCellDef="let tarefa">{{ tarefa.prazo | gdData }}</td>
            </ng-container>
            <ng-container matColumnDef="situacao">
              <th mat-header-cell *matHeaderCellDef>Situação</th>
              <td mat-cell *matCellDef="let tarefa"><span [class]="classeSituacao(tarefa.situacao)">{{ rotulo(tarefa.situacao) }}</span></td>
            </ng-container>
            <ng-container matColumnDef="responsavel">
              <th mat-header-cell *matHeaderCellDef>Responsáveis</th>
              <td mat-cell *matCellDef="let tarefa">{{ nomesResponsaveis(tarefa) }}</td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
              <td mat-cell *matCellDef="let tarefa" class="text-end! whitespace-nowrap" (click)="$event.stopPropagation()">
                @if (tarefa.eventoEmAndamento) {
                  <button mat-icon-button type="button" aria-label="Editar" (click)="editar(tarefa)"><mat-icon>edit</mat-icon></button>
                }
                <button mat-icon-button type="button" aria-label="Excluir" (click)="excluir()"><mat-icon>delete</mat-icon></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas" [class.com-detalhe]="aberta(row)" (click)="ler(row)"></tr>
            <tr mat-row *matRowDef="let row; columns: ['detalhe']" class="linha-detalhe" [class.fechada]="!aberta(row)"></tr>
          </table>
          </div>
        }
    } @else if (visao() === 'situacao') {
      @if (visiveis().length === 0) {
        <p class="text-center text-muted py-10">Não há tarefa.</p>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (coluna of situacoes; track coluna.valor) {
            <mat-card class="border! border-border! shadow-none mb-0!"><mat-card-content>
              <mat-card-title class="mb-2">{{ coluna.rotulo }}</mat-card-title>
              @for (tarefa of daSituacao(coluna.valor); track tarefa.id) {
                <button type="button" class="cartao" (click)="ler(tarefa)">{{ tarefa.titulo }} @if (tarefa.prazo) { — {{ tarefa.prazo | gdData }} }</button>
              }
            </mat-card-content></mat-card>
          }
        </div>
      }
    } @else {
      @if (porDia().length === 0) {
        <p class="text-center text-muted py-10">Não há tarefa.</p>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (coluna of porDia(); track coluna.id) {
            <mat-card class="border! border-border! shadow-none mb-0!"><mat-card-content>
              <mat-card-title class="mb-2">{{ coluna.id === 'sem-prazo' ? coluna.rotulo : (coluna.rotulo | gdData) }}</mat-card-title>
              @for (tarefa of coluna.tarefas; track tarefa.id) {
                <button type="button" class="cartao" (click)="ler(tarefa)">{{ tarefa.titulo }}</button>
              }
            </mat-card-content></mat-card>
          }
        </div>
      }
    }
    }
    </mat-card-content>
    </mat-card>
  `,
  styles: `
    .quadro { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 16px; }
    .cartao { display: block; width: 100%; text-align: left; margin-top: 8px; padding: 10px 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-small); background: transparent; color: inherit; font: inherit; cursor: pointer; }
    .cartao:hover { border-color: var(--mat-sys-primary); color: var(--mat-sys-primary); }
    tr { cursor: pointer; }
    .coluna-expandir { width: 40px; padding-right: 0 !important; }
    .seta { width: 32px; height: 32px; padding: 4px; color: var(--mat-sys-surface-container-lowest); }
    .seta mat-icon { transition: transform 0.15s; }
    .seta.aberta mat-icon { transform: rotate(90deg); }
    .progresso { display: inline-flex; align-items: center; gap: 2px; vertical-align: middle; }
    .progresso mat-icon { font-size: 14px; width: 14px; height: 14px; }
    tr.com-detalhe td { border-bottom-color: transparent !important; }
    tr.linha-detalhe { cursor: default; }
    tr.linha-detalhe.fechada { display: none; }
    tr.linha-detalhe:hover td { background: transparent !important; }
    td.detalhe { padding: 0 0 12px 40px !important; }
    .agrupada tr.cabeca-grupo td { padding: 0 !important; background: color-mix(in oklab, var(--mat-sys-surface-bright) 60%, transparent); border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .agrupada tr.cabeca-grupo:hover td { background: var(--mat-sys-surface-bright) !important; }
    .botao-grupo { display: flex; width: 100%; align-items: center; justify-content: space-between; padding: 10px 12px; border: 0; background: transparent; color: var(--mat-sys-on-background); font: inherit; cursor: pointer; }
    .nome-grupo { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
    .contagem-grupo { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--mat-sys-surface-container-lowest); }
    .contagem-grupo mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .titulo-tarefa { display: flex; align-items: flex-start; gap: 10px; }
    .ponto { flex-shrink: 0; width: 10px; height: 10px; margin-top: 5px; border-radius: 50%; background: var(--mat-sys-surface-container-lowest); }
    .ponto.ok { background: var(--success-color); }
    .ponto.erro { background: var(--mat-sys-error); }
    .ponto.info { background: var(--info-color); }
    .ponto.alerta { background: var(--warning-color); }
    td.prazo { white-space: nowrap; }
  `,
})
export class TarefasPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly situacoes = SITUACOES_TAREFA;
  private readonly assistentes = inject(AssistentesClient);
  private readonly auth = inject(AuthService);
  protected readonly papeis = signal<OpcaoResponsavel[]>(opcoesResponsavel([], this.auth.ehAssistente() ? 'Dona da conta' : 'Eu'));
  protected readonly tarefas = signal<Tarefa[]>([]);
  protected readonly visao = signal('lista');
  protected readonly eventoId = signal('');
  protected readonly podeEditar = signal(false);
  protected readonly somenteAtrasadas = signal(false);
  protected readonly filtroAplicado = signal<FiltroTarefasLista>(filtroVazio());
  protected readonly filtro = this.fb.nonNullable.group({
    situacao: '',
    eventoId: '',
    responsavel: '',
    servicoId: '',
    tag: '',
    prazoDe: this.fb.control<Date | null>(null),
    prazoAte: this.fb.control<Date | null>(null),
  });
  protected readonly visiveis = computed(() => {
    const base = this.somenteAtrasadas() ? this.tarefas().filter(atrasada) : this.tarefas();
    return filtrarTarefas(base, this.filtroAplicado());
  });
  /** Aba do evento (SPEC-003 §6.2): filtros imediatos e grupos pela distância até o evento. */
  protected readonly dataEvento = signal<string | null>(null);
  protected readonly buscaEvento = signal('');
  protected readonly situacaoEvento = signal('');
  protected readonly responsavelEvento = signal('');
  protected readonly servicoEvento = signal('');
  protected readonly soChecklist = signal(false);
  private readonly gruposFechados = signal<ReadonlySet<string>>(new Set());
  protected readonly visiveisEvento = computed(() => {
    const termo = this.buscaEvento().trim().toLocaleLowerCase('pt');
    const servico = this.servicoEvento();
    return this.tarefas().filter((tarefa) =>
      (!termo || tarefa.titulo.toLocaleLowerCase('pt').includes(termo))
      && (!this.situacaoEvento() || tarefa.situacao === this.situacaoEvento())
      && (!this.responsavelEvento() || tarefa.responsaveis.some((item) => chaveResponsavel(item) === this.responsavelEvento()))
      && (!servico || (servico === '-' ? !tarefa.servicoEventoId : tarefa.servicoEventoId === servico))
      && (!this.soChecklist() || tarefa.checklist.length > 0));
  });
  protected readonly secoesEvento = computed(() => secoesAteEvento(this.visiveisEvento(), this.dataEvento()));
  protected readonly porDia = computed(() => colunasPorDia(this.visiveis()));
  protected readonly eventos = computed(() => {
    const vistos = new Map<string, string>();
    for (const tarefa of this.tarefas()) vistos.set(tarefa.eventoId, tarefa.evento);
    return [...vistos.entries()].map(([id, nome]) => ({ id, nome }));
  });
  protected readonly servicos = computed(() => {
    const vistos = new Map<string, string>();
    for (const tarefa of this.tarefas()) {
      if (tarefa.servicoEventoId && tarefa.servico) vistos.set(tarefa.servicoEventoId, tarefa.servico);
    }
    return [...vistos.entries()].map(([id, nome]) => ({ id, nome }));
  });
  protected readonly colunas = ['expandir', 'titulo', 'evento', 'prazo', 'situacao', 'responsavel', 'acoes'];
  /** Tarefas com a checklist aberta na lista. */
  private readonly abertas = signal<ReadonlySet<string>>(new Set());
  protected readonly progresso = progressoChecklist;

  ngOnInit(): void {
    this.assistentes.nomes().subscribe({
      next: (nomes) => this.papeis.set(opcoesResponsavel(nomes, this.auth.ehAssistente() ? 'Dona da conta' : 'Eu', nomes.map((item) => `Assistente:${item.id}`))),
      error: () => undefined,
    });
    this.eventoId.set(this.rota.snapshot.paramMap.get('id') ?? '');
    this.somenteAtrasadas.set(this.rota.snapshot.queryParamMap.get('filtro') === 'atrasadas');
    if (this.eventoId()) {
      this.negocio.evento(this.eventoId()).subscribe({
        next: (evento) => {
          this.podeEditar.set(evento.situacao === 'EmAndamento');
          this.dataEvento.set(evento.data ?? null);
        },
        error: () => this.podeEditar.set(false),
      });
    }
    this.carregar();
  }

  protected rotulo(situacao: string): string {
    return this.situacoes.find((item) => item.valor === situacao)?.rotulo ?? situacao;
  }

  protected classeSituacao(situacao: string): string {
    if (situacao === 'Concluida') return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-success text-success';
    if (situacao === 'Atrasada') return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-error text-error';
    if (situacao === 'EmAndamento') return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-info text-info';
    return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-warning text-warning';
  }

  protected nomesResponsaveis(tarefa: Tarefa): string {
    return tarefa.responsaveis
      .map((item) => rotuloResponsavel(item, this.papeis()))
      .join(', ');
  }

  protected plural(n: number, um: string, varios: string): string {
    return `${n} ${n === 1 ? um : varios}`;
  }

  protected corSituacao(situacao: string): string {
    if (situacao === 'Concluida') return 'ok';
    if (situacao === 'Atrasada') return 'erro';
    if (situacao === 'EmAndamento') return 'info';
    return 'alerta';
  }

  protected grupoFechado(id: string): boolean {
    return this.gruposFechados().has(id);
  }

  protected alternarGrupo(id: string): void {
    this.gruposFechados.update((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(id)) proximo.add(id);
      return proximo;
    });
  }

  protected aberta(tarefa: Tarefa): boolean {
    return this.abertas().has(tarefa.id);
  }

  protected alternar(tarefa: Tarefa): void {
    this.abertas.update((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(tarefa.id)) proximo.add(tarefa.id);
      return proximo;
    });
  }

  protected atualizar(tarefa: Tarefa): void {
    this.tarefas.update((lista) => lista.map((item) => (item.id === tarefa.id ? tarefa : item)));
  }

  protected daSituacao(situacao: string): Tarefa[] {
    return this.visiveis().filter((tarefa) => tarefa.situacao === situacao);
  }

  protected aplicarFiltro(): void {
    const valor = this.filtro.getRawValue();
    this.filtroAplicado.set({
      situacao: valor.situacao,
      eventoId: valor.eventoId,
      responsavel: valor.responsavel,
      servicoId: valor.servicoId,
      tag: valor.tag,
      prazoDe: deDataParaIso(valor.prazoDe),
      prazoAte: deDataParaIso(valor.prazoAte),
    });
  }

  protected limparFiltros(): void {
    this.filtro.reset({ situacao: '', eventoId: '', responsavel: '', servicoId: '', tag: '', prazoDe: null, prazoAte: null });
    this.filtroAplicado.set(filtroVazio());
  }

  protected nova(): void {
    const eventoId = this.eventoId();
    if (!eventoId) return;
    this.dialog.open(TarefaFormDialog, { ...DIALOG, data: { eventoId } }).afterClosed().subscribe((salvo) => {
      if (salvo) this.carregar();
    });
  }

  protected ler(tarefa: Tarefa): void {
    this.dialog.open(TarefaLeituraDialog, { ...DIALOG, data: tarefa }).afterClosed().subscribe((acao) => {
      if (acao === 'editar') this.editar(tarefa);
      if (acao === 'mudou') this.carregar();
    });
  }

  protected editar(tarefa: Tarefa): void {
    this.dialog.open(TarefaFormDialog, { ...DIALOG, data: { eventoId: tarefa.eventoId, tarefa } }).afterClosed().subscribe((salvo) => {
      if (salvo) this.carregar();
    });
  }

  protected aplicarModelo(): void {
    const eventoId = this.eventoId();
    if (!eventoId) return;
    this.negocio.evento(eventoId).subscribe({
      next: (evento) => {
        this.dialog.open(AplicarModeloDialog, {
          ...DIALOG,
          data: { eventoId, tipo: evento.tipo },
        }).afterClosed().subscribe((ok) => {
          if (ok) this.carregar();
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir tarefa', texto: 'Confirma a exclusão desta tarefa?', confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) {
        this.toast.erro('A exclusão ainda não está disponível neste fluxo.');
      }
    });
  }

  private carregar(): void {
    const pedido = this.eventoId() ? this.negocio.tarefasDoEvento(this.eventoId()) : this.negocio.tarefas();
    pedido.subscribe({
      next: (tarefas) => this.tarefas.set(tarefas),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

function filtroVazio(): FiltroTarefasLista {
  return { situacao: '', eventoId: '', responsavel: '', servicoId: '', tag: '', prazoDe: null, prazoAte: null };
}

/** Mesma regra do resumo do evento: não concluída e marcada como atrasada ou com prazo vencido. */
function atrasada(tarefa: Tarefa): boolean {
  if (tarefa.situacao === 'Concluida') return false;
  if (tarefa.situacao === 'Atrasada') return true;
  const hoje = new Date();
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  return !!tarefa.prazo && tarefa.prazo.slice(0, 10) < iso;
}
