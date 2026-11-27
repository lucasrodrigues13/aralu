import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
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
import { MatTooltipModule } from '@angular/material/tooltip';

/** Aba Financeiro do evento (SPEC-043): pagamentos a fornecedores, com parcelas, marcação de pago e comprovantes. */
@Component({
  selector: 'app-evento-dinheiro',
  imports: [ExpandirTodosComponent, MatCardModule, MatButtonModule, MatCheckboxModule, MatIconModule, GdDataPipe, GdDinheiroPipe, EventoAbasComponent, MatTooltipModule],
  template: `
    <app-evento-abas [eventoId]="id" />

    @if (dados(); as d) {
      <mat-card class="cardWithShadow">
        <div class="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <mat-card-title class="mb-0">Financeiro</mat-card-title>
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
            <app-expandir-todos [abertos]="todosAbertos()" (alternar)="alternarTodos()">
              {{ grupos().length }} {{ grupos().length === 1 ? 'serviço' : 'serviços' }} ·
              {{ d.pagamentosFornecedores.length }} {{ d.pagamentosFornecedores.length === 1 ? 'pagamento' : 'pagamentos' }}
            </app-expandir-todos>
            <ul class="servicos-lista com-cabecalho" aria-label="Pagamentos por serviço">
              @for (grupo of grupos(); track grupo.servicoId) {
                <li class="servico" [class.aberto]="!fechados().has(grupo.servicoId)">
                  <button type="button" class="servico-cabecalho" [attr.aria-expanded]="!fechados().has(grupo.servicoId)"
                    [attr.aria-controls]="'pagamentos-' + grupo.servicoId" (click)="alternarServico(grupo.servicoId)">
                    <mat-icon class="seta">expand_more</mat-icon>
                    <span class="servico-texto">
                      <span class="nome">{{ grupo.servico }}</span>
                      <span class="block text-xs text-muted">Contratado {{ grupo.total | gdDinheiro }} · pago {{ grupo.pago | gdDinheiro }}</span>
                    </span>
                    @if (grupo.pago >= grupo.total) {
                      <span [class]="status.sucesso">Pago</span>
                    } @else {
                      <span [class]="status.alerta">A pagar {{ grupo.total - grupo.pago | gdDinheiro }}</span>
                    }
                  </button>
                  @if (!fechados().has(grupo.servicoId)) {
                    <div class="fornecedores" [id]="'pagamentos-' + grupo.servicoId">
                      @for (pagamento of grupo.itens; track pagamento.pagamentoId) {
                        <div class="fornecedor">
                          <div class="fornecedor-nome">
                            @if (pagamento.parcelas.length > 0) {
                              <button mat-icon-button type="button" class="seta-parcelas" [class.aberta]="aberto(pagamento)"
                                [attr.aria-label]="aberto(pagamento) ? 'Recolher parcelas' : 'Expandir parcelas'" [matTooltip]="aberto(pagamento) ? 'Recolher parcelas' : 'Expandir parcelas'" (click)="alternar(pagamento)">
                                <mat-icon>expand_more</mat-icon>
                              </button>
                            }
                            <span>
                              <span class="nome">{{ pagamento.fornecedor ?? '—' }}</span>
                              <span class="block text-xs text-muted">
                                {{ pagamento.parcelas.length > 0 ? pagamento.parcelas.length + ' parcelas' : 'Sem parcelas' }}
                                @if (pagamento.vencimento && !pagamento.pago) { · vence {{ pagamento.vencimento | gdData }} }
                              </span>
                            </span>
                          </div>
                          <div><span [class]="pagamento.pago ? status.sucesso : status.alerta">{{ pagamento.pago ? 'Pago' : 'Pendente' }}</span></div>
                          <div>
                            <span class="block text-xs text-muted">Valor</span>
                            <span class="valor">{{ pagamento.valor | gdDinheiro }}</span>
                          </div>
                          <div>
                            @if (pagamento.parcelas.length === 0) {
                              @if (pagamento.comprovante; as c) {
                                <button mat-button type="button" (click)="abrirComprovante(c)"><mat-icon>receipt_long</mat-icon> Comprovante</button>
                                <button mat-icon-button type="button" aria-label="Excluir comprovante" matTooltip="Excluir comprovante" (click)="excluirComprovante(pagamento, null)"><mat-icon>delete</mat-icon></button>
                              } @else {
                                <button mat-button type="button" (click)="enviarComprovante(pagamento, null)"><mat-icon>upload_file</mat-icon> Comprovante</button>
                              }
                            } @else {
                              <span class="text-muted text-xs">Comprovante por parcela</span>
                            }
                          </div>
                          <div class="fornecedor-acoes">
                            <button mat-button type="button" [class.text-error]="perdeAoRefazer(pagamento)" (click)="parcelar(pagamento)">{{ pagamento.parcelas.length > 0 ? 'Refazer parcelas' : 'Parcelar' }}</button>
                            @if (pagamento.parcelas.length > 0) {
                              <button mat-button type="button" (click)="removerParcelamento(pagamento)">Sem parcelas</button>
                            }
                            <button mat-stroked-button type="button" (click)="marcarPagamento(pagamento, !pagamento.pago)">{{ pagamento.pago ? 'Desfazer' : 'Marcar pago' }}</button>
                          </div>
                        </div>
                        @if (aberto(pagamento)) {
                          @for (parcela of pagamento.parcelas; track parcela.id) {
                            <div class="fornecedor parcela">
                              <div>
                                <mat-checkbox [checked]="parcela.paga" (change)="marcarParcela(pagamento, parcela, $event.checked)">
                                  {{ parcela.entrada ? 'Entrada' : 'Parcela ' + parcela.numero }} · vence {{ parcela.vencimento | gdData }}
                                </mat-checkbox>
                              </div>
                              <div><span [class]="parcela.paga ? status.sucesso : status.alerta">{{ parcela.paga ? 'Paga' : 'Pendente' }}</span></div>
                              <div><span class="valor">{{ parcela.valor | gdDinheiro }}</span></div>
                              <div>
                                @if (parcela.comprovante; as c) {
                                  <button mat-button type="button" (click)="abrirComprovante(c)"><mat-icon>receipt_long</mat-icon> Comprovante</button>
                                  <button mat-icon-button type="button" aria-label="Excluir comprovante" matTooltip="Excluir comprovante" (click)="excluirComprovante(pagamento, parcela)"><mat-icon>delete</mat-icon></button>
                                } @else {
                                  <button mat-button type="button" (click)="enviarComprovante(pagamento, parcela)"><mat-icon>upload_file</mat-icon> Comprovante</button>
                                }
                              </div>
                              <div></div>
                            </div>
                          }
                        }
                      }
                    </div>
                  }
                </li>
              }
            </ul>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .nome { display: block; font-weight: 500; }
    .valor { font-weight: 600; white-space: nowrap; }
    .com-cabecalho { border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; }
    .servicos-lista { list-style: none; padding: 0; margin: 0; border: 1px solid rgba(128,128,128,.25); border-radius: 8px; overflow: hidden; }
    .servico + .servico { border-top: 1px solid rgba(128,128,128,.25); }
    .servico-cabecalho { width: 100%; display: flex; align-items: center; gap: 12px; padding: 16px 16px 16px 12px; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    .servico-cabecalho:focus-visible { outline: 2px solid var(--mat-sys-primary); outline-offset: -2px; }
    .servico-texto { flex: 1; min-width: 0; }
    .seta { transition: transform .15s; flex-shrink: 0; transform: rotate(-90deg); }
    .servico.aberto .seta { transform: none; }
    .fornecedores { background: rgba(128,128,128,.1); border-top: 1px solid rgba(128,128,128,.3); }
    .fornecedor { display: grid; grid-template-columns: minmax(180px, 2fr) 100px minmax(110px, 1fr) minmax(150px, 1.2fr) auto; align-items: center; gap: 12px; padding: 10px 16px 10px 52px; }
    .fornecedor + .fornecedor { border-top: 1px dashed rgba(128,128,128,.2); }
    .fornecedor:hover, .servico-cabecalho:hover { background: rgba(128,128,128,.08); }
    .fornecedor-nome { position: relative; }
    .seta-parcelas { position: absolute; left: -44px; top: 50%; transform: translateY(-50%); }
    .seta-parcelas mat-icon { transition: transform .15s; transform: rotate(-90deg); }
    .seta-parcelas.aberta mat-icon { transform: none; }
    .fornecedor.parcela { padding-left: 76px; background: rgba(128,128,128,.06); }
    .fornecedor-acoes { display: flex; align-items: center; justify-content: flex-end; gap: 4px; white-space: nowrap; flex-wrap: wrap; }
    @media (max-width: 900px) {
      .fornecedor, .fornecedor.parcela { grid-template-columns: 1fr 1fr; padding-left: 52px; }
      .fornecedor-acoes { grid-column: 1 / -1; justify-content: flex-start; }
    }
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

  /** Serviços recolhidos; todos começam abertos. */
  protected readonly fechados = signal<ReadonlySet<string>>(new Set());

  protected readonly todosAbertos = computed(() => this.grupos().every((grupo) => !this.fechados().has(grupo.servicoId)));

  protected alternarTodos(): void {
    this.fechados.set(this.todosAbertos() ? new Set(this.grupos().map((grupo) => grupo.servicoId)) : new Set());
  }

  /** Pagamentos agrupados por serviço, no mesmo padrão das abas Fornecedores e Contratos. */
  protected readonly grupos = computed(() => {
    const grupos: { servicoId: string; servico: string; total: number; pago: number; itens: PagamentoFornecedor[] }[] = [];
    for (const pagamento of this.dados()?.pagamentosFornecedores ?? []) {
      let grupo = grupos.find((item) => item.servicoId === pagamento.servicoId);
      if (!grupo) grupos.push(grupo = { servicoId: pagamento.servicoId, servico: pagamento.servico, total: 0, pago: 0, itens: [] });
      grupo.itens.push(pagamento);
      grupo.total += pagamento.valor;
      grupo.pago += pagamento.parcelas.length > 0
        ? pagamento.parcelas.filter((parcela) => parcela.paga).reduce((soma, parcela) => soma + parcela.valor, 0)
        : pagamento.pago ? pagamento.valor : 0;
    }
    return grupos;
  });

  protected alternarServico(servicoId: string): void {
    const novo = new Set(this.fechados());
    if (!novo.delete(servicoId)) novo.add(servicoId);
    this.fechados.set(novo);
  }

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.evento(this.id).subscribe({ next: (evento) => this.nomeEvento.set(evento.nome) });
    this.dinheiro.obter(this.id).subscribe({
      next: (dados) => this.dados.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected aberto(pagamento: PagamentoFornecedor): boolean {
    return this.abertos().has(pagamento.pagamentoId);
  }

  protected alternar(pagamento: PagamentoFornecedor): void {
    const novo = new Set(this.abertos());
    if (!novo.delete(pagamento.pagamentoId)) novo.add(pagamento.pagamentoId);
    this.abertos.set(novo);
  }

  protected readonly perdeAoRefazer = refazerPerdePagamentos;

  protected parcelar(pagamento: PagamentoFornecedor): void {
    this.dialog.open(ParcelarPagamentoDialog, { ...DIALOG, data: pagamento }).afterClosed().subscribe((pedido) => {
      if (!pedido) return;
      this.aplicar(this.dinheiro.parcelar(this.id, pagamento.pagamentoId, pedido), 'Parcelamento salvo.');
      this.abertos.set(new Set(this.abertos()).add(pagamento.pagamentoId));
    });
  }

  protected removerParcelamento(pagamento: PagamentoFornecedor): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Remover parcelamento', texto: `Voltar "${pagamento.servico}" a um pagamento só, sem parcelas?`, confirmar: 'Remover', destrutivo: true },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.dinheiro.removerParcelamento(this.id, pagamento.pagamentoId), 'Parcelamento removido.');
    });
  }

  protected marcarPagamento(pagamento: PagamentoFornecedor, pago: boolean): void {
    this.aplicar(this.dinheiro.marcarPagamento(this.id, pagamento.pagamentoId, pago), pago ? 'Pagamento marcado como pago.' : 'Pagamento desfeito.');
  }

  protected marcarParcela(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento, paga: boolean): void {
    this.aplicar(this.dinheiro.marcarParcela(this.id, pagamento.pagamentoId, parcela.id, paga), paga ? 'Parcela marcada como paga.' : 'Parcela desfeita.');
  }

  protected enviarComprovante(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento | null): void {
    this.dialog.open(ComprovanteDialog, DIALOG_PEQUENO).afterClosed().subscribe((arquivo?: File) => {
      if (!arquivo) return;
      this.aplicar(this.dinheiro.enviarComprovante(this.id, pagamento.pagamentoId, parcela?.id ?? null, arquivo), 'Comprovante enviado.');
    });
  }

  protected excluirComprovante(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento | null): void {
    const nome = (parcela ?? pagamento).comprovante?.nome ?? 'comprovante';
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir comprovante', texto: `Excluir "${nome}"? O arquivo é apagado.`, confirmar: 'Excluir', destrutivo: true },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.dinheiro.excluirComprovante(this.id, pagamento.pagamentoId, parcela?.id ?? null), 'Comprovante excluído.');
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
