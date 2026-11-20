import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { forkJoin } from 'rxjs';
import {
  DinheiroClient,
  DinheiroEvento,
  FORMAS_PAGAMENTO,
  ComprovanteEvento,
  LancamentoEvento,
  PagamentoFornecedor,
  ParcelaCasal,
  SITUACOES_PARCELA_CASAL,
} from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cliente, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { EventoAbasComponent } from '../eventos/evento-abas.component';
import { linkWhatsapp, textoCobranca } from './cobranca';
import { ChavePixDialog, ContratoCasalDialog, LancamentoDialog, ReceberDialog } from './dinheiro.dialogs';
import { ComprovanteDialog } from './comprovante.dialog';
import { STATUS } from '../../shared/status';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Aba Dinheiro do evento (SPEC-029): o que ela recebe do casal e o que paga aos fornecedores. */
@Component({
  selector: 'app-evento-dinheiro',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatMenuModule, GdDataPipe, GdDinheiroPipe, EventoAbasComponent],
  template: `
    <app-evento-abas [eventoId]="id" />

    @if (dados(); as d) {
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <mat-card class="shadow-none text-center mb-0! h-full bg-light-primary">
          <mat-card-content>
            <mat-icon class="text-primary">description</mat-icon>
            <h4 class="text-sm font-semibold text-primary mt-2!">Contrato</h4>
            <h6 class="text-xl font-semibold text-primary mt-2!">{{ (d.valorContrato ?? 0) | gdDinheiro }}</h6>
          </mat-card-content>
        </mat-card>
        <mat-card class="shadow-none text-center mb-0! h-full bg-light-success">
          <mat-card-content>
            <mat-icon class="text-success">savings</mat-icon>
            <h4 class="text-sm font-semibold text-success mt-2!">Recebido</h4>
            <h6 class="text-xl font-semibold text-success mt-2!">{{ d.recebido | gdDinheiro }}</h6>
          </mat-card-content>
        </mat-card>
        <mat-card class="shadow-none text-center mb-0! h-full bg-light-warning">
          <mat-card-content>
            <mat-icon class="text-warning">account_balance_wallet</mat-icon>
            <h4 class="text-sm font-semibold text-warning mt-2!">Saldo</h4>
            <h6 class="text-xl font-semibold text-warning mt-2!">{{ d.saldo | gdDinheiro }}</h6>
          </mat-card-content>
        </mat-card>
      </div>
    }

    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <mat-card-title class="mb-0">Parcelas do casal</mat-card-title>
          <mat-card-subtitle>{{ nomeEvento() }} · o que você recebe do casal.</mat-card-subtitle>
        </div>
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button type="button" (click)="exportarBudget()"><mat-icon>download</mat-icon> Exportar orçamento</button>
          <button mat-flat-button type="button" (click)="definirContrato()">
            <mat-icon>{{ dados()?.parcelas?.length ? 'edit' : 'add' }}</mat-icon>
            {{ dados()?.parcelas?.length ? 'Refazer parcelas' : 'Definir contrato' }}
          </button>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
        @if (dados(); as d) {
          @if (d.parcelas.length === 0) {
            <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
              <p>Informe o valor do contrato, a entrada e o número de parcelas para gerar as parcelas do casal.</p>
              <button mat-flat-button type="button" (click)="definirContrato()"><mat-icon>add</mat-icon> Definir contrato</button>
            </div>
          } @else {
            <div class="relative overflow-auto">
              <table class="tabela">
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th class="text-end!">Valor</th>
                    <th class="text-end!">Recebido</th>
                    <th>Situação</th>
                    <th class="text-end! whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (parcela of d.parcelas; track parcela.id) {
                    <tr>
                      <td>
                        {{ parcela.entrada ? 'Entrada' : 'Parcela ' + parcela.numero }}
                        @if (parcela.recebimentos.length > 0) {
                          <span class="block text-xs text-muted">{{ resumoRecebimentos(parcela) }}</span>
                        }
                      </td>
                      <td class="whitespace-nowrap">{{ parcela.vencimento | gdData }}</td>
                      <td class="text-end! valor">{{ parcela.valor | gdDinheiro }}</td>
                      <td class="text-end! whitespace-nowrap">{{ parcela.recebido | gdDinheiro }}</td>
                      <td><span [class]="situacao(parcela).classe">{{ situacao(parcela).rotulo }}</span></td>
                      <td class="text-end! whitespace-nowrap">
                        @if (parcela.situacao !== 'Recebida') {
                          <button mat-stroked-button class="ml-1" type="button" (click)="cobrar(parcela)"><mat-icon>chat</mat-icon> Cobrar</button>
                          <button mat-stroked-button class="ml-1" type="button" (click)="receber(parcela)">Recebi</button>
                        }
                        @if (parcela.recebimentos.length > 0) {
                          <button mat-icon-button type="button" aria-label="Mais ações" [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                          <mat-menu #menu="matMenu" xPosition="before" class="cardWithShadow">
                            <button mat-menu-item type="button" (click)="desfazer(parcela)"><mat-icon>undo</mat-icon> Desfazer último recebimento</button>
                          </mat-menu>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </mat-card-content>
    </mat-card>

    @if (dados(); as d) {
      <mat-card class="cardWithShadow">
        <div class="p-6">
          <mat-card-title class="mb-0">Pagamentos a fornecedores</mat-card-title>
          <mat-card-subtitle>Parcelas geradas ao contratar um fornecedor.</mat-card-subtitle>
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
  private readonly clientes = signal<Cliente[]>([]);
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
    forkJoin({ evento: this.negocio.evento(this.id), clientes: this.negocio.clientesDoEvento(this.id) }).subscribe({
      next: ({ evento, clientes }) => {
        this.nomeEvento.set(evento.nome);
        this.clientes.set(clientes);
      },
      error: () => this.clientes.set([]),
    });
    this.carregar();
  }

  protected situacao(parcela: ParcelaCasal) {
    return SITUACOES_PARCELA_CASAL[parcela.situacao];
  }

  protected resumoRecebimentos(parcela: ParcelaCasal): string {
    return parcela.recebimentos
      .map((item) => `${FORMAS_PAGAMENTO.find((forma) => forma.valor === item.forma)?.rotulo ?? item.forma} em ${item.data.slice(8, 10)}/${item.data.slice(5, 7)}`)
      .join(' · ');
  }

  protected definirContrato(): void {
    const atual = this.dados();
    if (atual?.parcelas.some((parcela) => parcela.recebimentos.length > 0)) {
      this.toast.erro('Já há recebimentos. Desfaça os recebimentos antes de refazer as parcelas.');
      return;
    }
    this.dialog.open(ContratoCasalDialog, { ...DIALOG, data: { valor: atual?.valorContrato ?? null } }).afterClosed().subscribe((pedido) => {
      if (!pedido) return;
      this.dinheiro.definirContrato(this.id, pedido).subscribe({
        next: (dados) => {
          this.dados.set(dados);
          this.toast.sucesso('Parcelas do casal geradas.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected cobrar(parcela: ParcelaCasal): void {
    const chave = this.dados()?.chavePix;
    if (chave) {
      this.abrirWhatsapp(parcela, chave);
      return;
    }
    this.dialog.open(ChavePixDialog, DIALOG_PEQUENO).afterClosed().subscribe((digitada?: string) => {
      if (digitada) this.abrirWhatsapp(parcela, digitada);
    });
  }

  protected receber(parcela: ParcelaCasal): void {
    this.dialog.open(ReceberDialog, { ...DIALOG_PEQUENO, data: parcela }).afterClosed().subscribe((pedido) => {
      if (!pedido) return;
      this.dinheiro.receber(this.id, parcela.id, pedido).subscribe({
        next: (dados) => {
          this.dados.set(dados);
          this.toast.sucesso('Recebimento registrado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected desfazer(parcela: ParcelaCasal): void {
    this.dinheiro.desfazer(this.id, parcela.id).subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.toast.sucesso('Último recebimento desfeito.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
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

  private abrirWhatsapp(parcela: ParcelaCasal, chavePix: string): void {
    const cliente = this.clientes()[0];
    const texto = textoCobranca(parcela, cliente?.nome ?? '', chavePix);
    window.open(linkWhatsapp(texto, cliente?.ddi ?? '55', cliente?.celular ?? ''), '_blank', 'noopener');
  }

  private carregar(): void {
    this.dinheiro.obter(this.id).subscribe({
      next: (dados) => this.dados.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
