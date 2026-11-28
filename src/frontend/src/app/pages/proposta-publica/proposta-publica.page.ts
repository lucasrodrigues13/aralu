import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { faltaParaContrato, NegocioClient, PropostaPublica, RespostaProposta } from '../../core/negocio.client';
import { ContratanteCamposComponent, contratantePedido, grupoContratante, preencherContratante } from '../../shared/contratante-campos';
import { Estado } from '../../shared/estado';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { PaginaPublica } from '../../shared/pagina-publica';
import { TemaService } from '../../core/tema.service';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { ehHtml } from '../../shared/editor-rico';

const LIMITE = 1000;

const RESPONDIDO: Record<RespostaProposta, { titulo: string; texto: string; icone: string }> = {
  Aceitar: { titulo: 'Proposta aceita', texto: 'A assessoria já foi avisada e vai falar com você para os próximos passos.', icone: 'check_circle' },
  Duvidas: { titulo: 'Dúvida enviada', texto: 'A assessoria recebeu a sua mensagem e vai retornar.', icone: 'help' },
  Recusar: { titulo: 'Resposta enviada', texto: 'Obrigado por avisar. A assessoria recebeu a sua resposta.', icone: 'info' },
};

/** Proposta aberta pelo lead, sem login (SPEC-031 §6.6). Pensada para o celular. */
@Component({
  selector: 'app-proposta-publica',
  imports: [NgTemplateOutlet, ReactiveFormsModule, ContratanteCamposComponent, MatCardModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, GdDataPipe, GdDinheiroPipe, Estado, PaginaPublica],
  template: `
    @if (paginaPropria(); as p) {
      <!-- Página da assessoria (SPEC-061): HTML montado e sanitizado no servidor, num iframe sem scripts. -->
      <iframe #quadro class="pagina-propria" [title]="'Proposta' + (p.empresa ? ' de ' + p.empresa : '')"
        sandbox="allow-top-navigation-by-user-activation allow-popups allow-popups-to-escape-sandbox"></iframe>
      @if (p.daPropriaConta) {
        <div class="faixa-assessoria" role="status">
          <mat-icon>visibility_off</mat-icon> Você está vendo como assessoria: esta abertura não conta. Para testar a resposta, use uma janela anônima.
        </div>
      }
      @if (escolha() || (p.resposta && !fechouAviso())) {
        <div class="fundo-resposta" (click)="fecharPainel()"></div>
        <section class="painel-resposta" role="dialog" aria-modal="true" aria-label="Resposta à proposta">
          <ng-container [ngTemplateOutlet]="cartaoResposta" />
        </section>
      }
    } @else {
    <app-pagina-publica [titulo]="titulo()" [subtitulo]="subtitulo()" [empresa]="disponivel()?.empresa">
      @if (carregando()) {
        <mat-card class="cardWithShadow"><mat-card-content><app-estado titulo="Carregando…" /></mat-card-content></mat-card>
      } @else if (proposta(); as p) {
        @if (p.estado === 'Disponivel') {
          <mat-card class="cardWithShadow"><mat-card-content>
            @if (ehHtml(p.conteudo)) {
              <div class="texto rico" [innerHTML]="p.conteudo"></div>
            } @else {
              <div class="texto">{{ p.conteudo }}</div>
            }
            @if (p.valor != null) {
              <div class="valor">
                <span class="text-sm text-muted">Valor</span>
                <strong>{{ p.valor | gdDinheiro }}</strong>
              </div>
            }
            @if (p.parcelas && p.parcelas.length > 0) {
              <div class="parcelas">
                <h2>Forma de pagamento</h2>
                <ul>
                  @for (parcela of p.parcelas; track parcela.numero) {
                    <li>
                      <span>{{ parcela.entrada ? 'Entrada' : 'Parcela ' + parcela.numero }} · {{ parcela.vencimento | gdData }}</span>
                      <strong>{{ parcela.valor | gdDinheiro }}</strong>
                    </li>
                  }
                </ul>
              </div>
            }
          </mat-card-content></mat-card>

          @if (p.daPropriaConta) {
            <mat-card class="cardWithShadow mt-4 bg-light-warning" role="status"><mat-card-content>
              <h2><mat-icon class="align-middle">visibility_off</mat-icon> Você está vendo como assessoria</h2>
              <p class="text-sm">
                Esta abertura não conta e a resposta é do lead. Para testar a resposta, abra este link numa janela anônima.
              </p>
            </mat-card-content></mat-card>
          }

          <mat-card class="cardWithShadow mt-4"><mat-card-content>
            <ng-container [ngTemplateOutlet]="cartaoResposta" />
          </mat-card-content></mat-card>
        } @else {
          <mat-card class="cardWithShadow"><mat-card-content>
            @if (p.estado === 'Vencida') {
              <app-estado icone="link_off" titulo="Esta proposta venceu" [texto]="'Fale com ' + (p.empresa || 'a assessoria') + ' para receber uma nova.'">
                @if (p.contato) { <p class="text-sm text-muted m-0">Contato: {{ p.contato }}</p> }
              </app-estado>
            } @else {
              <app-estado icone="link_off" titulo="Este link não está mais disponível" texto="Fale com a assessoria.">
                @if (p.contato) { <p class="text-sm text-muted m-0">Contato: {{ p.contato }}</p> }
              </app-estado>
            }
          </mat-card-content></mat-card>
        }
      } @else {
        <mat-card class="cardWithShadow"><mat-card-content>
          <app-estado icone="link_off" titulo="Este link não está mais disponível" texto="Fale com a assessoria." />
        </mat-card-content></mat-card>
      }
    </app-pagina-publica>
    }

    <ng-template #cartaoResposta>
          @if (proposta(); as p) {
            @if (p.resposta && !escolha()) {
              <div class="respondido">
                <mat-icon>{{ respondido[p.resposta].icone }}</mat-icon>
                <h2>{{ respondido[p.resposta].titulo }}</h2>
                <p>{{ respondido[p.resposta].texto }}</p>
                @if (p.respostaMensagem) { <p class="citacao">"{{ p.respostaMensagem }}"</p> }
                <button mat-button type="button" (click)="escolher(null, true)">Mudar a resposta</button>
              </div>
            } @else if (escolha(); as tipo) {
              @if (tipo === 'Aceitar') {
                <h2>Aceitar a proposta?</h2>
                <p class="text-sm text-muted mb-4">A assessoria será avisada e entra em contato para fechar.</p>
                <h3 class="dados-contrato">Dados para o contrato</h3>
                <p class="text-sm text-muted mb-4">Para fechar, preencha mais dados para gerar o contrato. Os campos com * são necessários.</p>
                <app-contratante-campos [grupo]="contratante" [obrigatorios]="true" [consultarCep]="false" [tokenProposta]="token" />
              } @else {
                <h2>{{ tipo === 'Duvidas' ? 'Qual é a sua dúvida?' : 'Quer contar o motivo?' }}</h2>
                <mat-form-field appearance="outline" class="w-full">
                  <textarea matInput rows="4" [formControl]="mensagem" [attr.maxlength]="limite"
                    [attr.aria-label]="tipo === 'Duvidas' ? 'Sua dúvida' : 'Motivo (opcional)'"
                    [placeholder]="tipo === 'Duvidas' ? 'Escreva aqui' : 'Opcional'"></textarea>
                  <mat-hint align="end">{{ mensagem.value.length }}/{{ limite }}</mat-hint>
                </mat-form-field>
              }
              <div class="acoes-publicas">
                <button mat-stroked-button type="button" (click)="escolher(null)" [disabled]="enviando()">Voltar</button>
                <button mat-flat-button type="button" (click)="responder(tipo)" [disabled]="enviando()">
                  {{ tipo === 'Aceitar' ? 'Confirmar' : 'Enviar' }}
                </button>
              </div>
              @if (erro()) { <p class="text-sm text-error mt-2">{{ erro() }}</p> }
            } @else {
              <h2>O que você achou?</h2>
              <div class="botoes">
                <button mat-flat-button type="button" [disabled]="p.daPropriaConta" (click)="escolher('Aceitar')"><mat-icon>thumb_up</mat-icon> Aceitar</button>
                <button mat-stroked-button type="button" [disabled]="p.daPropriaConta" (click)="escolher('Duvidas')"><mat-icon>help</mat-icon> Tenho dúvidas</button>
                <button mat-button type="button" [disabled]="p.daPropriaConta" (click)="escolher('Recusar')">Não vou seguir</button>
              </div>
            }
            @if (paginaPropria()) {
              <div class="fechar-painel"><button mat-button type="button" (click)="fecharPainel()">Voltar à proposta</button></div>
            }
          }
    </ng-template>
  `,
  styles: `
    h2 { font-size: 17px; margin: 0 0 12px; }
    .dados-contrato { font-size: 15px; font-weight: 600; margin: 16px 0 4px; }
    .texto { white-space: pre-wrap; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
    .texto.rico { white-space: normal; }
    .texto.rico ::ng-deep :is(p, h2, h3, ol, ul) { margin: 0; }
    :is(.texto.rico, .apresentacao) ::ng-deep .ql-align-center { text-align: center; }
    :is(.texto.rico, .apresentacao) ::ng-deep .ql-align-right { text-align: right; }
    :is(.texto.rico, .apresentacao) ::ng-deep .ql-align-justify { text-align: justify; }
    .apresentacao { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--mat-sys-outline-variant); overflow-wrap: anywhere; line-height: 1.6; }
    .apresentacao img { max-width: 100%; height: auto; }
    .apresentacao table { border-collapse: collapse; max-width: 100%; }
    .apresentacao th, .apresentacao td { border: 1px solid var(--mat-sys-outline-variant); padding: 4px 8px; }
    .valor { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--mat-sys-outline-variant); }
    .valor strong { font-size: 22px; }
    .parcelas { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--mat-sys-outline-variant); }
    .parcelas ul { list-style: none; margin: 0; padding: 0; }
    .parcelas li { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 14px; }
    .botoes { display: grid; gap: 12px; }
    @media (min-width: 560px) { .botoes { grid-template-columns: repeat(3, 1fr); } }
    .botoes button { min-height: 44px; }
    .respondido { text-align: center; }
    .respondido mat-icon { font-size: 36px; width: 36px; height: 36px; line-height: 36px; color: var(--color-success); }
    .citacao { font-style: italic; overflow-wrap: anywhere; }
    .pagina-propria { display: block; width: 100%; height: 100vh; height: 100dvh; border: 0; background: #fff; }
    .faixa-assessoria { position: fixed; top: 0; left: 0; right: 0; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 8px 16px;
      font-size: 13px; background: var(--color-light-warning, #faeeda); color: #633806; }
    .fundo-resposta { position: fixed; inset: 0; z-index: 3; background: rgb(0 0 0 / .45); }
    .painel-resposta { position: fixed; z-index: 4; left: 50%; bottom: 0; transform: translateX(-50%); width: min(640px, 100vw); max-height: 92dvh; overflow: auto;
      padding: 24px 20px; border-radius: 16px 16px 0 0; background: var(--mat-sys-surface); box-shadow: 0 -8px 32px rgb(0 0 0 / .2); }
    @media (min-width: 720px) { .painel-resposta { bottom: auto; top: 50%; transform: translate(-50%, -50%); border-radius: 16px; } }
    .fechar-painel { display: flex; justify-content: center; margin-top: 12px; }
  `,
})
export class PropostaPublicaPage implements OnInit, OnDestroy {
  private readonly tema = inject(TemaService);
  private readonly dataPipe = new GdDataPipe();
  protected readonly ehHtml = ehHtml;
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  protected readonly limite = LIMITE;
  protected readonly respondido = RESPONDIDO;
  protected readonly proposta = signal<PropostaPublica | null>(null);
  protected readonly carregando = signal(true);
  protected readonly escolha = signal<RespostaProposta | null>(null);
  protected readonly enviando = signal(false);
  protected readonly erro = signal('');
  protected readonly mensagem = new FormControl('', { nonNullable: true });
  protected readonly contratante = grupoContratante(inject(FormBuilder));
  protected token = '';
  private readonly quadro = viewChild<ElementRef<HTMLIFrameElement>>('quadro');
  /** O aviso "Proposta aceita" sobre a página da assessoria pode ser fechado. */
  protected readonly fechouAviso = signal(false);
  /** Proposta disponível com página própria da assessoria (SPEC-061). */
  protected readonly paginaPropria = computed(() => {
    const p = this.proposta();
    return p?.estado === 'Disponivel' && p.paginaAceite ? p : null;
  });

