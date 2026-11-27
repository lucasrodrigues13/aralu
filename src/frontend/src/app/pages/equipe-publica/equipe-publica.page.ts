import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { map } from 'rxjs';
import { AcessoEquipe, EquipeEventoClient, EquipePublica } from '../../core/equipe-evento.client';
import { AcessoLink } from '../../core/link-cliente.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cronograma, Roteiro } from '../../core/negocio.client';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { AcessoLinkComponent, PortaAcesso } from '../link-cliente/acesso-link.component';

type Etapa = 'carregando' | 'codigo' | 'aberto' | 'indisponivel';
type Vista = 'painel' | 'roteiro' | 'cronograma';

/** O componente do código fala a língua do link do cliente: um único e-mail, o da pessoa. */
function comoAcessoLink(a: AcessoEquipe): AcessoLink {
  return {
    evento: a.evento || 'Evento',
    emails: [{ clienteId: a.email.id, email: a.email.email }],
    sessaoValida: a.sessaoValida,
    aguardarSegundos: a.aguardarSegundos,
    codigoEnviado: a.codigoEnviado,
    enviadoPara: a.enviadoPara,
  };
}

/** Hora "HH:mm:ss" da API como "HH:mm". */
function hora(valor: string | null): string {
  return valor ? valor.slice(0, 5) : '';
}

/**
 * Link da pessoa da equipe do evento (SPEC-067): código no e-mail e, depois, só o que a organizadora liberou
 * (portaria, roteiro, cronograma). Pensado para o celular.
 */
@Component({
  selector: 'app-equipe-publica',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, GdDataPipe, AcessoLinkComponent],
  template: `
    <main class="pagina">
      @switch (etapa()) {
        @case ('carregando') {
          <p class="text-xs text-muted">Carregando…</p>
        }
        @case ('codigo') {
          <app-acesso-link [token]="token" [porta]="porta" rotuloAbrir="Abrir o evento"
            semEmail="Fale com quem organizou o evento." (aberto)="carregar()" />
        }
        @case ('aberto') {
          @if (painel(); as p) {
            @if (vista() === 'painel') {
              <mat-card class="cardWithShadow"><mat-card-content>
                <header class="topo">
                  @if (p.empresa) { <span class="block text-sm font-semibold text-primary">{{ p.empresa }}</span> }
                  <h1>{{ p.evento }}</h1>
                  @if (p.data) {
                    <span class="block text-sm text-muted">{{ p.data | gdData }}{{ p.hora ? ' às ' + horaCurta(p.hora) : '' }}</span>
                  }
                </header>
                <p class="ola">Olá, {{ primeiroNome(p.nome) }}{{ p.funcao ? ' · ' + p.funcao : '' }}</p>
                @for (local of p.locais; track local.rotulo) {
                  <p class="local"><mat-icon>place</mat-icon>
                    <span><strong>{{ local.rotulo }}</strong>{{ local.nome ? ': ' + local.nome : '' }}
                      @if (local.endereco) { <span class="block text-sm text-muted">{{ local.endereco }}</span> }
                    </span>
                  </p>
                }
                <div class="itens">
                  @if (p.portaria) {
                    <a mat-stroked-button [routerLink]="['/equipe', token, 'portaria']"><mat-icon>qr_code_scanner</mat-icon> Portaria</a>
                  }
                  @if (p.cronograma) {
                    <button mat-stroked-button type="button" (click)="abrirCronograma()"><mat-icon>schedule</mat-icon> Cronograma</button>
                  }
                  @if (p.roteiro) {
                    <button mat-stroked-button type="button" (click)="abrirRoteiro()"><mat-icon>queue_music</mat-icon> Roteiro</button>
                  }
                  @if (!p.portaria && !p.cronograma && !p.roteiro) {
                    <p class="text-muted">Ainda não há nada liberado para você. Fale com quem organizou o evento.</p>
                  }
                </div>
                @if (p.validoAte) { <p class="text-xs text-muted mt-4">Este acesso vale até {{ p.validoAte | gdData }}.</p> }
              </mat-card-content></mat-card>
            } @else {
              <mat-card class="cardWithShadow"><mat-card-content>
                <button mat-button type="button" (click)="vista.set('painel')"><mat-icon>arrow_back</mat-icon> Voltar</button>
                @if (vista() === 'cronograma') {
                  @if (cronograma(); as c) {
                    <h1>{{ c.titulo }}</h1>
                    @if (c.descricao) { <p class="text-muted">{{ c.descricao }}</p> }
                    <ol class="lista">
                      @for (item of c.itens; track item.id) {
                        <li>
                          <div class="linha">
                            <strong>{{ item.rotulo || 'Item' }}</strong>
                            <span class="text-sm text-muted">{{ item.data ? (item.data | gdData) : '' }} {{ horaCurta(item.hora) }}</span>
                          </div>
                          @if (item.descricao) { <p class="text-sm">{{ item.descricao }}</p> }
                          @if (item.responsavel) { <p class="text-sm text-muted">Responsável: {{ item.responsavel }}</p> }
                          @if (item.recadoFornecedores) { <p class="recado"><mat-icon>campaign</mat-icon> {{ item.recadoFornecedores }}</p> }
                        </li>
                      }
                    </ol>
                  } @else { <p class="text-xs text-muted">Carregando…</p> }
                } @else {
                  @if (roteiro(); as r) {
                    <h1>{{ r.nome }}</h1>
                    <ol class="lista">
                      @for (secao of r.secoes; track secao.id) {
                        <li>
                          <div class="linha">
                            <strong>{{ secao.titulo || 'Momento' }}</strong>
                            <span class="text-sm text-muted">{{ horaCurta(secao.horario) }}</span>
                          </div>
                          @if (secao.musica) { <p class="text-sm"><mat-icon class="mini">music_note</mat-icon> {{ secao.musica }}</p> }
                          @if (secao.itens.length) {
                            <ul class="sub">
                              @for (item of secao.itens; track item.id) { <li class="text-sm">{{ item.texto }}</li> }
                            </ul>
                          }
                        </li>
                      }
                    </ol>
                  } @else { <p class="text-xs text-muted">Carregando…</p> }
                }
                @if (erro()) { <p class="text-error text-sm" role="alert">{{ erro() }}</p> }
              </mat-card-content></mat-card>
            }
          }
        }
        @default {
          <mat-card class="cardWithShadow"><mat-card-content class="fim">
            <mat-icon class="icone">link_off</mat-icon>
            <h1>Link indisponível</h1>
            <p class="text-muted">{{ erro() || 'Este link não está mais disponível. Fale com quem organizou o evento.' }}</p>
          </mat-card-content></mat-card>
        }
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--mat-sys-background); }
    .pagina { max-width: 640px; margin: 0 auto; padding: 24px 16px 48px; }
    .topo { border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 12px; margin-bottom: 12px; }
    h1 { font-size: 20px; margin: 4px 0; overflow-wrap: anywhere; }
    .ola { font-weight: 600; margin: 0 0 8px; }
    .local { display: flex; gap: 8px; align-items: flex-start; margin: 4px 0; }
    .local mat-icon { color: var(--mat-sys-primary); flex: none; }
    .itens { display: grid; gap: 8px; margin-top: 16px; }
    .itens a, .itens button { justify-content: flex-start; height: 48px; }
    .lista { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 12px; }
    .lista > li { border-top: 1px solid var(--mat-sys-outline-variant); padding-top: 10px; }
    .lista p { margin: 4px 0 0; overflow-wrap: anywhere; }
    .linha { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .recado { display: flex; gap: 6px; align-items: flex-start; color: var(--mat-sys-primary); font-size: 14px; }
    .recado mat-icon, .mini { font-size: 18px; width: 18px; height: 18px; vertical-align: -4px; flex: none; }
    .sub { margin: 4px 0 0; padding-left: 20px; }
    .fim { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 24px 8px; }
    .icone { font-size: 40px; width: 40px; height: 40px; line-height: 40px; color: var(--mat-sys-outline); }
  `,
})
export class EquipePublicaPage implements OnInit {
  private readonly equipe = inject(EquipeEventoClient);
  protected readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  protected readonly etapa = signal<Etapa>('carregando');
  protected readonly vista = signal<Vista>('painel');
  protected readonly erro = signal('');
  protected readonly painel = signal<EquipePublica | null>(null);
  protected readonly roteiro = signal<Roteiro | null>(null);
  protected readonly cronograma = signal<Cronograma | null>(null);

