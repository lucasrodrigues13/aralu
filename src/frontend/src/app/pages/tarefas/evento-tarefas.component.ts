import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AssistentesClient } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, SITUACOES_TAREFA, Tarefa } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_EM_MASSA, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { chaveResponsavel, opcoesResponsavel, OpcaoResponsavel, rotuloResponsavel } from '../../shared/responsaveis';
import { AplicarModeloDialog } from '../eventos/aplicar-modelo.dialog';
import { ChecklistTarefaComponent, progressoChecklist } from './checklist-tarefa';
import { secoesAteEvento } from './grupo-tarefa';
import { TarefaFormDialog } from './tarefa-form.dialog';
import { AdicionarTarefasEmMassaDialog } from './adicionar-tarefas-em-massa.dialog';
import { exibirPrazoRelativo } from '../../shared/prazo-modelo';
import { TarefaLeituraDialog } from './tarefa-leitura.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Estado } from '../../shared/estado';

/** Tarefas do evento dentro do Resumo (SPEC-051): lista agrupada pela distância até o evento, com todas as ações (SPEC-003 v4). */
@Component({
  selector: 'app-evento-tarefas',
  imports: [ExpandirTodosComponent, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, GdDataPipe, ChecklistTarefaComponent, MatTooltipModule, Estado],
  template: `
    <mat-card class="cardWithShadow" id="tarefas-do-evento">
    <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Tarefas do evento</mat-card-title>
        <mat-card-subtitle>Tudo o que falta fazer, por prazo.</mat-card-subtitle>
      </div>
      @if (podeEditar()) {
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button type="button" (click)="aplicarModelo()">
            <mat-icon>playlist_add</mat-icon>
            Aplicar modelo
          </button>
          <button mat-stroked-button type="button" (click)="emMassa()">
            <mat-icon>library_add</mat-icon>
            Adicionar em massa
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
            @if (temFiltro()) {
              <button mat-stroked-button type="button" class="mb-1" (click)="limparFiltros()">
                <mat-icon>filter_alt_off</mat-icon>
                Limpar filtros
              </button>
            }
            <span class="text-sm text-muted mb-2.5 ml-auto">{{ plural(visiveisEvento().length, 'tarefa encontrada', 'tarefas encontradas') }}</span>
        </div>
        @if (!carregado()) {
          <app-estado titulo="Carregando…" />
        } @else if (secoesEvento().length === 0) {
          <app-estado [titulo]="tarefas().length === 0 ? 'Nenhuma tarefa ainda' : 'Nada encontrado'" [texto]="tarefas().length === 0 ? undefined : 'Mude a busca ou os filtros.'" />
        } @else {
          <app-expandir-todos [abertos]="todosGruposAbertos()" (alternar)="alternarTodosGrupos()">
            {{ secoesEvento().length }} {{ secoesEvento().length === 1 ? 'grupo' : 'grupos' }} ·
            {{ plural(visiveisEvento().length, 'tarefa', 'tarefas') }}
          </app-expandir-todos>
          <div class="relative">
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
                  <tr class="cabeca-grupo grupo" [class.aberto]="!grupoFechado(secao.id)" (click)="alternarGrupo(secao.id)">
                    <td colspan="6">
                      <button type="button" class="grupo-cabecalho" [attr.aria-expanded]="!grupoFechado(secao.id)">
                        <mat-icon class="seta">expand_more</mat-icon>
                        <span class="grupo-texto nome-grupo">{{ secao.rotulo }}</span>
                        <span class="contagem-grupo">
                          {{ plural(secao.tarefas.length, 'tarefa', 'tarefas') }}
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
                              [matTooltip]="(aberta(tarefa) ? 'Recolher' : 'Expandir') + ' checklist de ' + tarefa.titulo"
                              (click)="alternar(tarefa)"
                            >
                              <mat-icon>chevron_right</mat-icon>
                            </button>
                          }
                        </td>
                        <td>
                          <div class="titulo-tarefa" [class.concluida]="tarefa.situacao === 'Concluida'">
                            <mat-checkbox
                              class="concluir"
                              [checked]="tarefa.situacao === 'Concluida'"
                              [disabled]="!tarefa.eventoEmAndamento || concluindo() === tarefa.id"
                              [attr.aria-label]="(tarefa.situacao === 'Concluida' ? 'Reabrir tarefa: ' : 'Marcar como concluída: ') + tarefa.titulo"
                              (click)="$event.stopPropagation()"
                              (change)="concluir(tarefa, $event.checked)"
                            />
                            <span class="ponto" [class]="'ponto ' + corSituacao(tarefa.situacao)" [title]="rotulo(tarefa.situacao)"></span>
                            <div class="texto-tarefa">
                              {{ tarefa.titulo }}
                              @if (tarefa.checklist.length > 0) {
                                <span class="block text-xs text-muted">
                                  <span class="progresso"><mat-icon>checklist</mat-icon>{{ progresso(tarefa).feitos }}/{{ progresso(tarefa).total }}</span>
                                </span>
                              }
                            </div>
                          </div>
                        </td>
                        <td class="prazo">
                          {{ tarefa.prazo ? (tarefa.prazo | gdData) : (tarefa.prazoRelativo != null ? '' : '—') }}
                          @if (tarefa.prazoRelativo != null) { <span class="block text-xs text-muted">{{ prazoRelativoTexto(tarefa.prazoRelativo) }}</span> }
                          @if (prazoBadge(tarefa); as badge) {
                            <span class="ml-2 inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap" [class]="badge.classe">{{ badge.rotulo }}</span>
                          }
                        </td>
                        <td>{{ tarefa.servico ?? '—' }}</td>
                        <td>{{ nomesResponsaveis(tarefa) }}</td>
                        <td class="text-end! whitespace-nowrap" (click)="$event.stopPropagation()">
                          @if (tarefa.eventoEmAndamento) {
                            <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="editar(tarefa)"><mat-icon>edit</mat-icon></button>
                          }
                          <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir()"><mat-icon>delete</mat-icon></button>
                        </td>
                      </tr>
                      @if (aberta(tarefa)) {
                        <tr class="linha-detalhe">
                          <td class="detalhe" colspan="6">
                            <app-checklist-tarefa [tarefa]="tarefa" [opcoes]="papeis()" [editavel]="tarefa.eventoEmAndamento" (mudou)="atualizar($event)" />
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
    </mat-card-content>
    </mat-card>
  `,
  styles: `
    tr { cursor: pointer; }
    .coluna-expandir { width: 40px; padding-right: 0 !important; }
    button.seta { width: 32px; height: 32px; padding: 4px; color: var(--mat-sys-surface-container-lowest); }
    button.seta mat-icon { transition: transform 0.15s; }
    button.seta.aberta mat-icon { transform: rotate(90deg); }
    .progresso { display: inline-flex; align-items: center; gap: 2px; vertical-align: middle; }
    .progresso mat-icon { font-size: 14px; width: 14px; height: 14px; }
    tr.com-detalhe td { border-bottom-color: transparent !important; }
    tr.linha-detalhe { cursor: default; }
    tr.linha-detalhe.fechada { display: none; }
    tr.linha-detalhe:hover td { background: transparent !important; }
    td.detalhe { padding: 0 0 12px 40px !important; }
    .agrupada tr.cabeca-grupo td { padding: 0 !important; background: color-mix(in oklab, var(--mat-sys-surface-bright) 60%, transparent); border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .agrupada tr.cabeca-grupo:hover td { background: var(--mat-sys-surface-bright) !important; }
    .nome-grupo { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
    .contagem-grupo { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--mat-sys-surface-container-lowest); }
    .titulo-tarefa { display: flex; align-items: flex-start; gap: 10px; }
    .titulo-tarefa .concluir { flex-shrink: 0; margin: -10px -6px -10px -10px; }
    .titulo-tarefa.concluida .texto-tarefa { color: var(--mat-sys-surface-container-lowest); text-decoration: line-through; }
    .ponto { flex-shrink: 0; width: 10px; height: 10px; margin-top: 5px; border-radius: 50%; background: var(--mat-sys-surface-container-lowest); }
    .ponto.ok { background: var(--success-color); }
    .ponto.erro { background: var(--mat-sys-error); }
    .ponto.info { background: var(--info-color); }
    .ponto.alerta { background: var(--warning-color); }
    td.prazo { white-space: nowrap; }
  `,
})
export class EventoTarefasComponent implements OnInit {
  readonly eventoId = input.required<string>();
  /** Avisa o Resumo quando algo mudou (os cartões de contagem se refazem). */
  readonly mudou = output<void>();
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly assistentes = inject(AssistentesClient);
  private readonly auth = inject(AuthService);
  protected readonly situacoes = SITUACOES_TAREFA;
  protected readonly papeis = signal<OpcaoResponsavel[]>(opcoesResponsavel([], this.auth.ehAssistente() ? 'Dona da conta' : 'Eu'));
  protected readonly tarefas = signal<Tarefa[]>([]);
  protected readonly carregado = signal(false);
  protected readonly podeEditar = signal(false);
  protected readonly somenteAtrasadas = signal(false);
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
    const base = this.somenteAtrasadas() ? this.tarefas().filter(atrasada) : this.tarefas();
    return base.filter((tarefa) =>
      (!termo || tarefa.titulo.toLocaleLowerCase('pt').includes(termo))
      && (!this.situacaoEvento() || tarefa.situacao === this.situacaoEvento())
      && (!this.responsavelEvento() || tarefa.responsaveis.some((item) => chaveResponsavel(item) === this.responsavelEvento()))
      && (!servico || (servico === '-' ? !tarefa.servicoEventoId : tarefa.servicoEventoId === servico))
      && (!this.soChecklist() || tarefa.checklist.length > 0));
  });
  protected readonly secoesEvento = computed(() => secoesAteEvento(this.visiveisEvento(), this.dataEvento()));
  protected readonly servicos = computed(() => {
    const vistos = new Map<string, string>();
    for (const tarefa of this.tarefas()) {
      if (tarefa.servicoEventoId && tarefa.servico) vistos.set(tarefa.servicoEventoId, tarefa.servico);
    }
    return [...vistos.entries()].map(([id, nome]) => ({ id, nome }));
  });
  private readonly abertas = signal<ReadonlySet<string>>(new Set());
  protected readonly progresso = progressoChecklist;

  ngOnInit(): void {
    this.assistentes.nomes().subscribe({
      next: (nomes) => this.papeis.set(opcoesResponsavel(nomes, this.auth.ehAssistente() ? 'Dona da conta' : 'Eu', nomes.map((item) => `Assistente:${item.id}`))),
      error: () => undefined,
    });
    this.negocio.evento(this.eventoId()).subscribe({
      next: (evento) => {
        this.podeEditar.set(evento.situacao === 'EmAndamento');
        this.dataEvento.set(evento.data ?? null);
      },
      error: () => this.podeEditar.set(false),
    });
    this.carregar();
  }

  /** Refaz a lista (o Resumo chama depois de aplicar um modelo). */
  recarregar(): void {
    this.carregar();
  }

  /** Chamado pelo Resumo (alerta de tarefas atrasadas): filtra e leva a lista para a tela. */
  mostrarAtrasadas(): void {
    this.somenteAtrasadas.set(true);
    document.getElementById('tarefas-do-evento')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  /** Chamado pelo cartão Tarefas do Resumo: só leva a lista para a tela. */
  irParaLista(): void {
    document.getElementById('tarefas-do-evento')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  protected readonly temFiltro = computed(() => !!(this.buscaEvento().trim() || this.situacaoEvento() || this.responsavelEvento() || this.servicoEvento() || this.soChecklist() || this.somenteAtrasadas()));

  protected limparFiltros(): void {
    this.buscaEvento.set('');
    this.situacaoEvento.set('');
    this.responsavelEvento.set('');
    this.servicoEvento.set('');
    this.soChecklist.set(false);
    this.somenteAtrasadas.set(false);
  }

  /** Atrasada em vermelho, para hoje em amarelo; prazo futuro, sem prazo ou concluída não ganham badge. */
  protected prazoBadge(tarefa: Tarefa): { rotulo: string; classe: string } | null {
    if (atrasada(tarefa)) return { rotulo: 'Atrasada', classe: 'bg-light-error text-error' };
    if (tarefa.situacao !== 'Concluida' && tarefa.prazo && tarefa.prazo.slice(0, 10) === hojeIso()) return { rotulo: 'Hoje', classe: 'bg-light-warning text-warning' };
    return null;
  }

  protected rotulo(situacao: string): string {
    return this.situacoes.find((item) => item.valor === situacao)?.rotulo ?? situacao;
  }

  protected nomesResponsaveis(tarefa: Tarefa): string {
    return tarefa.responsaveis.map((item) => rotuloResponsavel(item, this.papeis())).join(', ');
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

  protected readonly todosGruposAbertos = computed(() => this.secoesEvento().every((secao) => !this.gruposFechados().has(secao.id)));

  protected alternarTodosGrupos(): void {
    this.gruposFechados.set(this.todosGruposAbertos() ? new Set(this.secoesEvento().map((secao) => secao.id)) : new Set());
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
    this.mudou.emit();
  }

  protected readonly concluindo = signal<string | null>(null);

  /** Marca a tarefa como concluída ou a reabre; o Resumo refaz os cartões de contagem. */
  protected concluir(tarefa: Tarefa, concluida: boolean): void {
    this.concluindo.set(tarefa.id);
    this.negocio.concluirTarefa(tarefa.id, concluida).subscribe({
      next: (atual) => {
        this.concluindo.set(null);
        this.atualizar(atual);
      },
      error: (erro: unknown) => {
        this.concluindo.set(null);
        this.toast.erro(mensagemDeErro(erro));
        this.carregar();
      },
    });
  }

  /** Adicionar tarefas em massa (SPEC-003 v5, item 6). */
  protected emMassa(): void {
    this.dialog.open(AdicionarTarefasEmMassaDialog, { ...DIALOG_EM_MASSA, data: { modo: 'evento', eventoId: this.eventoId() } }).afterClosed().subscribe((salvo) => {
      if (salvo) this.carregar();
    });
  }

  protected prazoRelativoTexto(dias: number): string {
    return exibirPrazoRelativo(dias);
  }

  protected nova(): void {
    this.dialog.open(TarefaFormDialog, { ...DIALOG, data: { eventoId: this.eventoId() } }).afterClosed().subscribe((salvo) => {
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
    this.negocio.evento(this.eventoId()).subscribe({
      next: (evento) => {
        this.dialog.open(AplicarModeloDialog, {
          ...DIALOG,
          data: { eventoId: this.eventoId(), tipo: evento.tipo },
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
      data: { titulo: 'Excluir tarefa', texto: 'Confirma a exclusão desta tarefa?', confirmar: 'Excluir', destrutivo: true },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.toast.erro('A exclusão ainda não está disponível neste fluxo.');
    });
  }

  private carregar(): void {
    this.negocio.tarefasDoEvento(this.eventoId()).subscribe({
      next: (tarefas) => {
        this.tarefas.set(tarefas);
        this.carregado.set(true);
        this.mudou.emit();
      },
      error: (erro: unknown) => { this.carregado.set(true); this.toast.erro(mensagemDeErro(erro)); },
    });
  }
}

/** Mesma regra do resumo do evento: não concluída e marcada como atrasada ou com prazo vencido. */
function atrasada(tarefa: Tarefa): boolean {
  if (tarefa.situacao === 'Concluida') return false;
  if (tarefa.situacao === 'Atrasada') return true;
  return !!tarefa.prazo && tarefa.prazo.slice(0, 10) < hojeIso();
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}
