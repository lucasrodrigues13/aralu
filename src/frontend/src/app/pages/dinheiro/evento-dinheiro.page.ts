import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import {
  ComprovantePagamento,
  DinheiroClient,
  DinheiroEvento,
  PagamentoFornecedor,
  ParcelaPagamento,
  refazerPerdePagamentos,
} from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { STATUS } from '../../shared/status';
import { EventoAbasComponent } from '../eventos/evento-abas.component';
import { ComprovanteDialog } from './comprovante.dialog';
import { ParcelarPagamentoDialog } from './parcelar-pagamento.dialog';
import { pagamentosPorMes } from './pagamentos-por-mes';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Aba Dinheiro do evento (SPEC-043): pagamentos a fornecedores, com parcelas, marcação de pago e comprovantes. */
@Component({
  selector: 'app-evento-dinheiro',
  imports: [MatCardModule, MatButtonModule, MatCheckboxModule, MatIconModule, GdDataPipe, GdDinheiroPipe, EventoAbasComponent, MatTooltipModule],
  template: `
    <app-evento-abas [eventoId]="id" />

    @if (dados(); as d) {
      <mat-card class="cardWithShadow">
        <div class="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <mat-card-title class="mb-0">Pagamentos a fornecedores</mat-card-title>
            <mat-card-subtitle>
              {{ nomeEvento() }} · contratado {{ d.contratado | gdDinheiro }} · pago {{ d.pago | gdDinheiro }} · a pagar {{ d.contratado - d.pago | gdDinheiro }}
            </mat-card-subtitle>
          </div>
          <button mat-stroked-button type="button" (click)="exportarBudget()"><mat-icon>download</mat-icon> Exportar orçamento</button>
        </div>
        <mat-card-content class="border-t border-border">
          @if (d.pagamentosFornecedores.length === 0) {
            <p class="text-center text-muted py-10">Nenhum pagamento. Eles aparecem ao contratar um fornecedor na aba Fornecedores.</p>
          } @else {
            <div class="relative">
              <table class="tabela">
                <thead>
                  <tr><th></th><th>Serviço</th><th>Fornecedor</th><th class="text-end!">Valor</th><th>Situação</th><th>Comprovante</th><th class="text-end! whitespace-nowrap">Ações</th></tr>
                </thead>
                @for (grupo of grupos(); track grupo.chave) {
                  <tbody>
                    <tr class="mes"><td colspan="7">{{ grupo.mes }} · {{ grupo.total | gdDinheiro }}</td></tr>
                    @for (pagamento of grupo.itens; track pagamento.servicoId) {
                      <tr>
                        <td class="w-10">
                          @if (pagamento.parcelas.length > 0) {
                            <button mat-icon-button type="button" [attr.aria-label]="aberto(pagamento) ? 'Recolher parcelas' : 'Expandir parcelas'" [matTooltip]="aberto(pagamento) ? 'Recolher parcelas' : 'Expandir parcelas'" (click)="alternar(pagamento)">
                              <mat-icon>{{ aberto(pagamento) ? 'expand_less' : 'expand_more' }}</mat-icon>
                            </button>
                          }
                        </td>
                        <td>
                          {{ pagamento.servico }}
                          <span class="block text-xs text-muted">{{ pagamento.parcelas.length > 0 ? pagamento.parcelas.length + ' parcelas' : 'Sem parcelas' }}</span>
                        </td>
                        <td>{{ pagamento.fornecedor ?? '—' }}</td>
                        <td class="text-end! valor">{{ pagamento.valor | gdDinheiro }}</td>
                        <td><span [class]="pagamento.pago ? status.sucesso : status.alerta">{{ pagamento.pago ? 'Pago' : 'Pendente' }}</span></td>
                        <td>
                          @if (pagamento.parcelas.length === 0) {
                            @if (pagamento.comprovante; as c) {
                              <button mat-icon-button type="button" aria-label="Abrir comprovante" [matTooltip]="'Abrir comprovante: ' + c.nome" (click)="abrirComprovante(c)"><mat-icon>{{ c.tipoConteudo === 'application/pdf' ? 'picture_as_pdf' : 'image' }}</mat-icon></button>
                              <button mat-icon-button type="button" aria-label="Excluir comprovante" matTooltip="Excluir comprovante" (click)="excluirComprovante(pagamento, null)"><mat-icon>delete</mat-icon></button>
                            } @else {
                              <button mat-icon-button type="button" aria-label="Enviar comprovante" matTooltip="Enviar comprovante" (click)="enviarComprovante(pagamento, null)"><mat-icon>upload_file</mat-icon></button>
                            }
                          } @else {
                            <span class="text-muted text-xs">Por parcela</span>
                          }
                        </td>
                        <td class="text-end! whitespace-nowrap">
                          <button mat-button type="button" [class.text-error]="perdeAoRefazer(pagamento)" (click)="parcelar(pagamento)">{{ pagamento.parcelas.length > 0 ? 'Refazer parcelas' : 'Parcelar' }}</button>
                          @if (pagamento.parcelas.length > 0) {
                            <button mat-button type="button" (click)="removerParcelamento(pagamento)">Sem parcelas</button>
                          }
                          <button mat-flat-button type="button" (click)="marcarPagamento(pagamento, !pagamento.pago)">{{ pagamento.pago ? 'Desfazer' : 'Marcar pago' }}</button>
                        </td>
                      </tr>
                      @if (aberto(pagamento)) {
                        @for (parcela of pagamento.parcelas; track parcela.id) {
                          <tr class="parcela">
                            <td></td>
                            <td colspan="2">
                              <mat-checkbox [checked]="parcela.paga" (change)="marcarParcela(pagamento, parcela, $event.checked)">
                                {{ parcela.entrada ? 'Entrada' : 'Parcela ' + parcela.numero }} · vence {{ parcela.vencimento | gdData }}
                              </mat-checkbox>
                            </td>
                            <td class="text-end! valor">{{ parcela.valor | gdDinheiro }}</td>
                            <td><span [class]="parcela.paga ? status.sucesso : status.alerta">{{ parcela.paga ? 'Paga' : 'Pendente' }}</span></td>
                            <td colspan="2">
                              @if (parcela.comprovante; as c) {
                                <button mat-icon-button type="button" aria-label="Abrir comprovante" [matTooltip]="'Abrir comprovante: ' + c.nome" (click)="abrirComprovante(c)"><mat-icon>{{ c.tipoConteudo === 'application/pdf' ? 'picture_as_pdf' : 'image' }}</mat-icon></button>
                                <button mat-icon-button type="button" aria-label="Excluir comprovante" matTooltip="Excluir comprovante" (click)="excluirComprovante(pagamento, parcela)"><mat-icon>delete</mat-icon></button>
                              } @else {
                                <button mat-icon-button type="button" aria-label="Enviar comprovante" matTooltip="Enviar comprovante" (click)="enviarComprovante(pagamento, parcela)"><mat-icon>upload_file</mat-icon></button>
                              }
                            </td>
                          </tr>
                        }
                      }
                    }
                  </tbody>
                }
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .valor { font-weight: 600; white-space: nowrap; }
    tr.mes td { font-size: 12px; font-weight: 600; text-transform: capitalize; color: var(--mat-sys-surface-container-lowest); background: var(--mat-sys-surface-bright); padding-top: 10px; padding-bottom: 10px; }
    tr.parcela td { background: var(--mat-sys-surface-container-low); }
  `,
})
export class EventoDinheiroPage implements OnInit {
  private readonly dinheiro = inject(DinheiroClient);
  protected readonly status = STATUS;
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly dados = signal<DinheiroEvento | null>(null);
  protected readonly nomeEvento = signal('');
  private readonly abertos = signal<ReadonlySet<string>>(new Set());
  protected id = '';

