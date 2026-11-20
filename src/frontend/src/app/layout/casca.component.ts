import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/auth.service';
import { AssistentesClient } from '../core/assistentes.client';
import { ContaClient } from '../core/conta.client';
import { TemaService } from '../core/tema.service';
import { NovoEventoDialog } from '../pages/eventos/novo-evento.dialog';
import { DIALOG_LARGO } from '../shared/dialog';
import { Marca } from '../shared/marca';

interface ItemMenu {
  rotulo: string;
  icone: string;
  rota?: string;
  emBreve?: boolean;
  /** Só a dona vê (Perfil, Contratos da conta, Assistentes). */
  soDona?: boolean;
  /** Só quem pode ver o financeiro. */
  financeiro?: boolean;
}

interface GrupoMenu {
  rotulo: string;
  itens: ItemMenu[];
}

function telaEstreita(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(max-width: 959px)').matches;
}

/**
 * Casca autenticada no layout "full" do TailwindAdmin: mat-sidenav `sidebarNav` com `sidebar-list`,
 * mat-toolbar `topbar` e `pageWrapper` (docs/design-system.md, seção 4).
 */
@Component({
  selector: 'app-casca',
  host: { class: 'block h-full' },
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatListModule, MatToolbarModule, MatMenuModule, MatButtonModule, MatIconModule, Marca],
  template: `
    <mat-sidenav-container class="mainWrapper" autosize>
      <mat-sidenav
        class="sidebarNav"
        [mode]="estreito() ? 'over' : 'side'"
        [opened]="!estreito() || menuAberto()"
        (closedStart)="menuAberto.set(false)"
      >
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between">
            <div class="branding">
              <a routerLink="/hoje" (click)="fecharMenu()" aria-label="aralu, ir para Hoje" class="inline-flex">
                <app-marca [altura]="36" />
              </a>
            </div>
            @if (estreito()) {
              <button mat-icon-button type="button" class="mr-3" (click)="fecharMenu()" aria-label="Fechar menu">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
          <div class="flex-1 overflow-y-auto">
            <mat-nav-list class="sidebar-list" aria-label="Menu principal">
              @for (grupo of grupos(); track grupo.rotulo) {
                <div mat-subheader class="nav-caption">{{ grupo.rotulo }}</div>
                @for (item of grupo.itens; track item.rotulo) {
                  @if (item.rota && !item.emBreve) {
                    <a
                      mat-list-item
                      class="menu-list-item"
                      [routerLink]="item.rota"
                      routerLinkActive="activeMenu"
                      (click)="fecharMenu()"
                    >
                      <mat-icon matListItemIcon>{{ item.icone }}</mat-icon>
                      <span class="hide-menu">{{ item.rotulo }}</span>
                    </a>
                  } @else {
                    <mat-list-item class="menu-list-item disabled" title="Em breve" aria-disabled="true">
                      <mat-icon matListItemIcon>{{ item.icone }}</mat-icon>
                      <span class="hide-menu">{{ item.rotulo }}</span>
                    </mat-list-item>
                  }
                }
              }
            </mat-nav-list>
          </div>
          <div class="p-6">
            <div class="bg-light-primary flex items-center gap-3 rounded p-4">
              <span class="rounded-full bg-primary text-white size-10 shrink-0 flex items-center justify-center text-sm font-semibold">
                {{ iniciais() }}
              </span>
              <div class="min-w-0 flex-1">
                <span class="block text-xs text-muted">{{ empresa() ? 'Assistente de ' + empresa() : 'Conectado como' }}</span>
                <span class="block text-sm font-semibold truncate" [title]="auth.email()">{{ auth.email() }}</span>
              </div>
              <button mat-icon-button type="button" (click)="sair()" aria-label="Sair">
                <mat-icon>logout</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="contentWrapper">
        <mat-toolbar class="topbar gap-2">
          @if (estreito()) {
            <button mat-icon-button type="button" (click)="menuAberto.set(true)" aria-label="Abrir menu" class="flex justify-center">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="flex-auto"></span>
          @if (auth.ehAdmin() && auth.contaSelecionada(); as atual) {
            <span class="text-xs text-muted truncate">Operando a conta {{ atual.email }}</span>
          }
          <button
            mat-icon-button
            type="button"
            class="flex justify-center"
            (click)="tema.alternar()"
            [attr.aria-label]="tema.escuro() ? 'Usar modo claro' : 'Usar modo escuro'"
          >
            <mat-icon>{{ tema.escuro() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          <button
            mat-icon-button
            type="button"
            [matMenuTriggerFor]="perfilMenu"
            aria-label="Menu da conta"
            class="flex! items-center justify-center"
          >
            <span class="rounded-full bg-light-primary text-primary size-9 flex items-center justify-center text-xs font-semibold">
              {{ iniciais() }}
            </span>
          </button>
          <mat-menu #perfilMenu="matMenu" class="cardWithShadow">
            <div class="px-4 py-3">
              <span class="block text-xs text-muted">Conectado como</span>
              <span class="block text-sm font-semibold">{{ auth.email() }}</span>
            </div>
            @if (!auth.ehAssistente()) {
              <a mat-menu-item routerLink="/perfil"><mat-icon>apartment</mat-icon>Perfil da assessoria</a>
            }
            <a mat-menu-item routerLink="/conta"><mat-icon>manage_accounts</mat-icon>Minha conta</a>
            <div class="px-3 mt-3 mb-2">
              <button mat-stroked-button type="button" class="w-full" (click)="sair()">Sair</button>
            </div>
          </mat-menu>
        </mat-toolbar>

        <main class="pageWrapper">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>

    <nav class="barra-inferior" aria-label="Navegação rápida">
      <a routerLink="/hoje" routerLinkActive="ativo"><mat-icon>home</mat-icon>Hoje</a>
      <a routerLink="/eventos" routerLinkActive="ativo"><mat-icon>celebration</mat-icon>Eventos</a>
      <button type="button" class="novo" (click)="novoEvento()" aria-label="Novo evento"><mat-icon>add</mat-icon></button>
      @if (auth.podeVerFinanceiro()) {
        <a routerLink="/pagamentos" routerLinkActive="ativo"><mat-icon>payments</mat-icon>Dinheiro</a>
      }
      <button type="button" (click)="menuAberto.set(true)" aria-label="Mais opções"><mat-icon>menu</mat-icon>Mais</button>
    </nav>
  `,
})
export class CascaComponent {
  protected readonly auth = inject(AuthService);
  protected readonly tema = inject(TemaService);
  private readonly conta = inject(ContaClient);
  private readonly assistentes = inject(AssistentesClient);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly estreito = signal(telaEstreita());
  protected readonly menuAberto = signal(false);

