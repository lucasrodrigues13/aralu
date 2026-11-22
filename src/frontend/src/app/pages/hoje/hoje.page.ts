import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Observable, switchMap, throwError } from 'rxjs';
import { AssistentesClient } from '../../core/assistentes.client';
import { NegocioClient } from '../../core/negocio.client';
import { trocarResponsavelRemovido } from '../../shared/responsaveis';
import { API_BASE_URL } from '../../core/api-base-url';
import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { STATUS } from '../../shared/status';

/** Tarefa aberta de assistente removida (SPEC-032 §18, passo 2). */
export interface TarefaSemResponsavel {
  origem: 'Evento' | 'Funil';
  id: string;
  titulo: string;
  contextoId: string;
  contexto: string;
  prazo: string | null;
  assistente: string;
}

export interface Hoje {
  hoje: string;
  tarefasHoje: number;
  tarefasAtrasadas: number;
  tarefasSemana: number;
  cobrancas: { contratoId: string; oportunidade: string; parcela: string; vencimento: string; saldo: number; atrasada: boolean }[];
  respostasConvidados: { pendentes: number; sim: number; nao: number };
  pagamentosSemana: number;
  valorPagamentosSemana: number;
  proximoEvento: { id: string; nome: string; data: string; dias: number } | null;
  carteira: {
    id: string; nome: string; data: string | null; percentualTarefas: number; responderam: number;
    convidados: number; tarefasAtrasadas: number; respostasAbaixo: boolean;
  }[];
  funil: { estagio: string; quantidade: number; valor: number; id?: string; cor?: string }[];
  configuracao: { temPerfil: boolean; temPix: boolean; temContrato: boolean };
  retornosFunil: { id: string; nome: string; estagio: string; data: string; hora: string | null; atrasado: boolean }[];
  tarefasSemResponsavelAtivo?: TarefaSemResponsavel[];
}

const CHAVE_PULADOS = 'aralu-hoje-pulados';
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Frase da saudação (SPEC-007 §6.2). */
export function fraseHoje(n: number): string {
  if (n <= 0) return 'Nada pede você hoje';
  return n === 1 ? '1 tarefa pede você hoje' : `${n} tarefas pedem você hoje`;
}