  protected readonly grupos = computed(() => pagamentosPorMes(this.dados()?.pagamentosFornecedores ?? []));

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.evento(this.id).subscribe({ next: (evento) => this.nomeEvento.set(evento.nome) });
    this.dinheiro.obter(this.id).subscribe({
      next: (dados) => this.dados.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected aberto(pagamento: PagamentoFornecedor): boolean {
    return this.abertos().has(pagamento.servicoId);
  }

  protected alternar(pagamento: PagamentoFornecedor): void {
    const novo = new Set(this.abertos());
    if (!novo.delete(pagamento.servicoId)) novo.add(pagamento.servicoId);
    this.abertos.set(novo);
  }

  protected readonly perdeAoRefazer = refazerPerdePagamentos;

  protected parcelar(pagamento: PagamentoFornecedor): void {
    this.dialog.open(ParcelarPagamentoDialog, { ...DIALOG, data: pagamento }).afterClosed().subscribe((pedido) => {
      if (!pedido) return;
      this.aplicar(this.dinheiro.parcelar(this.id, pagamento.servicoId, pedido), 'Parcelamento salvo.');
      this.abertos.set(new Set(this.abertos()).add(pagamento.servicoId));
    });
  }

  protected removerParcelamento(pagamento: PagamentoFornecedor): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Remover parcelamento', texto: `Voltar "${pagamento.servico}" a um pagamento só, sem parcelas?`, confirmar: 'Remover' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.dinheiro.removerParcelamento(this.id, pagamento.servicoId), 'Parcelamento removido.');
    });
  }

  protected marcarPagamento(pagamento: PagamentoFornecedor, pago: boolean): void {
    this.aplicar(this.dinheiro.marcarPagamento(this.id, pagamento.servicoId, pago), pago ? 'Pagamento marcado como pago.' : 'Pagamento desfeito.');
  }

  protected marcarParcela(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento, paga: boolean): void {
    this.aplicar(this.dinheiro.marcarParcela(this.id, pagamento.servicoId, parcela.id, paga), paga ? 'Parcela marcada como paga.' : 'Parcela desfeita.');
  }

  protected enviarComprovante(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento | null): void {
    this.dialog.open(ComprovanteDialog, DIALOG_PEQUENO).afterClosed().subscribe((arquivo?: File) => {
      if (!arquivo) return;
      this.aplicar(this.dinheiro.enviarComprovante(this.id, pagamento.servicoId, parcela?.id ?? null, arquivo), 'Comprovante enviado.');
    });
  }

  protected excluirComprovante(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento | null): void {
    const nome = (parcela ?? pagamento).comprovante?.nome ?? 'comprovante';
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir comprovante', texto: `Excluir "${nome}"? O arquivo é apagado.`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.dinheiro.excluirComprovante(this.id, pagamento.servicoId, parcela?.id ?? null), 'Comprovante excluído.');
    });
  }

  protected abrirComprovante(comprovante: ComprovantePagamento): void {
    const janela = window.open('', '_blank');
    this.dinheiro.baixarArquivo(comprovante.arquivoId).subscribe({
      next: (arquivo) => {
        const url = URL.createObjectURL(arquivo);
        if (janela) janela.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        janela?.close();
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected exportarBudget(): void {
    this.dinheiro.planilhaBudget(this.id).subscribe({
      next: (arquivo) => {
        const url = URL.createObjectURL(arquivo);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orcamento-${this.nomeEvento() || 'evento'}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private aplicar(chamada: Observable<DinheiroEvento>, sucesso: string): void {
    chamada.subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.toast.sucesso(sucesso);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