  protected readonly porta: PortaAcesso = {
    acesso: (t) => this.equipe.acesso(t).pipe(map(comoAcessoLink)),
    pedirCodigo: (t) => this.equipe.pedirCodigo(t).pipe(map(comoAcessoLink)),
    confirmarCodigo: (t, codigo) => this.equipe.confirmarCodigo(t, codigo),
  };

  protected readonly horaCurta = hora;

  ngOnInit(): void {
    this.carregar();
  }

  /** Com sessão, abre o painel; sem sessão (401), pede o código. */
  protected carregar(): void {
    this.equipe.painel(this.token).subscribe({
      next: (p) => {
        this.painel.set(p);
        this.etapa.set('aberto');
      },
      error: (e: unknown) => this.tratarErro(e),
    });
  }

  protected primeiroNome(nome: string): string {
    return nome.trim().split(/\s+/)[0] ?? nome;
  }

  protected abrirCronograma(): void {
    this.erro.set('');
    this.vista.set('cronograma');
    this.equipe.cronograma(this.token).subscribe({
      next: (c) => this.cronograma.set(c),
      error: (e: unknown) => this.tratarErro(e),
    });
  }

  protected abrirRoteiro(): void {
    this.erro.set('');
    this.vista.set('roteiro');
    this.equipe.roteiro(this.token).subscribe({
      next: (r) => this.roteiro.set(r),
      error: (e: unknown) => this.tratarErro(e),
    });
  }

  private tratarErro(e: unknown): void {
    if (e instanceof HttpErrorResponse && e.status === 401) {
      this.vista.set('painel');
      this.etapa.set('codigo');
      return;
    }
    this.erro.set(mensagemDeErro(e));
    // Item fechado no meio do caminho: fica na tela com o aviso; link fechado: página indisponível.
    if (this.etapa() !== 'aberto' || this.vista() === 'painel') this.etapa.set('indisponivel');
  }
}
