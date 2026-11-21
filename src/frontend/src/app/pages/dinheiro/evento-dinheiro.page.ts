import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  DinheiroClient,
  DinheiroEvento,
  ComprovanteEvento,
  LancamentoEvento,
  PagamentoFornecedor,
} from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { EventoAbasComponent } from '../eventos/evento-abas.component';
import { LancamentoDialog } from './dinheiro.dialogs';
import { ComprovanteDialog } from './comprovante.dialog';
import { STATUS } from '../../shared/status';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Aba Dinheiro do evento (SPEC-029 v2): pagamentos a fornecedores, despesas e comprovantes. O que o cliente paga está no contrato (SPEC-040). */
@Component({
  selector: 'app-evento-dinheiro',
  imports: [MatCardModule, MatButtonModule, MatIconModule, GdDataPipe, GdDinheiroPipe, EventoAbasComponent],
  template: `
    <app-evento-abas [eventoId]="id" />

    @if (dados(); as d) {
      <mat-card class="cardWithShadow">
        <div class="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <mat-card-title class="mb-0">Pagamentos a fornecedores</mat-card-title>
            <mat-card-subtitle>{{ nomeEvento() }} · parcelas geradas ao contratar um fornecedor.</mat-card-subtitle>
          </div>
          <button mat-stroked-button type="button" (click)="exportarBudget()"><mat-icon>download</mat-icon> Exportar orçamento</button>
        </div>
        <mat-card-content class="border-t border-border">
          @if (d.pagamentosFornecedores.length === 0) {
            <p class="text-center text-muted py-10">Nenhuma parcela de fornecedor. Elas aparecem ao contratar um fornecedor na aba Fornecedores.</p>
          } @else {
            <div class="relative overflow-auto">
              <table class="tabela">
                <thead>
                  <tr><th>Vencimento</th><th>Serviço</th><th>Fornecedor</th><th class="text-end!">Valor</th><th>Situação</th></tr>
                </thead>
                @for (grupo of pagamentosPorMes(); track grupo.mes) {
                  <tbody>
                    <tr class="mes"><td colspan="5">{{ grupo.mes }} · {{ grupo.total | gdDinheiro }}</td></tr>
                    @for (pagamento of grupo.itens; track $index) {
                      <tr>
                        <td class="whitespace-nowrap">{{ pagamento.vencimento | gdData }}</td>
                        <td>{{ pagamento.servico }} <span class="block text-xs text-muted">{{ pagamento.entrada ? 'Entrada' : 'Parcela ' + pagamento.numero }}</span></td>
                        <td>{{ pagamento.fornecedor ?? '—' }}</td>
                        <td class="text-end! valor">{{ pagamento.valor | gdDinheiro }}</td>
                        <td><span [class]="pagamento.situacao === 'Pago' ? status.sucesso : status.alerta">{{ pagamento.situacao === 'Pago' ? 'Pago' : 'Pendente' }}</span></td>
                      </tr>
                    }
                  </tbody>
                }
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="cardWithShadow">
        <div class="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <mat-card-title class="mb-0">Despesas e entradas</mat-card-title>
            <mat-card-subtitle>Lançamentos avulsos do evento.</mat-card-subtitle>
          </div>
          <button mat-stroked-button type="button" (click)="lancamento()"><mat-icon>add</mat-icon> Adicionar</button>
        </div>
        <mat-card-content class="border-t border-border">
          @if (d.lancamentos.length === 0) {
            <p class="text-center text-muted py-10">Nenhuma despesa ou entrada avulsa neste evento.</p>
          } @else {
            <div class="relative overflow-auto">
              <table class="tabela">
                <thead>
                  <tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th class="text-end!">Valor</th><th class="text-end! whitespace-nowrap">Ações</th></tr>
                </thead>
                <tbody>
                  @for (item of d.lancamentos; track item.id) {
                    <tr>
                      <td class="whitespace-nowrap">{{ item.data | gdData }}</td>
                      <td><span [class]="item.tipo === 'Despesa' ? status.erro : status.sucesso">{{ item.tipo }}</span></td>
                      <td>{{ item.categoria }}</td>
                      <td>{{ item.descricao ?? '—' }}</td>
                      <td class="text-end! valor">{{ item.valor | gdDinheiro }}</td>
                      <td class="text-end! whitespace-nowrap">
                        <button mat-icon-button type="button" aria-label="Editar" (click)="lancamento(item)"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Excluir" (click)="excluirLancamento(item)"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="text-sm text-muted text-end mt-4">Despesas {{ d.despesas | gdDinheiro }} · Entradas {{ d.entradas | gdDinheiro }}</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="cardWithShadow">
        <div class="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <mat-card-title class="mb-0">Comprovantes e documentos</mat-card-title>
            <mat-card-subtitle>JPG, JPEG, PNG ou PDF de até 5 MB.</mat-card-subtitle>
          </div>
          <button mat-stroked-button type="button" (click)="enviarComprovante()"><mat-icon>upload_file</mat-icon> Enviar comprovante</button>
        </div>
        <mat-card-content class="border-t border-border">
          @if (d.comprovantes.length === 0) {
            <p class="text-center text-muted py-10">Nenhum comprovante.</p>
          } @else {
            <div class="relative overflow-auto">
              <table class="tabela">
                <thead><tr><th>Arquivo</th><th>Descrição</th><th>Enviado em</th><th class="text-end! whitespace-nowrap">Ações</th></tr></thead>
                <tbody>
                  @for (item of d.comprovantes; track item.id) {
                    <tr>
                      <td>
                        <span class="inline-flex items-center gap-2">
                          <mat-icon class="text-muted">{{ item.tipoConteudo === 'application/pdf' ? 'picture_as_pdf' : 'image' }}</mat-icon>
                          {{ item.nome }}
                        </span>
                      </td>
                      <td>{{ item.descricao ?? '—' }}</td>
                      <td class="whitespace-nowrap">{{ item.enviadoEm | gdData }}</td>
                      <td class="text-end! whitespace-nowrap">
                        <button mat-icon-button type="button" aria-label="Abrir" (click)="abrirComprovante(item)"><mat-icon>open_in_new</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Excluir" (click)="excluirComprovante(item)"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                  }
                </tbody>
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
  protected id = '';

  protected readonly pagamentosPorMes = computed(() => {
    const grupos = new Map<string, { mes: string; total: number; itens: PagamentoFornecedor[] }>();
    for (const pagamento of this.dados()?.pagamentosFornecedores ?? []) {
      const [ano, mes] = pagamento.vencimento.slice(0, 7).split('-');
      const chave = `${ano}-${mes}`;
      const grupo = grupos.get(chave) ?? { mes: `${MESES[Number(mes) - 1]} de ${ano}`, total: 0, itens: [] };
      grupo.total += pagamento.valor;
      grupo.itens.push(pagamento);
      grupos.set(chave, grupo);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, grupo]) => grupo);
  });

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.evento(this.id).subscribe({ next: (evento) => this.nomeEvento.set(evento.nome) });
    this.carregar();
  }

  protected lancamento(item?: LancamentoEvento): void {
    this.dialog.open(LancamentoDialog, { ...DIALOG, data: item ?? null }).afterClosed().subscribe((pedido) => {
      if (!pedido) return;
      this.dinheiro.salvarLancamento(this.id, item?.id ?? null, pedido).subscribe({
        next: (dados) => {
          this.dados.set(dados);
          this.toast.sucesso(item ? 'Lançamento atualizado.' : 'Lançamento adicionado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected excluirLancamento(item: LancamentoEvento): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir lançamento', texto: `Excluir "${item.categoria}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.dinheiro.excluirLancamento(this.id, item.id).subscribe({
        next: (dados) => {
          this.dados.set(dados);
          this.toast.sucesso('Lançamento excluído.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected enviarComprovante(): void {
    this.dialog.open(ComprovanteDialog, DIALOG_PEQUENO).afterClosed().subscribe((envio) => {
      if (!envio) return;
      this.dinheiro.enviarComprovante(this.id, envio.arquivo, envio.descricao).subscribe({
        next: (dados) => {
          this.dados.set(dados);
          this.toast.sucesso('Comprovante enviado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected abrirComprovante(item: ComprovanteEvento): void {
    const janela = window.open('', '_blank');
    this.dinheiro.baixarArquivo(item.arquivoId).subscribe({
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

  protected excluirComprovante(item: ComprovanteEvento): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir comprovante', texto: `Excluir "${item.nome}"? O arquivo é apagado.`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.dinheiro.excluirComprovante(this.id, item.id).subscribe({
        next: (dados) => {
          this.dados.set(dados);
          this.toast.sucesso('Comprovante excluído.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
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

  private carregar(): void {
    this.dinheiro.obter(this.id).subscribe({
      next: (dados) => this.dados.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