  /** Proposta disponível exibida na casca pública (sem página própria). */
  protected readonly disponivel = computed(() => {
    const p = this.proposta();
    return !this.carregando() && p?.estado === 'Disponivel' && !p.paginaAceite ? p : null;
  });
  protected readonly titulo = computed(() => {
    const p = this.disponivel();
    return p ? 'Proposta' + (p.titulo ? ': ' + p.titulo : '') : undefined;
  });
  protected readonly subtitulo = computed(() => {
    const p = this.disponivel();
    return p?.validoAte ? 'Válida até ' + this.dataPipe.transform(p.validoAte) + '.' : undefined;
  });

  constructor() {
    this.tema.fixarClaro();
    // A casca pública restaura o tema ao sair de cena; na página própria (iframe) o tema continua claro.
    effect(() => {
      if (this.paginaPropria()) queueMicrotask(() => this.tema.fixarClaro());
    });
    effect(() => {
      const p = this.paginaPropria();
      const quadro = this.quadro();
      if (p?.paginaAceite && quadro) {
        // Documento já sanitizado no servidor; o iframe não roda scripts nem acessa esta página (sandbox).
        quadro.nativeElement.srcdoc = this.resolverEnderecos(p.paginaAceite);
      }
    });
  }

  ngOnDestroy(): void {
    this.tema.restaurar();
  }

