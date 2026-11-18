import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ContaClient } from '../core/conta.client';
import { NovoEventoDialog } from '../pages/eventos/novo-evento.dialog';
import { DIALOG_LARGO } from '../shared/dialog';
import { TemaBotao } from '../shared/tema-botao';

interface ItemMenu {
  rotulo: string;
  icone: string;
  rota?: string;
  emBreve?: boolean;
}

interface GrupoMenu {
  rotulo: string;
  itens: ItemMenu[];
}

function telaEstreita(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(max-width: 959px)').matches;
}

/** Casca autenticada (docs/design-system.md, seção 4). */
@Component({
  selector: 'app-casca',
  host: { class: 'gd-casca' },
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatButtonModule, MatIconModule, TemaBotao],
  template: `
    <mat-sidenav-container>
      <mat-sidenav
        class="gd-sidebar"
        [mode]="estreito() ? 'over' : 'side'"
        [opened]="!estreito() || menuAberto()"
        (closedStart)="menuAberto.set(false)"
      >
        <div class="gd-marca">
          <span class="gd-marca-selo">G</span>
          <span class="gd-marca-nome">
            <strong>gevents</strong>
            <small>Cerimonial</small>
          </span>
          @if (estreito()) {
            <button mat-icon-button type="button" (click)="fecharMenu()" aria-label="Fechar menu">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <nav class="gd-menu" aria-label="Menu principal">
          @for (grupo of grupos; track grupo.rotulo) {
            <div class="gd-grupo">{{ grupo.rotulo }}</div>
            @for (item of grupo.itens; track item.rotulo) {
              @if (item.rota && !item.emBreve) {
                <a class="gd-item" [routerLink]="item.rota" routerLinkActive="ativo" (click)="fecharMenu()">
                  <mat-icon>{{ item.icone }}</mat-icon>
                  <span>{{ item.rotulo }}</span>
                </a>
              } @else {
                <span class="gd-item gd-item-breve" title="Em breve" aria-disabled="true">
                  <mat-icon>{{ item.icone }}</mat-icon>
                  <span>{{ item.rotulo }}</span>
                  <small>Em breve</small>
                </span>
              }
            }
          }
          @if (auth.ehAdmin()) {
            <div class="gd-grupo">Sistema</div>
            <a class="gd-item" routerLink="/admin" routerLinkActive="ativo" (click)="fecharMenu()">
              <mat-icon>admin_panel_settings</mat-icon>
              <span>Administração</span>
            </a>
          }
        </nav>
        <div class="gd-usuario">
          <span class="gd-avatar">{{ iniciais() }}</span>
          <span [title]="auth.email()">{{ auth.email() }}</span>
          <button mat-icon-button type="button" (click)="sair()" aria-label="Sair">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </mat-sidenav>
      <mat-sidenav-content>
        <header class="gd-topo">
          @if (estreito()) {
            <button mat-icon-button type="button" (click)="menuAberto.set(true)" aria-label="Abrir menu">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="gd-topo-titulo">{{ titulo() }}</span>
          <app-tema [fixo]="false" />
        </header>
        <main class="gd-conteudo">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
    <nav class="gd-barra-inferior" aria-label="Navegação rápida">
      <a routerLink="/hoje" routerLinkActive="ativo"><mat-icon>home</mat-icon>Hoje</a>
      <a routerLink="/eventos" routerLinkActive="ativo"><mat-icon>celebration</mat-icon>Eventos</a>
      <button type="button" class="gd-novo" (click)="novoEvento()" aria-label="Novo evento"><mat-icon>add</mat-icon></button>
      <a routerLink="/pagamentos" routerLinkActive="ativo"><mat-icon>payments</mat-icon>Dinheiro</a>
      <button type="button" (click)="menuAberto.set(true)" aria-label="Mais opções"><mat-icon>menu</mat-icon>Mais</button>
    </nav>
  `,
})
export class CascaComponent {
  protected readonly auth = inject(AuthService);
  private readonly conta = inject(ContaClient);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly estreito = signal(telaEstreita());
  protected readonly menuAberto = signal(false);

