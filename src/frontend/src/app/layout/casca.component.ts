import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService, Modulo, permissoesDaArea } from '../core/auth.service';
import { AssistentesClient } from '../core/assistentes.client';
import { ContaClient } from '../core/conta.client';
import { AssinaturaClient, SituacaoAssinatura } from '../core/assinatura.client';
import { NegocioClient } from '../core/negocio.client';
import { TemaService } from '../core/tema.service';
import { NovoEventoDialog } from '../pages/eventos/novo-evento.dialog';
import { DIALOG_LARGO } from '../shared/dialog';
import { Marca } from '../shared/marca';
import { MatTooltipModule } from '@angular/material/tooltip';

interface ItemMenu {
  rotulo: string;
  icone: string;
  rota?: string;
  emBreve?: boolean;
  /** Só a dona vê (Perfil, Contratos da conta, Assistentes). */
  soDona?: boolean;
  /** Módulo do grupo (SPEC-062 §9): some do menu sem a permissão de ver. */
  modulo?: Modulo;
}

interface GrupoMenu {
  rotulo: string;
  itens: ItemMenu[];
}

const CHAVE_GRUPOS_FECHADOS = 'aralu.menu.gruposFechados';

function lerGruposFechados(): ReadonlySet<string> {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_GRUPOS_FECHADOS) ?? '[]');
    return new Set(Array.isArray(bruto) ? bruto.filter((r): r is string => typeof r === 'string') : []);
  } catch {
    return new Set();
  }
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatListModule, MatToolbarModule, MatMenuModule, MatButtonModule, MatIconModule, Marca, MatTooltipModule],
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
              <button mat-icon-button type="button" class="mr-3" (click)="fecharMenu()" aria-label="Fechar menu" matTooltip="Fechar menu">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
          <div class="flex-1 overflow-y-auto">
            <mat-nav-list class="sidebar-list" aria-label="Menu principal">
              @for (grupo of grupos(); track grupo.rotulo) {
                <button
                  type="button"
                  class="nav-caption flex w-full items-center justify-between border-0 cursor-pointer text-left"
                  [attr.aria-expanded]="!grupoFechado(grupo.rotulo)"
                  (click)="alternarGrupo(grupo.rotulo)"
                >
                  <span class="rotulo-grupo">{{ grupo.rotulo }}</span>
                  <mat-icon class="seta-grupo shrink-0" [class.fechado]="grupoFechado(grupo.rotulo)">expand_less</mat-icon>
                </button>
                @for (item of grupoFechado(grupo.rotulo) ? [] : grupo.itens; track item.rotulo) {
                  @if (item.rota && !item.emBreve) {
                    <a
                      mat-list-item
                      class="menu-list-item"
                      animate.enter="item-grupo-entra"
                      animate.leave="item-grupo-sai"
                      [routerLink]="item.rota"
                      routerLinkActive="activeMenu"
                      (click)="fecharMenu()"
                    >
                      <mat-icon matListItemIcon>{{ item.icone }}</mat-icon>
                      <span class="hide-menu">{{ item.rotulo }}</span>
                    </a>
                  } @else {
                    <mat-list-item class="menu-list-item disabled" animate.enter="item-grupo-entra" animate.leave="item-grupo-sai" title="Em breve" aria-disabled="true">
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
              @if (fotoUrl()) {
                <img [src]="fotoUrl()" alt="Foto do perfil" class="rounded-full size-10 shrink-0 object-cover" />
              } @else {
                <span class="rounded-full bg-primary text-white size-10 shrink-0 flex items-center justify-center text-sm font-semibold">
                  {{ iniciais() }}
                </span>
              }
              <div class="min-w-0 flex-1">
                <span class="block text-xs text-muted">{{ empresa() ? 'Assistente de ' + empresa() : 'Conectado como' }}</span>
                <span class="block text-sm font-semibold truncate" [title]="nomeDisplay() || auth.email()">{{ nomeDisplay() || auth.email() }}</span>
              </div>
              <button mat-icon-button type="button" (click)="sair()" aria-label="Sair" matTooltip="Sair">
                <mat-icon>logout</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="contentWrapper">
        <mat-toolbar class="topbar gap-2">
          @if (estreito()) {
            <button mat-icon-button type="button" (click)="menuAberto.set(true)" aria-label="Abrir menu" matTooltip="Abrir menu" class="flex justify-center">
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
            [matTooltip]="tema.escuro() ? 'Usar modo claro' : 'Usar modo escuro'"
          >
            <mat-icon>{{ tema.escuro() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          <button
            mat-icon-button
            type="button"
            [matMenuTriggerFor]="perfilMenu"
            aria-label="Menu da conta"
            matTooltip="Menu da conta"
            class="flex! items-center justify-center"
          >
            @if (fotoUrl()) {
              <img [src]="fotoUrl()" alt="Foto do perfil" class="rounded-full size-9 object-cover" />
            } @else {
              <span class="rounded-full bg-light-primary text-primary size-9 flex items-center justify-center text-xs font-semibold">
                {{ iniciais() }}
              </span>
            }
          </button>
          <mat-menu #perfilMenu="matMenu" class="cardWithShadow">
            <div class="px-4 py-3">
              <span class="block text-xs text-muted">Conectado como</span>
              <span class="block text-sm font-semibold">{{ nomeDisplay() || auth.email() }}</span>
            </div>
            @if (!auth.ehAssistente()) {
              <a mat-menu-item routerLink="/perfil"><mat-icon>apartment</mat-icon>Perfil da assessoria</a>
            }
            <a mat-menu-item routerLink="/conta"><mat-icon>manage_accounts</mat-icon>Minha conta</a>
            <button mat-menu-item type="button" (click)="sair()"><mat-icon>logout</mat-icon>Sair</button>
          </mat-menu>
        </mat-toolbar>

        @if (trial(); as t) {
          <div class="flex items-center justify-center gap-3 px-4 py-2 bg-light-warning text-warning text-sm" role="status">
            <span>Faltam {{ t.diasRestantesTrial }} {{ t.diasRestantesTrial === 1 ? 'dia' : 'dias' }} do seu teste</span>
            @if (!auth.ehAssistente()) {
              <a mat-flat-button routerLink="/configuracoes/assinatura">Assinar</a>
            }
          </div>
        }
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
        <a routerLink="/gestao-financeira" routerLinkActive="ativo"><mat-icon>payments</mat-icon>Financeiro</a>
      }
      <button type="button" (click)="menuAberto.set(true)" aria-label="Mais opções"><mat-icon>menu</mat-icon>Mais</button>
    </nav>
  `,
})
export class CascaComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly tema = inject(TemaService);
  private readonly conta = inject(ContaClient);
  private readonly assistentes = inject(AssistentesClient);
  private readonly negocio = inject(NegocioClient);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly estreito = signal(telaEstreita());
  protected readonly menuAberto = signal(false);

  protected readonly empresa = signal('');
  /** Barra de trial (SPEC-062 §13): só durante o teste, com os dias que faltam. */
  protected readonly trial = signal<SituacaoAssinatura | null>(null);
  private readonly assinatura = inject(AssinaturaClient);
  protected readonly nomeDisplay = signal('');
  protected readonly fotoUrl = signal<string | null>(null);
  private fotoLocal: string | null = null;

  /** Grupos recolhidos; lembrados só neste navegador (localStorage), sem backend. */
  private readonly gruposFechados = signal<ReadonlySet<string>>(lerGruposFechados());

  protected grupoFechado(rotulo: string): boolean {
    return this.gruposFechados().has(rotulo);
  }

  protected alternarGrupo(rotulo: string): void {
    const proximo = new Set(this.gruposFechados());
    if (!proximo.delete(rotulo)) {
      proximo.add(rotulo);
    }
    this.gruposFechados.set(proximo);
    try {
      localStorage.setItem(CHAVE_GRUPOS_FECHADOS, JSON.stringify([...proximo]));
    } catch {
      // Armazenamento indisponível: o estado vale só nesta sessão.
    }
  }

  private readonly todosOsGrupos: GrupoMenu[] = [
    {
      rotulo: 'Principal',
      itens: [
        { rotulo: 'Hoje', icone: 'today', rota: '/hoje' },
        { rotulo: 'Gestão Financeira', icone: 'account_balance_wallet', rota: '/gestao-financeira', modulo: 'Financeiro' },
        { rotulo: 'Manual de uso', icone: 'menu_book', rota: '/ajuda' },
      ],
    },
    {
      rotulo: 'Gestão de Eventos',
      itens: [
        { rotulo: 'Eventos', icone: 'celebration', rota: '/eventos', modulo: 'Eventos' },
        { rotulo: 'Tarefas', icone: 'task_alt', rota: '/tarefas', modulo: 'Tarefas' },
        { rotulo: 'Clientes', icone: 'group', rota: '/clientes', modulo: 'Clientes' },
        { rotulo: 'Serviços e Fornecedores', icone: 'storefront', rota: '/fornecedores', modulo: 'Fornecedores' },
      ],
    },
    {
      rotulo: 'Agenda',
      itens: [{ rotulo: 'Minha Agenda', icone: 'calendar_month', rota: '/agenda', modulo: 'Agenda' }],
    },
    {
      rotulo: 'Funil de Vendas',
      itens: [
        { rotulo: 'Oportunidades', icone: 'trending_up', rota: '/oportunidades', modulo: 'Funil' },
        { rotulo: 'Oportunidades de RSVP', icone: 'rsvp', rota: '/leads-rsvp', modulo: 'Funil' },
        { rotulo: 'Contratos', icone: 'description', rota: '/contratos-funil', modulo: 'OrcamentosContratos' },
        { rotulo: 'Orçamentos', icone: 'request_quote', rota: '/orcamentos-funil', modulo: 'OrcamentosContratos' },
        { rotulo: 'Tarefas do Funil', icone: 'checklist', rota: '/tarefas-funil', modulo: 'Funil' },
        { rotulo: 'Relatórios', icone: 'analytics', rota: '/relatorios-funil', modulo: 'Funil' },
      ],
    },
    {
      rotulo: 'Modelos',
      itens: [
        { rotulo: 'Modelos de Evento', icone: 'content_copy', rota: '/modelos-evento', modulo: 'Modelos' },
        { rotulo: 'Modelos de Contrato', icone: 'gavel', rota: '/contratos', soDona: true },
        { rotulo: 'Modelos de Briefing', icone: 'quiz', rota: '/modelos-briefing', modulo: 'Modelos' },
        { rotulo: 'Modelos de Roteiro', icone: 'schedule', rota: '/modelos-roteiro', modulo: 'Modelos' },
        { rotulo: 'Modelos de Cronograma', icone: 'view_timeline', rota: '/modelos-cronograma', modulo: 'Modelos' },
        { rotulo: 'Modelos de Inspirações', icone: 'photo_library', rota: '/modelos-inspiracoes', modulo: 'Modelos' },
        { rotulo: 'Modelos de Mensagens', icone: 'sms', rota: '/modelos-mensagens', modulo: 'Modelos' },
        { rotulo: 'Modelos de Serviços', icone: 'category', rota: '/modelos-servicos-funil', modulo: 'Funil' },
        { rotulo: 'Modelo de Orçamento', icone: 'receipt_long', rota: '/modelos-orcamento-funil', modulo: 'OrcamentosContratos' },
      ],
    },
    {
      rotulo: 'Configurações',
      itens: [
        { rotulo: 'Perfil', icone: 'apartment', rota: '/perfil', soDona: true },
        { rotulo: 'Assinatura', icone: 'credit_card', rota: '/configuracoes/assinatura', soDona: true },
        { rotulo: 'Propostas', icone: 'request_quote', rota: '/configuracoes/propostas', soDona: true },
        { rotulo: 'Equipe', icone: 'support_agent', rota: '/configuracoes/equipe', soDona: true },
        { rotulo: 'Grupos de acesso', icone: 'admin_panel_settings', rota: '/configuracoes/grupos', soDona: true },
      ],
    },
  ];

  /** Menu conforme as permissões: a assistente só vê o que a SPEC-032 §8 libera. */
  protected readonly grupos = computed(() => {
    this.auth.permissoes();
    const admin = this.auth.ehAdmin();
    const grupoAdmin: GrupoMenu = {
      rotulo: 'Administração',
      itens: [
        { rotulo: 'Início Admin', icone: 'admin_panel_settings', rota: '/admin' },
        { rotulo: 'Planos', icone: 'sell', rota: '/admin/planos' },
      ],
    };
    // Admin sem conta escolhida só tem o Início Admin; com conta escolhida vê o menu inteiro dela.
    if (admin && !this.auth.contaSelecionada()) {
      return [grupoAdmin];
    }

    return [...(admin ? [grupoAdmin] : []), ...this.todosOsGrupos]
      .map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter(
          (item) => !(item.soDona && this.auth.ehAssistente()) && !(item.modulo && !this.auth.pode(item.modulo)),
        ),
      }))
      .filter((grupo) => grupo.itens.length > 0);
  });

  protected readonly iniciais = computed(() => {
    const nome = this.nomeDisplay();
    if (nome) return nome.slice(0, 2).toUpperCase();
    return (this.auth.email() ?? '').slice(0, 2).toUpperCase();
  });

  constructor() {
    if (!this.auth.ehAdmin() || !!this.auth.contaSelecionada()) {
      this.assinatura.situacao().subscribe({
        next: (situacao) => this.trial.set(situacao?.situacao === 'Trial' && situacao.liberada ? situacao : null),
        error: () => undefined,
      });
    }

    const destroyRef = inject(DestroyRef);

    if (this.auth.ehAssistente()) {
      this.conta.areaUsuario().subscribe({
        next: (area) => this.auth.permissoes.set(permissoesDaArea(area)),
        error: () => undefined,
      });
      this.assistentes.minhaConta().subscribe({
        next: (minha) => {
          this.empresa.set(minha.empresa);
          this.nomeDisplay.set(minha.nome);
        },
        error: () => undefined,
      });
    } else if (!this.auth.ehAdmin() || !!this.auth.contaSelecionada()) {
      this.negocio.perfil().pipe(takeUntilDestroyed(destroyRef)).subscribe({
        next: (perfil) => {
          this.nomeDisplay.set((perfil.responsavel || perfil.nomeEmpresa || '').trim());
          if (perfil.fotoId) {
            this.negocio.baixarArquivo(perfil.fotoId).pipe(takeUntilDestroyed(destroyRef)).subscribe({
              next: (blob) => {
                if (this.fotoLocal) URL.revokeObjectURL(this.fotoLocal);
                this.fotoLocal = URL.createObjectURL(blob);
                this.fotoUrl.set(this.fotoLocal);
              },
              error: () => undefined,
            });
          }
        },
        error: () => undefined,
      });
    }

    this.breakpoints
      .observe('(max-width: 959px)')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((estado) => {
        this.estreito.set(estado.matches);
        if (estado.matches) {
          this.menuAberto.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.fotoLocal) {
      URL.revokeObjectURL(this.fotoLocal);
    }
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
