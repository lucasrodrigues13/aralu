import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { interval } from 'rxjs';
import { AssinaturaClient, EventoAsaas, Fatura, registrarNoConsole, SituacaoAssinatura, TrocaPrevia } from '../../core/assinatura.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Plano, PlanosClient } from '../../core/planos.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_PEQUENO } from '../../shared/dialog';

const SITUACOES: Record<string, string> = {
  Trial: 'Em teste',
  Ativa: 'Ativa',
  EmAtraso: 'Pagamento em atraso',
  Cancelada: 'Cancelada',
  Expirada: 'Teste encerrado',
  Bloqueada: 'Bloqueada',
};

/** Configurações → Assinatura (só o Dono, SPEC-062 §13): situação, assinar pelo Asaas, faturas e cancelar. */
@Component({
  selector: 'app-assinatura',
  imports: [FormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, CurrencyPipe, DatePipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Assinatura</mat-card-title>
        <mat-card-subtitle>Plano, pagamento e faturas da conta.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border pt-6">
        @if (situacao(); as s) {
          <div class="grid gap-2 mb-6">
            <p><span class="font-semibold">Situação:</span> {{ rotulo(s.situacao) }}</p>
            <p><span class="font-semibold">Plano:</span> {{ s.plano }} · {{ s.valor | currency: 'BRL' }}/mês</p>
            @if (s.situacao === 'Trial' && s.liberada) {
              <p><span class="font-semibold">Teste:</span> faltam {{ s.diasRestantesTrial }} dia(s), até {{ s.trialTerminaEm | date: 'dd/MM/yyyy' }}</p>
            }
            @if (s.proximoVencimento) {
              <p><span class="font-semibold">Próximo vencimento:</span> {{ s.proximoVencimento | date: 'dd/MM/yyyy' }}</p>
            }
            @if (s.situacao === 'Cancelada' && s.pagoAte) {
              <p><span class="font-semibold">Liberada até:</span> {{ s.pagoAte | date: 'dd/MM/yyyy' }}</p>
            }
            @if (s.formaPagamento) {
              <p><span class="font-semibold">Forma de pagamento:</span> {{ s.formaPagamento === 'Pix' ? 'Pix' : 'Cartão' }}</p>
            }
          </div>

          @if (s.situacao === 'Cancelada' && s.liberada) {
            <div class="grid gap-3 max-w-md mb-6">
              <p>Sua assinatura foi cancelada, mas o período pago vai até {{ s.pagoAte | date: 'dd/MM/yyyy' }}.</p>
              <p class="text-muted text-sm">Reativar volta a cobrança mensal com a mesma forma de pagamento. Nada é cobrado agora: a próxima fatura vence no dia seguinte ao fim do período pago.</p>
              <div><button mat-flat-button type="button" [disabled]="enviando()" (click)="reativar()">Reativar assinatura</button></div>
            </div>
          } @else if (!s.assinada) {

            <form class="grid gap-4 max-w-md" (ngSubmit)="assinar()">
              <div class="grid gap-3 sm:grid-cols-2">
                @for (p of planos(); track p.id) {
                  <button
                    type="button"
                    class="text-left rounded border p-4"
                    [class.border-primary]="planoId === p.id"
                    [class.border-border]="planoId !== p.id"
                    [attr.aria-pressed]="planoId === p.id"
                    (click)="planoId = p.id"
                  >
                    <span class="font-semibold block">{{ p.nome }}</span>
                    <span class="block">{{ p.valorMensal | currency: 'BRL' }}/mês</span>
                    @if (p.descricao) {
                      <span class="block text-muted text-sm">{{ p.descricao }}</span>
                    }
                    @for (r of p.recursos; track r.recurso) {
                      <span class="block text-sm">✓ {{ r.recurso }}{{ r.limite !== null ? ' (' + r.limite + '/mês)' : '' }}</span>
                    }
                  </button>
                }
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">CPF ou CNPJ</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput aria-label="CPF ou CNPJ" name="documento" required [(ngModel)]="documento" />
                </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Nome de cobrança</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <input matInput aria-label="Nome de cobrança" name="nome" maxlength="100" required [(ngModel)]="nome" />
                </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Forma de pagamento</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select aria-label="Forma de pagamento" name="forma" [(ngModel)]="forma">
                    <mat-option value="pix">Pix</mat-option>
                    <mat-option value="cartao">Cartão de crédito</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              @if (s.situacao === 'Trial' && s.liberada) {
                <p class="text-muted text-sm">A primeira cobrança vence no último dia do teste: você não perde os dias que faltam.</p>
              }
              <div><button mat-flat-button type="submit" [disabled]="enviando()">Assinar</button></div>
            </form>
          } @else {
            <div class="flex gap-3 flex-wrap">
              @if (linkAberto()) {
                <a mat-flat-button [href]="linkAberto()" target="_blank" rel="noopener">Pagar fatura em aberto</a>
              }
              @if (s.situacao !== 'Cancelada') {
                <button mat-stroked-button type="button" (click)="cancelar()">Cancelar assinatura</button>
              }
            </div>
          }

          @if (s.trocaPendente; as t) {
            <div class="grid gap-3 max-w-xl mt-8 rounded border border-border p-4">
              @if (t.tipo === 'Upgrade') {
                <p class="font-semibold">Upgrade para o plano {{ t.plano }} esperando pagamento</p>
                <p class="text-sm">
                  Pague {{ t.valor | currency: 'BRL' }} para liberar o plano {{ t.plano }}. Até lá, a conta continua no plano atual, com a cobrança mensal normal.
                </p>
                <div class="flex gap-3 flex-wrap">
                  @if (t.linkPagamento) {
                    <a mat-flat-button [href]="t.linkPagamento" target="_blank" rel="noopener">Pagar upgrade</a>
                  }
                  <button mat-stroked-button type="button" [disabled]="enviando()" (click)="desistirTroca(t.tipo)">Desistir do upgrade</button>
                </div>
              } @else {
                <p class="font-semibold">Muda para o plano {{ t.plano }} em {{ t.aplicaEm | date: 'dd/MM/yyyy' }}</p>
                <p class="text-sm">Até lá, a conta segue no plano atual. A partir dessa data, a mensalidade passa a {{ t.valor | currency: 'BRL' }}.</p>
                <div><button mat-stroked-button type="button" [disabled]="enviando()" (click)="desistirTroca(t.tipo)">Manter plano atual</button></div>
              }
            </div>
          } @else if (trocas().length > 0 && podeTrocar(s)) {
            <h3 class="font-semibold mt-8 mb-2">Trocar de plano</h3>
            <div class="grid gap-3 sm:grid-cols-2 max-w-3xl">
              @for (p of trocas(); track p.planoId) {
                <div class="rounded border border-border p-4 grid gap-2 content-start">
                  <span class="font-semibold">{{ p.plano }}</span>
                  <span>{{ p.novaMensalidade | currency: 'BRL' }}/mês</span>
                  @if (p.descricao) {
                    <span class="text-muted text-sm">{{ p.descricao }}</span>
                  }
                  @if (!p.permitida) {
                    <span class="text-muted text-sm">{{ p.motivo }}</span>
                  } @else {
                    <div>
                      <button mat-flat-button type="button" [disabled]="enviando()" (click)="trocar(p, s)">
                        {{ p.tipo === 'Upgrade' ? 'Fazer upgrade' : 'Mudar para este plano' }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        @if (faturas().length > 0) {
          <h3 class="font-semibold mt-8 mb-2">Faturas</h3>
          <table class="tabela">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Situação</th>
                <th><span class="sr-only">Link</span></th>
              </tr>
            </thead>
            <tbody>
              @for (f of faturas(); track f.vencimento + f.status) {
                <tr>
                  <td>{{ f.vencimento | date: 'dd/MM/yyyy' }}</td>
                  <td>{{ f.valor | currency: 'BRL' }}</td>
                  <td>{{ statusFatura(f.status) }}</td>
                  <td>
                    @if (f.link) {
                      <a [href]="f.link" target="_blank" rel="noopener">Abrir fatura</a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class AssinaturaPage implements OnInit {
  private readonly cliente = inject(AssinaturaClient);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly situacao = signal<SituacaoAssinatura | null>(null);
  protected readonly faturas = signal<Fatura[]>([]);
  protected readonly trocas = signal<TrocaPrevia[]>([]);
  /**
   * Fatura para pagar agora: a vencida, ou a pendente que não é do mês seguinte a um período já pago
   * (depois de reativar, a próxima cobrança fica no Asaas, mas não está "em aberto").
   */
  protected readonly linkAberto = computed(() => {
    const pagoAte = this.situacao()?.pagoAte ?? null;
    const hoje = new Date().toISOString().slice(0, 10);
    const coberta = (vencimento: string) => pagoAte !== null && vencimento > pagoAte && vencimento > hoje;
    return (
      this.faturas().find((f) => f.status === 'OVERDUE' || (f.status === 'PENDING' && !coberta(f.vencimento)))?.link ?? null
    );
  });
  protected readonly enviando = signal(false);
  protected documento = '';
  protected nome = '';
  protected forma: 'pix' | 'cartao' = 'pix';
  protected planoId: string | null = null;
  protected readonly planos = signal<Plano[]>([]);
  private readonly planosCliente = inject(PlanosClient);
  private eventosVistos = new Set<string>();

  ngOnInit(): void {
    this.carregar(true);
    this.planosCliente.paraAssinar().subscribe({
      next: (planos) => {
        this.planos.set(planos);
        this.planoId = planos[0]?.id ?? null;
      },
      error: () => undefined,
    });
  }

  protected rotulo(situacao: string): string {
    return SITUACOES[situacao] ?? situacao;
  }

  protected statusFatura(status: string): string {
    return (
      { PENDING: 'Aguardando pagamento', CONFIRMED: 'Paga', RECEIVED: 'Paga', OVERDUE: 'Vencida', REFUNDED: 'Estornada', DELETED: 'Cancelada' } as Record<string, string>
    )[status] ?? status;
  }

  protected assinar(): void {
    this.enviando.set(true);
    console.info('[Asaas] Enviando pedido de assinatura para a API...', { formaPagamento: this.forma });
    this.cliente.assinar({ documento: this.documento, nomeCobranca: this.nome, formaPagamento: this.forma, planoId: this.planoId }).subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        registrarNoConsole('Assinar', resposta.diagnostico);
        console.info('[Asaas] Assinatura criada. Primeira cobrança:', { vencimento: resposta.vencimento, valor: resposta.valor, link: resposta.linkPagamento });
        console.info('[Asaas] A conta fica ativa quando o Asaas avisar o pagamento (webhook). Esta tela confere os avisos a cada 10 segundos.');
        if (resposta.linkPagamento) {
          window.open(resposta.linkPagamento, '_blank', 'noopener');
        }
        this.toast.sucesso('Assinatura criada. Conclua o pagamento na página do Asaas.');
        this.carregar(false);
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        if (erro instanceof HttpErrorResponse) {
          console.error('[Asaas] A assinatura falhou:', erro.status, erro.error?.message);
          registrarNoConsole('Assinar (falhou)', erro.error?.diagnostico);
        }
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected reativar(): void {
    this.enviando.set(true);
    this.cliente.reativar().subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        registrarNoConsole('Reativar', resposta.diagnostico);
        this.toast.sucesso('Assinatura reativada.');
        this.carregar(false);
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        if (erro instanceof HttpErrorResponse) registrarNoConsole('Reativar (falhou)', erro.error?.diagnostico);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected cancelar(): void {

    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: {
          titulo: 'Cancelar assinatura',
          texto: 'A conta segue liberada até o fim do período já pago e depois é bloqueada. Nenhum dado é apagado.',
          confirmar: 'Cancelar assinatura', destrutivo: true,
        },
      })
      .afterClosed()
      .subscribe((confirmou) => {
        if (!confirmou) return;
        this.cliente.cancelar().subscribe({
          next: (resposta) => {
            registrarNoConsole('Cancelar', resposta.diagnostico);
            this.toast.sucesso(resposta.mensagem);
            this.carregar(false);
          },
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  /** SPEC-065 §5: troca na assinatura ativa, ou no teste depois de assinar (antes disso, o plano é escolhido no Assinar). */
  protected podeTrocar(s: SituacaoAssinatura): boolean {
    return s.situacao === 'Ativa' || (s.situacao === 'Trial' && s.liberada && s.assinada);
  }

  protected trocar(p: TrocaPrevia, s: SituacaoAssinatura): void {
    const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const data = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '');
    let texto: string;
    if (s.situacao === 'Trial') {
      texto = `A conta passa agora ao plano ${p.plano}, sem cobrança. A primeira mensalidade será de ${brl(p.novaMensalidade)}.`;
    } else if (p.tipo === 'Upgrade') {
      texto =
        `Faltam ${p.diasRestantes} de ${p.diasDoCiclo} dias do período pago (até ${data(p.pagoAte)}). ` +
        `Você paga agora ${brl(p.valorAgora)}: a diferença entre os planos nesses dias, já descontado o crédito de ${brl(p.credito)} do plano atual. ` +
        `O plano ${p.plano} é liberado quando o pagamento for confirmado. As próximas mensalidades serão de ${brl(p.novaMensalidade)}, no mesmo vencimento.`;
    } else {
      const saem = p.recursosQueSaem.length ? ` Deixam de valer: ${p.recursosQueSaem.join(', ')}. Os dados ficam guardados.` : '';
      texto =
        `Seu plano atual continua até ${data(p.pagoAte)}, sem estorno. A partir de ${data(p.aplicaEm)}, a conta passa ao plano ${p.plano}, ` +
        `com mensalidade de ${brl(p.novaMensalidade)}.${saem}`;
    }

    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: { titulo: p.tipo === 'Upgrade' ? `Upgrade para o plano ${p.plano}` : `Mudar para o plano ${p.plano}`, texto, confirmar: 'Confirmar' },
      })
      .afterClosed()
      .subscribe((confirmou) => {
        if (!confirmou) return;
        this.enviando.set(true);
        this.cliente.trocarPlano(p.planoId).subscribe({
          next: (resposta) => {
            this.enviando.set(false);
            registrarNoConsole('Trocar plano', resposta.diagnostico);
            if (resposta.linkPagamento) {
              window.open(resposta.linkPagamento, '_blank', 'noopener');
              this.toast.sucesso('Upgrade criado. Conclua o pagamento na página do Asaas.');
            } else {
              this.toast.sucesso(resposta.aplicaEm ? 'Mudança de plano agendada.' : `Plano trocado para ${resposta.plano}.`);
            }
            this.carregar(false);
          },
          error: (erro: unknown) => {
            this.enviando.set(false);
            if (erro instanceof HttpErrorResponse) registrarNoConsole('Trocar plano (falhou)', erro.error?.diagnostico);
            this.toast.erro(mensagemDeErro(erro));
          },
        });
      });
  }

  protected desistirTroca(tipo: 'Upgrade' | 'Downgrade'): void {
    this.enviando.set(true);
    this.cliente.desistirTroca().subscribe({
      next: (resposta) => {
        this.enviando.set(false);
        registrarNoConsole('Desistir da troca', resposta.diagnostico);
        this.toast.sucesso(tipo === 'Upgrade' ? 'Upgrade cancelado.' : 'Você continua no plano atual.');
        this.carregar(false);
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private carregar(primeira: boolean): void {
    this.cliente.trocas().subscribe({ next: (trocas) => this.trocas.set(trocas), error: () => undefined });
    this.cliente.situacao().subscribe({
      next: (situacao) => {
        this.situacao.set(situacao);
        if (primeira && situacao?.diagnosticoNoNavegador) {
          console.info('[Asaas] Diagnóstico ligado neste ambiente: as chamadas ao Asaas e os avisos recebidos aparecem aqui no console.');
          interval(10000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.verAvisos());
          this.verAvisos();
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
    this.cliente.faturas().subscribe({
      next: (faturas) => {
        this.faturas.set(faturas);
      },
      error: () => undefined,
    });
  }

  /** Staging: mostra no console cada aviso novo do Asaas e recarrega a situação quando chega um. */
  private verAvisos(): void {
    this.cliente.eventos().subscribe({
      next: (eventos: EventoAsaas[]) => {
        const novos = eventos.filter((e) => !this.eventosVistos.has(e.recebidoEm + e.tipo)).reverse();
        for (const evento of novos) {
          this.eventosVistos.add(evento.recebidoEm + evento.tipo);
          const estilo = evento.erro ? 'color:#c0392b;font-weight:bold' : 'color:#2563eb;font-weight:bold';
          console.groupCollapsed(`%c[Asaas] Aviso recebido: ${evento.tipo}`, estilo, evento.erro ? `— erro: ${evento.erro}` : '');
          console.log('Recebido em:', evento.recebidoEm, '· Processado em:', evento.processadoEm);
          console.log('Conteúdo:', evento.payload);
          console.groupEnd();
        }
        if (novos.length > 0 && this.eventosVistos.size > novos.length) {
          this.carregar(false);
        }
      },
      error: () => undefined,
    });
  }
}