  ngOnInit(): void {
    this.token = this.rota.snapshot.paramMap.get('token') ?? '';
    const pedida = this.rota.snapshot.queryParamMap.get('resposta');
    this.negocio.propostaPublica(this.token).subscribe({
      next: (p) => {
        this.proposta.set(p);
        preencherContratante(this.contratante, p.contratante);
        this.carregando.set(false);
        // Botão clicado dentro da página da assessoria: volta com ?resposta= e abre o formulário.
        if (p.paginaAceite && !p.daPropriaConta && (pedida === 'Aceitar' || pedida === 'Duvidas' || pedida === 'Recusar')) {
          this.escolher(pedida, !!p.resposta);
        }
        if (pedida) {
          history.replaceState(history.state, '', location.pathname);
        }
      },
      error: () => this.carregando.set(false),
    });
  }

  protected fecharPainel(): void {
    if (this.enviando()) {
      return;
    }
    this.escolha.set(null);
    this.fechouAviso.set(true);
  }

  /** Fotos pelo endereço público do token; botões voltam para esta página com ?resposta=. */
  private resolverEnderecos(html: string): string {
    const base = `${location.origin}/proposta/${encodeURIComponent(this.token)}?resposta=`;
    return html
      .replace(/aralu-midia:([0-9a-f-]{36})/g, (_, id: string) => new URL(this.negocio.midiaPropostaPublica(this.token, id), location.origin).href)
      .replace(/aralu-resposta:(Aceitar|Duvidas|Recusar)/g, (_, tipo: string) => base + tipo);
  }

