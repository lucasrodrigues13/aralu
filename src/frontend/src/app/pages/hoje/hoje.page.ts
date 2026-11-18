import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { API_BASE_URL } from '../../core/api-base-url';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';

export interface Hoje {
  hoje: string;
  tarefasHoje: number;
  tarefasAtrasadas: number;
  tarefasSemana: number;
  cobrancas: { eventoId: string; evento: string; parcela: string; vencimento: string; saldo: number; atrasada: boolean }[];
  pagamentosSemana: number;
  valorPagamentosSemana: number;
  proximoEvento: { id: string; nome: string; data: string; dias: number } | null;
  carteira: {
    id: string; nome: string; data: string | null; percentualTarefas: number; responderam: number;
    convidados: number; tarefasAtrasadas: number; respostasAbaixo: boolean;
  }[];
  funil: { estagio: string; quantidade: number; valor: number }[];
  configuracao: { temPerfil: boolean; temPix: boolean; temContrato: boolean };
}

const CHAVE_PULADOS = 'gevents-hoje-pulados';
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
  imports: [RouterLink, MatButtonModule, MatIconModule, GdDataPipe, GdDinheiroPipe],
  template: `
    @if (dados(); as d) {
      <header class="gd-cabecalho">
        <div>
          <p class="data">{{ dataExtenso(d.hoje) }}</p>
          <h1>{{ frase(d.tarefasHoje) }}</h1>
        </div>
      </header>

      @if (checklist().length > 0) {
        <section class="gd-painel config">
          <div class="config-topo">
            <h2>Configure sua conta</h2>
            <button mat-button type="button" (click)="pularTudo()">Pular tudo</button>
          </div>
          <ul>
            @for (item of checklist(); track item.id) {
              <li>
                <mat-icon>radio_button_unchecked</mat-icon>
                <a [routerLink]="item.rota">{{ item.rotulo }}</a>
                <button mat-button type="button" class="pular" (click)="pular(item.id)">Pular</button>
              </li>
            }
          </ul>
        </section>
      }

      <section class="gd-numeros">
        <a class="gd-numero" routerLink="/tarefas">
          <span>Tarefas para hoje</span>
          <span class="gd-icone"><mat-icon>today</mat-icon></span>
          <strong>{{ d.tarefasHoje }}</strong>
        </a>
        <a class="gd-numero" routerLink="/tarefas" [queryParams]="{ filtro: 'atrasadas' }">
          <span>Tarefas atrasadas</span>
          <span class="gd-icone"><mat-icon>schedule</mat-icon></span>
          <strong [class.alerta]="d.tarefasAtrasadas > 0">{{ d.tarefasAtrasadas }}</strong>
        </a>
        <a class="gd-numero" routerLink="/tarefas">
          <span>Tarefas da semana</span>
          <span class="gd-icone"><mat-icon>date_range</mat-icon></span>
          <strong>{{ d.tarefasSemana }}</strong>
        </a>
        <a class="gd-numero" href="#cobrancas" (click)="rolar($event, 'cobrancas')">
          <span>Cobranças a fazer</span>
          <span class="gd-icone"><mat-icon>request_quote</mat-icon></span>
          <strong [class.alerta]="d.cobrancas.length > 0">{{ d.cobrancas.length }}</strong>
          <small>atrasadas e próximos 7 dias</small>
        </a>
        <a class="gd-numero" routerLink="/pagamentos">
          <span>Pagar a fornecedores</span>
          <span class="gd-icone"><mat-icon>payments</mat-icon></span>
          <strong>{{ d.pagamentosSemana }}</strong>
          <small>{{ d.valorPagamentosSemana | gdDinheiro }} nesta semana</small>
        </a>
      </section>

      <div class="duas-colunas">
        <section class="gd-painel proximo">
          <h2>Próximo evento</h2>
          @if (d.proximoEvento; as p) {
            <a [routerLink]="['/eventos', p.id]" class="proximo-nome">{{ p.nome }}</a>
            <p class="contagem">{{ p.dias === 0 ? 'É hoje' : (p.dias === 1 ? 'Amanhã' : 'Faltam ' + p.dias + ' dias') }}</p>
            <span class="gd-sub">{{ p.data | gdData }}</span>
          } @else {
            <p class="gd-vazio">Nenhum evento com data marcada.</p>
          }
        </section>

        <section class="gd-painel" id="cobrancas">
          <h2>Cobranças a fazer</h2>
          @if (d.cobrancas.length === 0) {
            <p class="gd-vazio">Nenhuma parcela do casal vencida ou vencendo nos próximos 7 dias.</p>
          } @else {
            <ul class="cobrancas">
              @for (item of d.cobrancas; track $index) {
                <li>
                  <a [routerLink]="['/eventos', item.eventoId, 'dinheiro']">{{ item.evento }}</a>
                  <span class="gd-sub">{{ item.parcela }} · {{ item.vencimento | gdData }}</span>
                  <span class="valor">{{ item.saldo | gdDinheiro }}</span>
                  <span [class]="item.atrasada ? 'gd-status erro' : 'gd-status alerta'">{{ item.atrasada ? 'Atrasada' : 'A vencer' }}</span>
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <section class="gd-painel">
        <h2>Carteira</h2>
        @if (d.carteira.length === 0) {
          <p class="gd-vazio">Nenhum evento em andamento.</p>
        } @else {
          <div class="gd-tabela-rolagem">
            <table class="gd-grade">
              <thead>
                <tr><th>Evento</th><th>Data</th><th>Tarefas feitas</th><th>Responderam</th><th>Atenção</th></tr>
              </thead>
              <tbody>
                @for (linha of d.carteira; track linha.id) {
                  <tr>
                    <td><a [routerLink]="['/eventos', linha.id]">{{ linha.nome }}</a></td>
                    <td>{{ linha.data ? (linha.data | gdData) : '—' }}</td>
                    <td>
                      <div class="barra"><span [style.width.%]="linha.percentualTarefas"></span></div>
                      <span class="gd-sub">{{ linha.percentualTarefas }}%</span>
                    </td>
                    <td>{{ linha.convidados === 0 ? '—' : linha.responderam + ' de ' + linha.convidados }}</td>
                    <td>
                      @if (linha.tarefasAtrasadas > 0) {
                        <span class="gd-status erro">{{ linha.tarefasAtrasadas }} atrasada{{ linha.tarefasAtrasadas > 1 ? 's' : '' }}</span>
                      }
                      @if (linha.respostasAbaixo) {
                        <span class="gd-status alerta">Respostas abaixo do esperado</span>
                      }
                      @if (linha.tarefasAtrasadas === 0 && !linha.respostasAbaixo) { <span class="gd-sub">—</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <section class="gd-painel">
        <h2>Funil de vendas</h2>
        <div class="gd-numeros funil">
          @for (estagio of d.funil; track estagio.estagio) {
            <a class="gd-numero" routerLink="/oportunidades">
              <span>{{ estagio.estagio }}</span>
              <strong>{{ estagio.quantidade }}</strong>
              <small>{{ estagio.valor | gdDinheiro }}</small>
            </a>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .data { margin: 0 0 4px; font-size: 13px; color: var(--gd-muted-foreground); text-transform: capitalize; }
    h2 { font-size: 16px; font-weight: 600; margin: 0 0 12px; }
    .gd-painel { margin-bottom: 16px; }
    strong.alerta { color: var(--gd-destructive); }
    .duas-colunas { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 16px; }
    @media (max-width: 899px) { .duas-colunas { grid-template-columns: 1fr; } }
    .proximo-nome { font-size: 18px; font-weight: 600; color: var(--gd-foreground); text-decoration: none; }
    .contagem { font-size: 28px; font-weight: 700; margin: 8px 0 2px; color: var(--gd-primary); }
    .cobrancas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .cobrancas li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid color-mix(in oklab, var(--gd-border) 50%, transparent); }
    .cobrancas li:last-child { border-bottom: 0; }
    .valor { font-weight: 600; white-space: nowrap; }
    .barra { width: 96px; height: 6px; border-radius: 3px; background: var(--gd-muted); overflow: hidden; }
    .barra span { display: block; height: 100%; background: var(--gd-primary); }
    td .gd-status { margin-right: 4px; }
    .funil { margin-bottom: 0; }
    .config ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .config li { display: flex; align-items: center; gap: 8px; }
    .config li mat-icon { color: var(--gd-muted-foreground); font-size: 18px; width: 18px; height: 18px; }
    .config-topo { display: flex; justify-content: space-between; align-items: center; }
    .config-topo h2 { margin: 0; }
    .pular { margin-left: auto; }
  `,
})
export class HojePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly toast = inject(ToastService);
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

  ngOnInit(): void {
    this.http.get<Hoje>(`${this.base}/api/v1/hoje`).subscribe({
      next: (dados) => this.dados.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
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

  protected rolar(evento: Event, id: string): void {
    evento.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