  protected readonly grupos: GrupoMenu[] = [
    {
      rotulo: 'Principal',
      itens: [
        { rotulo: 'Hoje', icone: 'today', rota: '/hoje' },
        { rotulo: 'Perfil', icone: 'apartment', rota: '/perfil' },
      ],
    },
    {
      rotulo: 'Gestão de eventos',
      itens: [
        { rotulo: 'Eventos', icone: 'celebration', rota: '/eventos' },
        { rotulo: 'Tarefas', icone: 'task_alt', rota: '/tarefas' },
        { rotulo: 'Clientes', icone: 'group', rota: '/clientes' },
        { rotulo: 'Serviços e fornecedores', icone: 'storefront', rota: '/fornecedores' },
        { rotulo: 'Pagamentos', icone: 'payments', rota: '/pagamentos' },
      ],
    },
    {
      rotulo: 'Modelos',
      itens: [
        { rotulo: 'Modelos de evento', icone: 'content_copy', rota: '/modelos-evento' },
        { rotulo: 'Contratos', icone: 'gavel', rota: '/contratos' },
        { rotulo: 'Modelos de briefing', icone: 'quiz', rota: '/modelos-briefing' },
        { rotulo: 'Modelos de roteiro', icone: 'schedule', rota: '/modelos-roteiro' },
        { rotulo: 'Modelos de cronograma', icone: 'view_timeline', rota: '/modelos-cronograma' },
        { rotulo: 'Modelos de inspirações', icone: 'photo_library', rota: '/modelos-inspiracoes' },
        { rotulo: 'Modelos de mensagens', icone: 'sms', rota: '/modelos-mensagens' },
      ],
    },
    {
      rotulo: 'Agenda',
      itens: [{ rotulo: 'Minha agenda', icone: 'calendar_month', rota: '/agenda' }],
    },
    {
      rotulo: 'Funil de vendas',
      itens: [
        { rotulo: 'Oportunidades', icone: 'trending_up', rota: '/oportunidades' },
        { rotulo: 'Oportunidades de RSVP', icone: 'rsvp', rota: '/leads-rsvp' },
        { rotulo: 'Contratos', icone: 'description', rota: '/contratos-funil' },
        { rotulo: 'Orçamentos', icone: 'request_quote', rota: '/orcamentos-funil' },
        { rotulo: 'Tarefas do funil', icone: 'checklist', rota: '/tarefas-funil' },
        { rotulo: 'Relatórios', icone: 'analytics', rota: '/relatorios-funil' },
        { rotulo: 'Modelos de serviços', icone: 'category', rota: '/modelos-servicos-funil' },
        { rotulo: 'Modelo de orçamento', icone: 'receipt_long', rota: '/modelos-orcamento-funil' },
        { rotulo: 'Modelos de contrato', icone: 'article', rota: '/modelos-contrato-funil' },
      ],
    },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Título da área na barra superior: o item do menu que casa com a rota. */
  protected readonly titulo = computed(() => {
    const url = this.url().split('?')[0];
    let melhor = '';
    let rotulo = 'gevents';
    for (const grupo of this.grupos) {
      for (const item of grupo.itens) {
        if (item.rota && (url === item.rota || url.startsWith(item.rota + '/')) && item.rota.length > melhor.length) {
          melhor = item.rota;
          rotulo = item.rotulo;
        }
      }
    }
    return rotulo;
  });

  protected readonly iniciais = computed(() => (this.auth.email() ?? '').slice(0, 2).toUpperCase());

  constructor() {
    this.breakpoints
      .observe('(max-width: 959px)')
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((estado) => {
        this.estreito.set(estado.matches);
        if (estado.matches) {
          this.menuAberto.set(false);
        }
      });
  }

  protected fecharMenu(): void {
    if (this.estreito()) {
      this.menuAberto.set(false);
    }
  }

  protected novoEvento(): void {
    this.dialog.open(NovoEventoDialog, DIALOG_LARGO);
  }

  protected sair(): void {
    this.conta.sair().subscribe({
      next: () => this.encerrar(),
      error: () => this.encerrar(),
    });
  }

  private encerrar(): void {
    this.auth.sair();
    void this.router.navigateByUrl('/entrar');
  }
}
