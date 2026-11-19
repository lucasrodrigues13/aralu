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
import { NegocioClient, PAPEIS_RESPONSAVEL_TAREFA, SITUACOES_TAREFA, Tarefa } from '../../core/negocio.client';
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
  imports: [
    RouterLink, ReactiveFormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, GdDataPipe, EventoAbasComponent, CampoDataComponent,
    ChecklistTarefaComponent, MatCheckboxModule,
  ],
  template: `
    @if (eventoId()) { <app-evento-abas [eventoId]="eventoId()" /> }
    <header class="gd-cabecalho">
      <div>
        <h1>Tarefas</h1>
        <p>Pendências dos eventos da assessoria.</p>
      </div>
      @if (eventoId() && podeEditar()) {
        <div class="gd-cabecalho-acoes">
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
    </header>
    @if (somenteAtrasadas()) {
      <div class="gd-alerta alerta">
        <span class="gd-crescer"><strong>Mostrando só as tarefas atrasadas.</strong></span>
        <button mat-button class="gd-secundario gd-pequeno" type="button" (click)="somenteAtrasadas.set(false)">Ver todas</button>
      </div>
    }
    @if (eventoId()) {
      <section class="gd-painel">
        <div class="gd-barra">
          <span class="gd-barra-inicio gd-sub encontradas">{{ plural(visiveisEvento().length, 'tarefa encontrada', 'tarefas encontradas') }}</span>
          <div class="gd-filtros">
            <mat-checkbox [checked]="soChecklist()" (change)="soChecklist.set($event.checked)">Só com checklist</mat-checkbox>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-select [value]="situacaoEvento()" (valueChange)="situacaoEvento.set($event)" aria-label="Situação">
                <mat-option value="">Todas as situações</mat-option>
                @for (item of situacoes; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-select [value]="responsavelEvento()" (valueChange)="responsavelEvento.set($event)" aria-label="Responsável">
                <mat-option value="">Todos os responsáveis</mat-option>
                @for (papel of papeis; track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
            @if (servicos().length > 0) {
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-select [value]="servicoEvento()" (valueChange)="servicoEvento.set($event)" aria-label="Serviço">
                  <mat-option value="">Todos os serviços</mat-option>
                  <mat-option value="-">Sem serviço</mat-option>
                  @for (servico of servicos(); track servico.id) { <mat-option [value]="servico.id">{{ servico.nome }}</mat-option> }
                </mat-select>
              </mat-form-field>
            }
            <mat-form-field class="gd-busca" appearance="outline" subscriptSizing="dynamic">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput placeholder="Buscar pelo título" [value]="buscaEvento()" (input)="buscaEvento.set($any($event.target).value)" />
            </mat-form-field>
          </div>
        </div>
        @if (secoesEvento().length === 0) {
          <p class="gd-vazio">Não há tarefa para mostrar.</p>
        } @else {
          <div class="gd-tabela-rolagem">
            <table class="gd-grade agrupada">
              <thead>
                <tr>
                  <th class="coluna-expandir"><span class="gd-sr">Checklist</span></th>
                  <th>Tarefa</th>
                  <th>Prazo</th>
                  <th>Serviço</th>
                  <th>Responsáveis</th>
                  <th class="gd-acoes">Ações</th>
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
                                <span class="gd-sub">
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
                        <td class="gd-acoes" (click)="$event.stopPropagation()">
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
      </section>
    } @else {
    <form class="gd-filtros" [formGroup]="filtro" (ngSubmit)="aplicarFiltro()">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Situação</mat-label>
        <mat-select formControlName="situacao">
          <mat-option value="">Todas</mat-option>
          @for (item of situacoes; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Evento</mat-label>
          <mat-select formControlName="eventoId">
            <mat-option value="">Todos</mat-option>
            @for (evento of eventos(); track evento.id) { <mat-option [value]="evento.id">{{ evento.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Responsável</mat-label>
          <mat-select formControlName="responsavel">
            <mat-option value="">Todos</mat-option>
            @for (papel of papeis; track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Serviço</mat-label>
          <mat-select formControlName="servicoId">
            <mat-option value="">Todos</mat-option>
            @for (servico of servicos(); track servico.id) { <mat-option [value]="servico.id">{{ servico.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <app-campo-data rotulo="Prazo de" formControlName="prazoDe" />
        <app-campo-data rotulo="Prazo até" formControlName="prazoAte" />
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Tag</mat-label>
          <input matInput formControlName="tag" />
        </mat-form-field>
      <button mat-stroked-button type="submit">Filtrar</button>
      <button mat-stroked-button type="button" (click)="limparFiltros()">Limpar filtros</button>
    </form>
    <mat-button-toggle-group [value]="visao()" (change)="visao.set($event.value)">
      <mat-button-toggle value="lista">Lista</mat-button-toggle>
      <mat-button-toggle value="situacao">Quadro por situação</mat-button-toggle>
      <mat-button-toggle value="dia">Quadro por dia</mat-button-toggle>
    </mat-button-toggle-group>
    @if (visao() === 'lista') {
      <section class="gd-painel">
        @if (visiveis().length === 0) {
          <p class="gd-vazio">Não há tarefa.</p>
        } @else {
          <table class="gd-grade" mat-table [dataSource]="visiveis()" multiTemplateDataRows>
            <ng-container matColumnDef="expandir">
              <th mat-header-cell *matHeaderCellDef class="coluna-expandir"><span class="gd-sr">Checklist</span></th>
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
                  <span class="gd-sub">
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
              <td mat-cell *matCellDef="let tarefa"><span class="gd-status alerta">{{ rotulo(tarefa.situacao) }}</span></td>
            </ng-container>
            <ng-container matColumnDef="responsavel">
              <th mat-header-cell *matHeaderCellDef>Responsáveis</th>
              <td mat-cell *matCellDef="let tarefa">{{ nomesResponsaveis(tarefa) }}</td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="gd-acoes">Ações</th>
              <td mat-cell *matCellDef="let tarefa" class="gd-acoes" (click)="$event.stopPropagation()">
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
        }
      </section>
    } @else if (visao() === 'situacao') {
      @if (visiveis().length === 0) {
        <p class="gd-vazio">Não há tarefa.</p>
      } @else {
        <div class="quadro">
          @for (coluna of situacoes; track coluna.valor) {
            <section class="gd-painel">
              <h2>{{ coluna.rotulo }}</h2>
              @for (tarefa of daSituacao(coluna.valor); track tarefa.id) {
                <button type="button" class="cartao" (click)="ler(tarefa)">{{ tarefa.titulo }} @if (tarefa.prazo) { — {{ tarefa.prazo | gdData }} }</button>
              }
            </section>
          }
        </div>
      }
    } @else {
      @if (porDia().length === 0) {
        <p class="gd-vazio">Não há tarefa.</p>
      } @else {
        <div class="quadro">
          @for (coluna of porDia(); track coluna.id) {
            <section class="gd-painel">
              <h2>{{ coluna.id === 'sem-prazo' ? coluna.rotulo : (coluna.rotulo | gdData) }}</h2>
              @for (tarefa of coluna.tarefas; track tarefa.id) {
                <button type="button" class="cartao" (click)="ler(tarefa)">{{ tarefa.titulo }}</button>
              }
            </section>
          }
        </div>
      }
    }
    }
  `,
  styles: `
    .quadro { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 16px; }
    mat-button-toggle-group, .gd-filtros { margin-bottom: 16px; }
    .cartao { display: block; width: 100%; text-align: left; margin-top: 8px; padding: 8px 12px; border: 1px solid var(--gd-borda); border-radius: 8px; background: transparent; cursor: pointer; }
    tr { cursor: pointer; }
    .coluna-expandir { width: 40px; padding-right: 0 !important; }
    .seta { width: 32px; height: 32px; padding: 4px; color: var(--gd-muted-foreground); }
    .seta mat-icon { transition: transform 0.15s; }
    .seta.aberta mat-icon { transform: rotate(90deg); }
    .progresso { display: inline-flex; align-items: center; gap: 2px; vertical-align: middle; }
    .progresso mat-icon { font-size: 14px; width: 14px; height: 14px; }
    tr.com-detalhe td { border-bottom-color: transparent !important; }
    tr.linha-detalhe { cursor: default; }
    tr.linha-detalhe.fechada { display: none; }
    tr.linha-detalhe:hover td { background: transparent !important; }
    td.detalhe { padding: 0 0 12px 40px !important; }
    .encontradas { font-size: 13px; }
    .agrupada tr.cabeca-grupo td { padding: 0 !important; background: color-mix(in oklab, var(--gd-muted) 60%, transparent); border-bottom: 1px solid var(--gd-border); }
    .agrupada tr.cabeca-grupo:hover td { background: var(--gd-muted) !important; }
    .botao-grupo { display: flex; width: 100%; align-items: center; justify-content: space-between; padding: 10px 12px; border: 0; background: transparent; color: var(--gd-foreground); font: inherit; cursor: pointer; }
    .nome-grupo { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
    .contagem-grupo { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--gd-muted-foreground); }
    .contagem-grupo mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .titulo-tarefa { display: flex; align-items: flex-start; gap: 10px; }
    .ponto { flex-shrink: 0; width: 10px; height: 10px; margin-top: 5px; border-radius: 50%; background: var(--gd-muted-foreground); }
    .ponto.ok { background: var(--gd-success); }
    .ponto.erro { background: var(--gd-destructive); }
    .ponto.info { background: var(--gd-info); }
    .ponto.alerta { background: var(--gd-warning); }
    td.prazo { white-space: nowrap; }
    .gd-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  `,
})
export class TarefasPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly situacoes = SITUACOES_TAREFA;
  protected readonly papeis = PAPEIS_RESPONSAVEL_TAREFA;
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
      && (!this.responsavelEvento() || tarefa.responsaveis.some((item) => item.papel === this.responsavelEvento()))
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
    if (situacao === 'Concluida') return 'gd-status ok';
    if (situacao === 'Atrasada') return 'gd-status erro';
    if (situacao === 'EmAndamento') return 'gd-status info';
    return 'gd-status alerta';
  }

  protected nomesResponsaveis(tarefa: Tarefa): string {
    return tarefa.responsaveis
      .map((item) => this.papeis.find((papel) => papel.valor === item.papel)?.rotulo ?? item.papel)
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
