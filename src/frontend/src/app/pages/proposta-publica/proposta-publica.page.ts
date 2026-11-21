import { Component, inject, OnInit, signal } from '@angular/core';
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
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';

const LIMITE = 1000;

const RESPONDIDO: Record<RespostaProposta, { titulo: string; texto: string; icone: string }> = {
  Aceitar: { titulo: 'Proposta aceita', texto: 'A assessoria já foi avisada e vai falar com você para os próximos passos.', icone: 'check_circle' },
  Duvidas: { titulo: 'Dúvida enviada', texto: 'A assessoria recebeu a sua mensagem e vai retornar.', icone: 'help' },
  Recusar: { titulo: 'Resposta enviada', texto: 'Obrigado por avisar. A assessoria recebeu a sua resposta.', icone: 'info' },
};

/** Proposta aberta pelo lead, sem login (SPEC-031 §6.6). Pensada para o celular. */
@Component({
  selector: 'app-proposta-publica',
  imports: [ReactiveFormsModule, ContratanteCamposComponent, MatCardModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, GdDataPipe, GdDinheiroPipe],
  template: `
    <main class="pagina">
      @if (carregando()) {
        <p class="block text-xs text-muted">Carregando…</p>
      } @else if (proposta(); as p) {
        @if (p.estado === 'Disponivel') {
          <mat-card class="cardWithShadow"><mat-card-content>
            <header class="topo">
              @if (p.empresa) { <span class="block text-sm font-semibold text-primary">{{ p.empresa }}</span> }
              <h1>Proposta{{ p.titulo ? ': ' + p.titulo : '' }}</h1>
              @if (p.validoAte) { <span class="block text-xs text-muted">Válida até {{ p.validoAte | gdData }}.</span> }
            </header>
            <div class="texto">{{ p.conteudo }}</div>
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
                <app-contratante-campos [grupo]="contratante" [obrigatorios]="true" [consultarCep]="false" />
              } @else {
                <h2>{{ tipo === 'Duvidas' ? 'Qual é a sua dúvida?' : 'Quer contar o motivo?' }}</h2>
                <mat-form-field appearance="outline" class="w-full">
                  <textarea matInput rows="4" [formControl]="mensagem" [attr.maxlength]="limite"
                    [attr.aria-label]="tipo === 'Duvidas' ? 'Sua dúvida' : 'Motivo (opcional)'"
                    [placeholder]="tipo === 'Duvidas' ? 'Escreva aqui' : 'Opcional'"></textarea>
                  <mat-hint align="end">{{ mensagem.value.length }}/{{ limite }}</mat-hint>
                </mat-form-field>
              }
              <div class="acoes mt-4">
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
          </mat-card-content></mat-card>
        } @else {
          <mat-card class="cardWithShadow aviso"><mat-card-content>
            <mat-icon>link_off</mat-icon>
            @if (p.estado === 'Vencida') {
              <h1>Esta proposta venceu</h1>
              <p>Fale com {{ p.empresa || 'a assessoria' }} para receber uma nova.</p>
            } @else {
              <h1>Esta proposta não está mais disponível</h1>
              <p>Fale com {{ p.empresa || 'a assessoria' }} se tiver alguma dúvida.</p>
            }
            @if (p.contato) { <p class="text-sm text-muted">Contato: {{ p.contato }}</p> }
          </mat-card-content></mat-card>
        }
      } @else {
        <mat-card class="cardWithShadow aviso"><mat-card-content>
          <mat-icon>link_off</mat-icon>
          <h1>Link inválido</h1>
          <p>Confira o link recebido ou fale com a assessoria.</p>
        </mat-card-content></mat-card>
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--mat-sys-background); }
    .pagina { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
    .topo { border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 16px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 4px 0; overflow-wrap: anywhere; }
    h2 { font-size: 17px; margin: 0 0 12px; }
    .dados-contrato { font-size: 15px; font-weight: 600; margin: 16px 0 4px; }
    .texto { white-space: pre-wrap; font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
    .valor { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--mat-sys-outline-variant); }
    .valor strong { font-size: 22px; }
    .parcelas { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--mat-sys-outline-variant); }
    .parcelas ul { list-style: none; margin: 0; padding: 0; }
    .parcelas li { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 14px; }
    .botoes { display: grid; gap: 12px; }
    @media (min-width: 560px) { .botoes { grid-template-columns: repeat(3, 1fr); } }
    .botoes button { min-height: 44px; }
    .acoes { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
    .respondido { text-align: center; }
    .respondido mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--color-success); }
    .citacao { font-style: italic; overflow-wrap: anywhere; }
    .aviso { text-align: center; padding: 40px 16px; }
    .aviso mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--mat-sys-outline); }
  `,
})
export class PropostaPublicaPage implements OnInit {
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
  private token = '';

  ngOnInit(): void {
    this.token = this.rota.snapshot.paramMap.get('token') ?? '';
    this.negocio.propostaPublica(this.token).subscribe({
      next: (p) => {
        this.proposta.set(p);
        preencherContratante(this.contratante, p.contratante);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
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