function lerPulados(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PULADOS) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** Tela Hoje (SPEC-007 v2): o que pede ação hoje. */
@Component({
  selector: 'app-hoje',
  imports: [MatCardModule, MatListModule, MatProgressBarModule, MatSelectModule, RouterLink, MatButtonModule, MatIconModule, GdDataPipe, GdDinheiroPipe],
  template: `
    @if (dados(); as d) {
      <mat-card class="cardWithShadow">
        <mat-card-content>
          <span class="text-sm text-muted capitalize">{{ dataExtenso(d.hoje) }}</span>
          <h3 class="text-xl font-semibold mt-1">{{ frase(d.tarefasHoje) }}</h3>
        </mat-card-content>
      </mat-card>

      @if (checklist().length > 0) {
        <mat-card class="cardWithShadow">
          <div class="p-6 flex items-center justify-between gap-4">
            <mat-card-title class="mb-0">Configure sua conta</mat-card-title>
            <button mat-button type="button" (click)="pularTudo()">Pular tudo</button>
          </div>
          <mat-card-content class="border-t border-border">
            <mat-list class="p-0!">
              @for (item of checklist(); track item.id) {
                <mat-list-item class="px-0!">
                  <mat-icon matListItemIcon class="text-muted">radio_button_unchecked</mat-icon>
                  <div matListItemTitle class="flex items-center justify-between gap-2">
                    <a class="text-primary font-semibold no-underline" [routerLink]="item.rota">{{ item.rotulo }}</a>
                    <button mat-button type="button" (click)="pular(item.id)">Pular</button>
                  </div>
                </mat-list-item>
              }
            </mat-list>
          </mat-card-content>
        </mat-card>
      }

      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
        <a class="block no-underline" routerLink="/tarefas">
          <mat-card class="shadow-none text-center mb-0! h-full bg-light-primary card-hover">
            <mat-card-content>
              <mat-icon class="text-primary">today</mat-icon>
              <h4 class="text-sm font-semibold text-primary mt-2!">Tarefas para hoje</h4>
              <h6 class="text-xl font-semibold text-primary mt-2!">{{ d.tarefasHoje }}</h6>
            </mat-card-content>
          </mat-card>
        </a>
        <a class="block no-underline" routerLink="/tarefas" [queryParams]="{ filtro: 'atrasadas' }">
          <mat-card class="shadow-none text-center mb-0! h-full bg-light-error card-hover">
            <mat-card-content>
              <mat-icon class="text-error">schedule</mat-icon>
              <h4 class="text-sm font-semibold text-error mt-2!">Tarefas atrasadas</h4>
              <h6 class="text-xl font-semibold text-error mt-2!">{{ d.tarefasAtrasadas }}</h6>
            </mat-card-content>
          </mat-card>
        </a>
        <a class="block no-underline" routerLink="/tarefas">
          <mat-card class="shadow-none text-center mb-0! h-full bg-light-info card-hover">
            <mat-card-content>
              <mat-icon class="text-info">date_range</mat-icon>
              <h4 class="text-sm font-semibold text-info mt-2!">Tarefas da semana</h4>
              <h6 class="text-xl font-semibold text-info mt-2!">{{ d.tarefasSemana }}</h6>
            </mat-card-content>
          </mat-card>
        </a>
        @if (auth.podeVerFinanceiro()) {
        <a class="block no-underline" routerLink="/gestao-financeira" [queryParams]="{ filtro: 'cobrancas' }">
          <mat-card class="shadow-none text-center mb-0! h-full bg-light-warning card-hover">
            <mat-card-content>
              <mat-icon class="text-warning">request_quote</mat-icon>
              <h4 class="text-sm font-semibold text-warning mt-2!">Cobranças a fazer</h4>
              <h6 class="text-xl font-semibold text-warning mt-2!">{{ d.cobrancas.length }}</h6>
              <span class="block text-xs text-warning mt-1">atrasadas e próximos 7 dias</span>
            </mat-card-content>
          </mat-card>
        </a>
        }
        <a class="block no-underline" routerLink="/eventos">
          <mat-card class="shadow-none text-center mb-0! h-full bg-light-secondary card-hover">
            <mat-card-content>
              <mat-icon class="text-secondary">how_to_reg</mat-icon>
              <h4 class="text-sm font-semibold text-secondary mt-2!">Respostas de convidados</h4>
              <h6 class="text-xl font-semibold text-secondary mt-2!">{{ d.respostasConvidados.pendentes }}</h6>
              <span class="block text-xs text-secondary mt-1">sem resposta · {{ d.respostasConvidados.sim }} sim · {{ d.respostasConvidados.nao }} não</span>
            </mat-card-content>
          </mat-card>
        </a>
        @if (auth.podeVerFinanceiro()) {
        <a class="block no-underline" routerLink="/eventos">
          <mat-card class="shadow-none text-center mb-0! h-full bg-light-success card-hover">
            <mat-card-content>
              <mat-icon class="text-success">payments</mat-icon>
              <h4 class="text-sm font-semibold text-success mt-2!">Pagar a fornecedores</h4>
              <h6 class="text-xl font-semibold text-success mt-2!">{{ d.pagamentosSemana }}</h6>
              <span class="block text-xs text-success mt-1">{{ d.valorPagamentosSemana | gdDinheiro }} nesta semana</span>
            </mat-card-content>
          </mat-card>
        </a>
        }
      </div>

      <div class="grid grid-cols-12 gap-6">
        <mat-card class="cardWithShadow col-span-12 lg:col-span-4">
          <mat-card-content>
            <mat-card-title>Próximo evento</mat-card-title>
            @if (d.proximoEvento; as p) {
              <div class="mt-6">
                <a [routerLink]="['/eventos', p.id]" class="text-lg font-semibold no-underline">{{ p.nome }}</a>
                <h4 class="text-3xl font-semibold text-primary mt-2!">
                  {{ p.dias === 0 ? 'É hoje' : (p.dias === 1 ? 'Amanhã' : 'Faltam ' + p.dias + ' dias') }}
                </h4>
                <span class="block text-sm text-muted mt-1">{{ p.data | gdData }}</span>
              </div>
            } @else {
              <p class="text-center text-muted py-10">Nenhum evento com data marcada.</p>
            }
          </mat-card-content>
        </mat-card>

        @if (auth.podeVerFinanceiro()) {
        <mat-card class="cardWithShadow col-span-12 lg:col-span-8" id="cobrancas">
          <mat-card-content>
            <mat-card-title>Cobranças a fazer</mat-card-title>
            <mat-card-subtitle>Parcelas dos contratos com clientes vencidas ou vencendo nos próximos 7 dias</mat-card-subtitle>
            @if (d.cobrancas.length === 0) {
              <p class="text-center text-muted py-10">Nenhuma parcela de contrato vencida ou vencendo nos próximos 7 dias.</p>
            } @else {
              <div class="relative mt-4">
                <table class="tabela">
                  <thead>
                    <tr><th>Contrato</th><th>Parcela</th><th class="text-end!">Saldo</th><th class="text-end!">Situação</th></tr>
                  </thead>
                  <tbody>
                    @for (item of d.cobrancas; track $index) {
                      <tr>
                        <td><a routerLink="/gestao-financeira" [queryParams]="{ filtro: 'cobrancas' }">{{ item.oportunidade }}</a></td>
                        <td>{{ item.parcela }}<span class="block text-xs text-muted">{{ item.vencimento | gdData }}</span></td>
                        <td class="text-end!"><span class="valor">{{ item.saldo | gdDinheiro }}</span></td>
                        <td class="text-end!">
                          <span [class]="item.atrasada ? status.erro : status.alerta">{{ item.atrasada ? 'Atrasada' : 'A vencer' }}</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </mat-card-content>
        </mat-card>
        }
      </div>

      <mat-card class="cardWithShadow">
        <mat-card-content>
          <mat-card-title>Carteira</mat-card-title>
          <mat-card-subtitle>Eventos em andamento</mat-card-subtitle>
          @if (d.carteira.length === 0) {
            <p class="text-center text-muted py-10">Nenhum evento em andamento.</p>
          } @else {
            <div class="relative mt-4">
              <table class="tabela">
                <thead>
                  <tr><th>Evento</th><th>Data</th><th>Tarefas feitas</th><th>Responderam</th><th>Atenção</th></tr>
                </thead>
                <tbody>
                  @for (linha of d.carteira; track linha.id) {
                    <tr>
                      <td><a [routerLink]="['/eventos', linha.id]">{{ linha.nome }}</a></td>
                      <td class="whitespace-nowrap">{{ linha.data ? (linha.data | gdData) : '—' }}</td>
                      <td class="min-w-40">
                        <span class="text-sm font-medium block mb-1">{{ linha.percentualTarefas }}%</span>
                        <mat-progress-bar mode="determinate" [value]="linha.percentualTarefas"></mat-progress-bar>
                      </td>
                      <td>{{ linha.convidados === 0 ? '—' : linha.responderam + ' de ' + linha.convidados }}</td>
                      <td>
                        <div class="flex flex-wrap gap-1">
                          @if (linha.tarefasAtrasadas > 0) {
                            <span [class]="status.erro">{{ linha.tarefasAtrasadas }} atrasada{{ linha.tarefasAtrasadas > 1 ? 's' : '' }}</span>
                          }
                          @if (linha.respostasAbaixo) {
                            <span [class]="status.alerta">Respostas abaixo do esperado</span>
                          }
                          @if (linha.tarefasAtrasadas === 0 && !linha.respostasAbaixo) { <span class="text-muted">—</span> }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if ((d.tarefasSemResponsavelAtivo ?? []).length > 0) {
        <mat-card class="cardWithShadow" id="pendencias">
          <mat-card-content>
            <mat-card-title>Tarefas sem responsável</mat-card-title>
            <mat-card-subtitle>Tarefas abertas de assistentes que foram removidas</mat-card-subtitle>
            <div class="relative mt-4">
              <table class="tabela">
                <thead>
                  <tr><th>Tarefa</th><th>Prazo</th><th>Era de</th><th>Novo responsável</th></tr>
                </thead>
                <tbody>
                  @for (t of d.tarefasSemResponsavelAtivo; track t.origem + t.id) {
                    <tr>
                      <td>
                        {{ t.titulo }}
                        <span class="block text-xs text-muted">{{ t.origem === 'Evento' ? 'Evento' : 'Lead' }}: {{ t.contexto }}</span>
                      </td>
                      <td class="whitespace-nowrap">{{ t.prazo ? (t.prazo | gdData) : '—' }}</td>
                      <td>{{ t.assistente }}</td>
                      <td class="min-w-48">
                        <mat-select
                          class="border border-border rounded px-2 py-1"
                          [attr.aria-label]="'Novo responsável de ' + t.titulo"
                          placeholder="Escolher"
                          [disabled]="trocando() === t.id"
                          (selectionChange)="trocar(t, $event.value)"
                        >
                          @for (opcao of opcoesTroca(); track opcao.valor) {
                            <mat-option [value]="opcao.valor">{{ opcao.rotulo }}</mat-option>
                          }
                        </mat-select>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <mat-card class="cardWithShadow" id="retornos">
        <mat-card-content>
          <mat-card-title>Retornos do funil</mat-card-title>
          <mat-card-subtitle>Leads para retornar hoje ou com retorno atrasado</mat-card-subtitle>
          @if (d.retornosFunil.length === 0) {
            <p class="text-center text-muted py-10">Nenhum lead para retornar hoje.</p>
          } @else {
            <div class="relative mt-4">
              <table class="tabela">
                <thead>
                  <tr><th>Lead</th><th>Estágio</th><th class="text-end!">Situação</th></tr>
                </thead>
                <tbody>
                  @for (r of d.retornosFunil; track r.id) {
                    <tr>
                      <td>
                        <a routerLink="/oportunidades" [queryParams]="{ abrir: r.id }">{{ r.nome }}</a>
                        <span class="block text-xs text-muted">{{ r.data | gdData }}{{ r.hora ? ' às ' + r.hora.slice(0, 5) : '' }}</span>
                      </td>
                      <td>{{ r.estagio }}</td>
                      <td class="text-end!">
                        <span [class]="r.atrasado ? status.erro : status.alerta">{{ r.atrasado ? 'Atrasado' : 'Hoje' }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="cardWithShadow">
        <mat-card-content>
          <mat-card-title>Funil de vendas</mat-card-title>
          <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mt-6">
            @for (estagio of d.funil; track estagio.estagio) {
              @let cor = estagio.cor || 'primary';
              <a class="block no-underline" routerLink="/oportunidades">
                <mat-card class="shadow-none text-center mb-0! h-full card-hover" [class]="'bg-light-' + cor">
                  <mat-card-content>
                    <h4 class="text-sm font-semibold" [class]="'text-' + cor">{{ estagio.estagio }}</h4>
                    <h6 class="text-xl font-semibold mt-2!" [class]="'text-' + cor">{{ estagio.quantidade }}</h6>
                    <span class="block text-xs mt-1" [class]="'text-' + cor">{{ estagio.valor | gdDinheiro }}</span>
                  </mat-card-content>
                </mat-card>
              </a>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class HojePage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly toast = inject(ToastService);
  protected readonly status = STATUS;
  protected readonly dados = signal<Hoje | null>(null);
  private readonly pulados = signal<string[]>(lerPulados());
  protected readonly frase = fraseHoje;

  protected readonly checklist = computed(() => {
    const config = this.dados()?.configuracao;
    if (!config) return [];
    const itens = [
      { id: 'perfil', rotulo: 'Preencher o perfil da empresa', rota: '/perfil', feito: config.temPerfil },
      { id: 'pix', rotulo: 'Cadastrar a chave Pix', rota: '/perfil', feito: config.temPix },
      { id: 'contrato', rotulo: 'Cadastrar um contrato', rota: '/contratos', feito: config.temContrato },
    ];
    return itens.filter((item) => !item.feito && !this.pulados().includes(item.id));
  });

  private readonly negocio = inject(NegocioClient);
  private readonly assistentes = inject(AssistentesClient);
  protected readonly trocando = signal<string | null>(null);
  protected readonly opcoesTroca = signal<{ valor: string; rotulo: string }[]>([{ valor: 'Organizer', rotulo: 'Eu' }]);
  private removidas: string[] = [];

  /** Troca o responsável da tarefa pendente e a tira do card (SPEC-032 §18, passo 2). */
  protected trocar(tarefa: TarefaSemResponsavel, chave: string): void {
    this.trocando.set(tarefa.id);
    const pedido$: Observable<unknown> = tarefa.origem === 'Evento' ? this.trocarDoEvento(tarefa, chave) : this.trocarDoFunil(tarefa, chave);
    pedido$.subscribe({
      next: () => {
        this.trocando.set(null);
        this.dados.update((d) =>
          d ? { ...d, tarefasSemResponsavelAtivo: (d.tarefasSemResponsavelAtivo ?? []).filter((item) => item.id !== tarefa.id) } : d,
        );
        this.toast.sucesso('Responsável trocado.');
      },
      error: (erro: unknown) => {
        this.trocando.set(null);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private trocarDoEvento(tarefa: TarefaSemResponsavel, chave: string) {
    return this.negocio.tarefasDoEvento(tarefa.contextoId).pipe(
      switchMap((lista) => {
        const atual = lista.find((item) => item.id === tarefa.id);
        if (!atual) return throwError(() => new Error('Tarefa não encontrada.'));
        return this.negocio.atualizarTarefa(atual.id, {
          titulo: atual.titulo,
          descricao: atual.descricao,
          grupo: atual.grupo,
          prazo: atual.prazo,
          situacao: atual.situacao,
          prioridade: atual.prioridade,
          visibilidade: atual.visibilidade,
          atualizarServico: false,
          responsaveis: trocarResponsavelRemovido(atual.responsaveis, this.removidas, chave),
        });
      }),
    );
  }

  private trocarDoFunil(tarefa: TarefaSemResponsavel, chave: string) {
    return this.negocio.tarefasFunil().pipe(
      switchMap((lista) => {
        const atual = lista.find((item) => item.id === tarefa.id);
        if (!atual) return throwError(() => new Error('Tarefa não encontrada.'));
        return this.negocio.atualizarTarefaFunil(atual.id, {
          titulo: atual.titulo,
          oportunidadeId: atual.oportunidadeId,
          tipo: atual.tipo,
          observacao: atual.observacao,
          prazo: atual.prazo,
          responsaveis: trocarResponsavelRemovido(atual.responsaveis, this.removidas, chave),
        });
      }),
    );
  }

  ngOnInit(): void {
    this.http.get<Hoje>(`${this.base}/api/v1/hoje`).subscribe({
      next: (dados) => {
        this.dados.set(dados);
        if ((dados.tarefasSemResponsavelAtivo ?? []).length > 0) this.carregarOpcoesDeTroca();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private carregarOpcoesDeTroca(): void {
    this.assistentes.nomes().subscribe((nomes) => {
      this.removidas = nomes.filter((item) => item.removida).map((item) => item.id);
      this.opcoesTroca.set([
        { valor: 'Organizer', rotulo: 'Eu' },
        ...nomes.filter((item) => !item.removida).map((item) => ({ valor: `Assistente:${item.id}`, rotulo: item.nome })),
      ]);
    });
  }

  protected dataExtenso(iso: string): string {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return `${DIAS[data.getDay()]}, ${dia} de ${MESES[mes - 1]}`;
  }

  protected pular(id: string): void {
    this.gravarPulados([...this.pulados(), id]);
  }

  protected pularTudo(): void {
    this.gravarPulados(['perfil', 'pix', 'contrato']);
  }

  private gravarPulados(lista: string[]): void {
    this.pulados.set(lista);
    try {
      localStorage.setItem(CHAVE_PULADOS, JSON.stringify(lista));
    } catch {
      // Sem armazenamento: o item some só nesta visita.
    }
  }
}