  protected readonly empresa = signal('');

  private readonly todosOsGrupos: GrupoMenu[] = [
    {
      rotulo: 'Principal',
      itens: [
        { rotulo: 'Hoje', icone: 'today', rota: '/hoje' },
        { rotulo: 'Perfil', icone: 'apartment', rota: '/perfil', soDona: true },
        { rotulo: 'Assistentes', icone: 'support_agent', rota: '/assistentes', soDona: true },
      ],
    },
    {
      rotulo: 'Gestão de eventos',
      itens: [
        { rotulo: 'Eventos', icone: 'celebration', rota: '/eventos' },
        { rotulo: 'Tarefas', icone: 'task_alt', rota: '/tarefas' },
        { rotulo: 'Clientes', icone: 'group', rota: '/clientes' },
        { rotulo: 'Serviços e fornecedores', icone: 'storefront', rota: '/fornecedores' },
        { rotulo: 'Pagamentos', icone: 'payments', rota: '/pagamentos', financeiro: true },
      ],
    },
    {
      rotulo: 'Modelos',
      itens: [
        { rotulo: 'Modelos de evento', icone: 'content_copy', rota: '/modelos-evento' },
        { rotulo: 'Contratos', icone: 'gavel', rota: '/contratos', soDona: true },
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

  /** Menu conforme as permissões: a assistente só vê o que a SPEC-032 §8 libera. */
  protected readonly grupos = computed(() => {
    this.auth.permissoes();
    const admin = this.auth.ehAdmin();
    const grupoAdmin: GrupoMenu = {
      rotulo: 'Administração',
      itens: [{ rotulo: 'Início Admin', icone: 'admin_panel_settings', rota: '/admin' }],
    };
    // Admin sem conta escolhida só tem o Início Admin; com conta escolhida vê o menu inteiro dela.
    if (admin && !this.auth.contaSelecionada()) {
      return [grupoAdmin];
    }

    return [...(admin ? [grupoAdmin] : []), ...this.todosOsGrupos]
      .map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter(
          (item) => !(item.soDona && this.auth.ehAssistente()) && !(item.financeiro && !this.auth.podeVerFinanceiro()),
        ),
      }))
      .filter((grupo) => grupo.itens.length > 0);
  });

  protected readonly iniciais = computed(() => (this.auth.email() ?? '').slice(0, 2).toUpperCase());

  constructor() {
    if (this.auth.ehAssistente()) {
      this.conta.areaUsuario().subscribe({
        next: (area) => this.auth.permissoes.set({ podeVerFinanceiro: !!area.podeVerFinanceiro, somenteDela: !!area.somenteDela, usuarioId: area.usuarioId }),
        error: () => undefined,
      });
      this.assistentes.minhaConta().subscribe({
        next: (minha) => this.empresa.set(minha.empresa),
        error: () => undefined,
      });
    }

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
