import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { map } from 'rxjs';
import { AcessoLink } from '../../core/link-cliente.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { AcessoBriefing, BriefingPublico, NegocioClient } from '../../core/negocio.client';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { AcessoLinkComponent, PortaAcesso } from '../link-cliente/acesso-link.component';

type Etapa = 'carregando' | 'codigo' | 'aberto' | 'concluido' | 'indisponivel';

/** O componente do código fala a língua do link do cliente: troca "nome" por "evento" e "id" por "clienteId". */
function comoAcessoLink(a: AcessoBriefing): AcessoLink {
  return {
    evento: a.empresa ? `Briefing de ${a.empresa}` : 'Briefing',
    emails: a.emails.map((e) => ({ clienteId: e.id, email: e.email })),
    sessaoValida: a.sessaoValida,
    aguardarSegundos: a.aguardarSegundos,
    codigoEnviado: a.codigoEnviado,
    enviadoPara: a.enviadoPara,
  };
}

/**
 * Briefing que o cliente preenche pelo link (SPEC-066). Primeiro o código enviado ao e-mail do contato
 * (regras da SPEC-063), depois as perguntas. Pensado para o celular.
 */
@Component({
  selector: 'app-briefing-publico',
  imports: [FormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, GdDataPipe, AcessoLinkComponent],
  template: `
    <main class="pagina">
      @switch (etapa()) {
        @case ('carregando') {
          <p class="text-xs text-muted">Carregando…</p>
        }
        @case ('codigo') {
          <app-acesso-link [token]="token" [porta]="porta" rotuloAbrir="Abrir o briefing"
            semEmail="Fale com a assessoria para cadastrar o seu e-mail." (aberto)="carregar()" />
        }
        @case ('aberto') {
          @if (briefing(); as b) {
            <mat-card class="cardWithShadow"><mat-card-content>
              <header class="topo">
                @if (b.empresa) { <span class="block text-sm font-semibold text-primary">{{ b.empresa }}</span> }
                <h1>Briefing{{ b.nome ? ': ' + b.nome : '' }}</h1>
                <span class="block text-sm text-muted">
                  Responda com calma. Você pode salvar e voltar depois pelo mesmo link{{ b.validoAte ? ' até ' + (b.validoAte | gdData) : '' }}.
                </span>
              </header>
              @for (item of b.itens; track item.id; let i = $index) {
                @if (item.secao && (i === 0 || b.itens[i - 1].secao !== item.secao)) {
                  <h2>{{ item.secao }}</h2>
                }
                <div class="campo">
                  <mat-label class="font-semibold mb-1 block">{{ item.pergunta }}</mat-label>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
                    <textarea matInput rows="3" maxlength="2000" [attr.aria-label]="item.pergunta" [ngModel]="respostas()[item.id] ?? ''" (ngModelChange)="responder(item.id, $event)"></textarea>
                  </mat-form-field>
                </div>
              }
              @if (salvo()) {
                <p class="aviso" role="status"><mat-icon>check_circle</mat-icon> Respostas salvas.</p>
              }
              @if (erro()) { <p class="text-error text-sm" role="alert">{{ erro() }}</p> }
              <div class="acoes">
                <button mat-stroked-button type="button" [disabled]="salvando()" (click)="salvar(false)">Salvar e continuar depois</button>
                <button mat-flat-button type="button" [disabled]="salvando()" (click)="salvar(true)">Concluir e enviar</button>
              </div>
              <p class="text-xs text-muted mt-2">Depois de concluir, o link fecha e as respostas vão para a assessoria.</p>
            </mat-card-content></mat-card>
          }
        }
        @case ('concluido') {
          <mat-card class="cardWithShadow"><mat-card-content class="fim">
            <mat-icon class="icone">check_circle</mat-icon>
            <h1>Briefing enviado</h1>
            <p class="text-muted">Obrigado! A assessoria já recebeu as suas respostas.</p>
          </mat-card-content></mat-card>
        }
        @default {
          <mat-card class="cardWithShadow"><mat-card-content class="fim">
            <mat-icon class="icone">lock</mat-icon>
            <h1>Link indisponível</h1>
            <p class="text-muted">{{ erro() || 'Este briefing não está disponível. Fale com a assessoria.' }}</p>
          </mat-card-content></mat-card>
        }
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--mat-sys-background); }
    .pagina { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
    .topo { border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 16px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 4px 0; overflow-wrap: anywhere; }
    h2 { font-size: 17px; margin: 20px 0 8px; }
    .campo { margin-bottom: 12px; }
    .aviso { display: flex; align-items: center; gap: 8px; color: var(--mat-sys-primary); margin: 16px 0 0; }
    .acoes { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .fim { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 24px 8px; }
    .icone { font-size: 40px; width: 40px; height: 40px; color: var(--mat-sys-primary); }
  `,
})
export class BriefingPublicoPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  protected readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  protected readonly etapa = signal<Etapa>('carregando');
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly erro = signal('');
  protected readonly briefing = signal<BriefingPublico | null>(null);
  protected readonly respostas = signal<Record<string, string>>({});

  protected readonly porta: PortaAcesso = {
    acesso: (t) => this.negocio.acessoBriefing(t).pipe(map(comoAcessoLink)),
    pedirCodigo: (t, id) => this.negocio.pedirCodigoBriefing(t, id).pipe(map(comoAcessoLink)),
    confirmarCodigo: (t, codigo) => this.negocio.confirmarCodigoBriefing(t, codigo),
  };

  ngOnInit(): void {
    this.carregar();
  }

  /** Com sessão, abre as perguntas; sem sessão (401), mostra o pedido do código. */
  protected carregar(): void {
    this.negocio.briefingPublico(this.token).subscribe({
      next: (b) => {
        this.definir(b);
        this.etapa.set('aberto');
      },
      error: (e: unknown) => this.tratarErro(e),
    });
  }

  protected responder(id: string, texto: string): void {
    this.salvo.set(false);
    this.respostas.update((atual) => ({ ...atual, [id]: texto }));
  }

  protected salvar(concluir: boolean): void {
    this.salvando.set(true);
    this.erro.set('');
    const respostas = Object.entries(this.respostas()).map(([id, resposta]) => ({ id, resposta }));
    this.negocio.responderBriefingPublico(this.token, respostas, concluir).subscribe({
      next: (b) => {
        this.salvando.set(false);
        if (concluir) {
          this.etapa.set('concluido');
          return;
        }
        this.definir(b);
        this.salvo.set(true);
      },
      error: (e: unknown) => {
        this.salvando.set(false);
        // Sessão vencida no meio do preenchimento: guarda o texto digitado e pede o código de novo.
        if (e instanceof HttpErrorResponse && e.status === 401) {
          this.etapa.set('codigo');
          return;
        }
        this.erro.set(mensagemDeErro(e));
      },
    });
  }

  private tratarErro(e: unknown): void {
    if (e instanceof HttpErrorResponse && e.status === 401) {
      this.etapa.set('codigo');
      return;
    }
    this.erro.set(mensagemDeErro(e));
    this.etapa.set('indisponivel');
  }

  /** Mantém o que o cliente já digitou se a página recarregar depois de pedir o código de novo. */
  private definir(b: BriefingPublico): void {
    const digitado = this.respostas();
    this.briefing.set(b);
    this.respostas.set(Object.fromEntries(b.itens.map((item) => [item.id, digitado[item.id] ?? item.resposta ?? ''])));
  }
}