  protected escolher(tipo: RespostaProposta | null, mudar = false): void {
    this.erro.set('');
    this.mensagem.setValue('');
    this.escolha.set(tipo);
    if (mudar) {
      this.proposta.update((p) => (p ? { ...p, resposta: null } : p));
    }
  }

  protected responder(tipo: RespostaProposta): void {
    const texto = this.mensagem.value.trim();
    if (tipo === 'Duvidas' && !texto) {
      this.erro.set('Escreva a sua dúvida.');
      return;
    }
    if (tipo === 'Aceitar') {
      const falta = faltaParaContrato(contratantePedido(this.contratante));
      if (falta.length) {
        this.erro.set('Para fechar, preencha mais dados para gerar o contrato. Falta: ' + falta.join(', ') + '.');
        return;
      }
    }
    this.enviando.set(true);
    this.erro.set('');
    this.negocio.responderProposta(this.token, tipo, tipo === 'Aceitar' ? null : texto || null, tipo === 'Aceitar' ? contratantePedido(this.contratante) : null).subscribe({
      next: (p) => {
        this.proposta.set(p);
        this.escolha.set(null);
        this.enviando.set(false);
      },
      error: (e: unknown) => {
        this.erro.set(mensagemDeErro(e));
        this.enviando.set(false);
      },
    });
  }
}
