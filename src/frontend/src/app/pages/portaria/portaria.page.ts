import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ConvidadoPortaria, ConvitePortaria, PortariaClient, PortariaLeitura } from '../../core/portaria.client';
import { ToastService } from '../../core/toast.service';
import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
import { Estado } from '../../shared/estado';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { PaginaPublica } from '../../shared/pagina-publica';
import { LeitorQrComponent } from './leitor-qr.component';

type StatusConvite = 'Pendente' | 'Parcial' | 'Completo';

/**
 * Portaria do evento pelo link da pessoa da equipe (SPEC-058 e SPEC-067): escanear o QR ou achar o convite na lista
 * em acordeon, marcar quem está entrando e confirmar a presença na linha do convite.
 */
@Component({
  selector: 'app-portaria',
  imports: [MatCardModule, MatButtonModule, MatCheckboxModule, MatIconModule, DatePipe, LeitorQrComponent, RouterLink, ExpandirTodosComponent, Estado, PaginaPublica],
  template: `
    <app-pagina-publica [titulo]="titulo()" [subtitulo]="subtitulo()">
      @if (carregando()) {
        <mat-card class="cardWithShadow"><mat-card-content><app-estado titulo="Carregando…" /></mat-card-content></mat-card>
      } @else if (indisponivel()) {
        <mat-card class="cardWithShadow"><mat-card-content>
          <app-estado icone="link_off" titulo="Este link não está mais disponível" texto="Fale com quem organizou o evento." />
        </mat-card-content></mat-card>
      } @else if (dados(); as d) {
        <div><a mat-button [routerLink]="['/equipe', token]"><mat-icon>arrow_back</mat-icon> Voltar</a></div>

        @if (escaneando()) {
          <mat-card class="cardWithShadow"><mat-card-content>
            <app-leitor-qr (lido)="abrirPeloQr($event)" />
            <div class="acoes">
              <button mat-stroked-button type="button" (click)="escaneando.set(false)">Cancelar</button>
            </div>
          </mat-card-content></mat-card>
        } @else {
          <mat-card class="resumo cardWithShadow"><mat-card-content>
            <div><span class="rotulo">Confirmados</span><strong>{{ d.confirmados }}</strong></div>
            <div><span class="rotulo">Já entraram</span><strong>{{ d.compareceram }}</strong></div>
            <div><span class="rotulo">Faltam</span><strong>{{ d.confirmados - d.compareceram }}</strong></div>
          </mat-card-content></mat-card>

          <button mat-flat-button type="button" data-teste="escanear" (click)="escaneando.set(true)"><mat-icon>qr_code_scanner</mat-icon> Escanear QR code</button>

          <label class="busca">
            <span class="rotulo">Conferir a lista</span>
            <input type="search" aria-label="Buscar convite ou convidado" placeholder="Buscar convite ou convidado" [value]="busca()" (input)="busca.set($any($event.target).value)" />
          </label>

          @if (filtrados().length === 0) {
            <p class="text-muted">Nenhum convite confirmado encontrado.</p>
          } @else {
            <div>
              <app-expandir-todos [abertos]="todosAbertos()" (alternar)="alternarTodos()">
                {{ filtrados().length }} {{ filtrados().length === 1 ? 'convite' : 'convites' }}
              </app-expandir-todos>
              <ul class="grupos-lista com-cabecalho" aria-label="Convites confirmados">
                @for (item of filtrados(); track item.id) {
                  @let aberto = abertos().has(item.id);
                  @let status = statusDe(item);
                  <li class="grupo" [class.aberto]="aberto" [id]="'convite-' + item.id" data-teste="convite">
                    <div class="grupo-cabecalho com-acoes">
                      <button type="button" class="grupo-alternar" data-teste="alternar-convite" [attr.aria-expanded]="aberto"
                        [attr.aria-controls]="'pessoas-' + item.id" (click)="alternarConvite(item.id)">
                        <mat-icon class="seta">expand_more</mat-icon>
                        <span class="grupo-texto">
                          <span class="nome">{{ item.nome }}</span>
                          <span class="block text-xs text-muted">{{ resumo(item) }}</span>
                        </span>
                        <span class="status" [attr.data-status]="status">{{ status }}</span>
                      </button>
                      @if (aberto) {
                        <button mat-flat-button type="button" class="confirmar" data-teste="confirmar-entrada"
                          [disabled]="salvando() || !temAlteracao(item)" (click)="salvar(item)">Confirmar presença</button>
                      }
                    </div>
                    @if (aberto) {
                      <div class="pessoas" [id]="'pessoas-' + item.id">
                        @if (confirmados(item).length > 1) {
                          <div class="pessoa todos">
                            <mat-checkbox
                              [checked]="todosMarcados(item)"
                              [indeterminate]="!todosMarcados(item) && algumMarcado(item)"
                              (change)="marcarTodos(item, $event.checked)">
                              Todos os confirmados
                            </mat-checkbox>
                          </div>
                        }
                        @for (pessoa of item.convidados; track pessoa.id) {
                          <div class="pessoa">
                            <mat-checkbox
                              [checked]="pessoa.confirmado && marcado(pessoa)"
                              [disabled]="!pessoa.confirmado"
                              (change)="alternar(pessoa, $event.checked)">
                              {{ pessoa.nome }}
                            </mat-checkbox>
                            @if (!pessoa.confirmado) {
                              <span class="text-xs text-muted">{{ pessoa.situacao }}</span>
                            } @else if (pessoa.compareceuEm) {
                              <span class="status" data-status="Completo">Entrou às {{ pessoa.compareceuEm | date: 'HH:mm' }}</span>
                            } @else {
                              <span class="status" data-status="Pendente">Não entrou</span>
                            }
                          </div>
                        }
                        @if (pendencias(item).desfazer.length; as desfeitas) {
                          <p class="alerta text-xs" role="status">
                            <mat-icon>warning</mat-icon>
                            {{ desfeitas === 1 ? '1 entrada será desfeita' : desfeitas + ' entradas serão desfeitas' }} ao confirmar.
                          </p>
                        }
                      </div>
                    }
                  </li>
                }
              </ul>
            </div>
          }
        }
      }
    </app-pagina-publica>
  `,
  styles: `
    .resumo mat-card-content { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
    .resumo strong { font-size: 22px; }
    .rotulo { display: block; font-size: 12px; color: var(--mat-sys-outline); }
    .busca input { width: 100%; padding: 10px 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; background: transparent; color: inherit; font: inherit; }
    .acoes { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 12px; }

    .nome { display: block; font-weight: 600; overflow-wrap: anywhere; }
    .confirmar { margin: 0 12px 0 4px; }
    .pessoas { background: rgba(128,128,128,.1); border-top: 1px solid rgba(128,128,128,.3); }
    .pessoa { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 2px 12px 2px 4px; }
    .pessoa + .pessoa { border-top: 1px dashed rgba(128,128,128,.2); }
    .pessoa mat-checkbox { min-width: 0; }
    .todos { font-weight: 500; }
    .status { flex-shrink: 0; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; background: rgba(128,128,128,.18); }
    .status[data-status='Parcial'] { background: rgba(230,160,30,.22); color: #c98a12; }
    .status[data-status='Completo'] { background: rgba(46,160,67,.2); color: #2e9f4a; }
    .alerta { display: flex; align-items: center; gap: 6px; margin: 0; padding: 8px 16px; color: #c98a12; border-top: 1px dashed rgba(128,128,128,.2); }
    .alerta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    @media (max-width: 480px) {
      .confirmar { flex: 1 1 100%; margin: 0 12px 12px; }
    }
  `,
})
export class PortariaPage implements OnInit {
  private readonly portaria = inject(PortariaClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly dados = signal<PortariaLeitura | null>(null);
  protected readonly carregando = signal(true);
  protected readonly indisponivel = signal(false);
  protected readonly escaneando = signal(false);
  protected readonly salvando = signal(false);
  /** Convites expandidos; todos começam recolhidos para a lista caber na tela do celular. */
  protected readonly abertos = signal<ReadonlySet<string>>(new Set());
  /** Caixas que a portaria mudou e ainda não confirmou, por convidado. Sem entrada aqui, vale o que está gravado. */
  protected readonly marcacoes = signal<ReadonlyMap<string, boolean>>(new Map());
  protected readonly busca = signal('');
  protected readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const convites = this.dados()?.convites ?? [];
    return termo
      ? convites.filter((item) => item.nome.toLowerCase().includes(termo) || item.convidados.some((pessoa) => pessoa.nome.toLowerCase().includes(termo)))
      : convites;
  });
  protected readonly todosAbertos = computed(() => this.filtrados().length > 0 && this.filtrados().every((item) => this.abertos().has(item.id)));
  protected token = '';
  private readonly dataPipe = new GdDataPipe();
  private readonly aberta = computed(() => (this.carregando() || this.indisponivel() ? null : this.dados()));
  protected readonly titulo = computed(() => {
    const d = this.aberta();
    return d ? 'Portaria: ' + d.evento : undefined;
  });
  protected readonly subtitulo = computed(() => {
    const d = this.aberta();
    return d?.data ? this.dataPipe.transform(d.data) : undefined;
  });

  ngOnInit(): void {
    this.token = this.rota.snapshot.paramMap.get('token') ?? '';
    this.portaria.ler(this.token).subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        // Sem sessão (ou vencida): volta ao painel da equipe, que pede o código.
        if (erro instanceof HttpErrorResponse && erro.status === 401) {
          void this.router.navigate(['/equipe', this.token]);
          return;
        }
        this.indisponivel.set(true);
        this.carregando.set(false);
      },
    });
  }

  protected confirmados(item: ConvitePortaria): ConvidadoPortaria[] {
    return item.convidados.filter((pessoa) => pessoa.confirmado);
  }

  protected resumo(item: ConvitePortaria): string {
    const confirmados = this.confirmados(item);
    const entraram = confirmados.filter((pessoa) => pessoa.compareceuEm).length;
    return `${entraram} de ${confirmados.length} ${confirmados.length === 1 ? 'confirmado entrou' : 'confirmados entraram'}`;
  }

  /** Check-in do convite pelo que está gravado: ninguém entrou, parte entrou ou todos os confirmados entraram. */
  protected statusDe(item: ConvitePortaria): StatusConvite {
    const confirmados = this.confirmados(item);
    const entraram = confirmados.filter((pessoa) => pessoa.compareceuEm).length;
    if (entraram === 0) return 'Pendente';
    return entraram === confirmados.length ? 'Completo' : 'Parcial';
  }

  protected alternarConvite(id: string): void {
    const novo = new Set(this.abertos());
    if (!novo.delete(id)) novo.add(id);
    this.abertos.set(novo);
  }

  protected alternarTodos(): void {
    this.abertos.set(this.todosAbertos() ? new Set() : new Set(this.filtrados().map((item) => item.id)));
  }

  protected marcado(pessoa: ConvidadoPortaria): boolean {
    return this.marcacoes().get(pessoa.id) ?? !!pessoa.compareceuEm;
  }

  protected alternar(pessoa: ConvidadoPortaria, valor: boolean): void {
    this.definir([pessoa], valor);
  }

  protected todosMarcados(item: ConvitePortaria): boolean {
    return this.confirmados(item).every((pessoa) => this.marcado(pessoa));
  }

  protected algumMarcado(item: ConvitePortaria): boolean {
    return this.confirmados(item).some((pessoa) => this.marcado(pessoa));
  }

  /** Marca todos os confirmados; desmarcar volta ao que está gravado, sem desfazer a entrada de ninguém. */
  protected marcarTodos(item: ConvitePortaria, valor: boolean): void {
    if (valor) this.definir(this.confirmados(item), true);
    else this.limpar(item);
  }

  /** O que muda ao confirmar: quem entra agora e de quem a entrada é desfeita. */
  protected pendencias(item: ConvitePortaria): { entrar: string[]; desfazer: string[] } {
    const confirmados = this.confirmados(item);
    return {
      entrar: confirmados.filter((pessoa) => !pessoa.compareceuEm && this.marcado(pessoa)).map((pessoa) => pessoa.id),
      desfazer: confirmados.filter((pessoa) => pessoa.compareceuEm && !this.marcado(pessoa)).map((pessoa) => pessoa.id),
    };
  }

  protected temAlteracao(item: ConvitePortaria): boolean {
    const { entrar, desfazer } = this.pendencias(item);
    return entrar.length + desfazer.length > 0;
  }

  /** O QR vale para o convite todo: abre o convite na lista com quem ainda não entrou já marcado. */
  protected abrirPeloQr(texto: string): void {
    this.portaria.lerPeloQr(this.token, texto).subscribe({
      next: (convite) => {
        this.escaneando.set(false);
        this.busca.set('');
        this.dados.update((atual) => (atual ? this.comConvite(atual, convite) : atual));
        this.abertos.update((atual) => new Set(atual).add(convite.id));
        const faltam = this.confirmados(convite).filter((pessoa) => !pessoa.compareceuEm);
        this.limpar(convite);
        if (faltam.length === 0) this.toast.erro(`Todos os confirmados de ${convite.nome} já entraram.`);
        else this.definir(faltam, true);
        setTimeout(() => document.getElementById(`convite-${convite.id}`)?.scrollIntoView({ block: 'center' }));
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected salvar(convite: ConvitePortaria): void {
    const { entrar, desfazer } = this.pendencias(convite);
    if (entrar.length + desfazer.length === 0) return;
    this.salvando.set(true);
    this.portaria.marcar(this.token, convite.id, entrar, desfazer).subscribe({
      next: (atualizado) => {
        this.salvando.set(false);
        this.limpar(convite);
        this.dados.update((atual) => (atual ? this.comConvite(atual, atualizado) : atual));
        this.abertos.update((atual) => {
          const novo = new Set(atual);
          novo.delete(convite.id);
          return novo;
        });
        this.toast.sucesso('Presença registrada.');
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private definir(pessoas: ConvidadoPortaria[], valor: boolean): void {
    const novo = new Map(this.marcacoes());
    for (const pessoa of pessoas) {
      if (valor === !!pessoa.compareceuEm) novo.delete(pessoa.id);
      else novo.set(pessoa.id, valor);
    }
    this.marcacoes.set(novo);
  }

  private limpar(convite: ConvitePortaria): void {
    const novo = new Map(this.marcacoes());
    for (const pessoa of convite.convidados) novo.delete(pessoa.id);
    this.marcacoes.set(novo);
  }

  private comConvite(atual: PortariaLeitura, convite: ConvitePortaria): PortariaLeitura {
    const convites = atual.convites.map((item) => (item.id === convite.id ? convite : item));
    const confirmados = convites.flatMap((item) => item.convidados).filter((pessoa) => pessoa.confirmado);
    return { ...atual, convites, confirmados: confirmados.length, compareceram: confirmados.filter((pessoa) => pessoa.compareceuEm).length };
  }
}
