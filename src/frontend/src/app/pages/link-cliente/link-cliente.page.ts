import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable } from 'rxjs';
import { LinkClienteClient, PaginaClienteLeitura, ConviteDoLink } from '../../core/link-cliente.client';
import { ConviteDoFormulario, PedidoConvite } from '../../core/convite-formulario';
import { ComprovantePagamento, PagamentoFornecedor, ParcelaPagamento, refazerPerdePagamentos } from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { ConviteFormDados, ConviteFormDialog } from '../../shared/convite-form.dialog';
import { contarPorSituacao, dadosPreenchidos, filtrarConvites, FiltroDeConvites, prazoEncerrado, resumoDosConvidados } from '../../shared/convite-lista';
import { ConvidadosTopoComponent } from '../../shared/convidados-topo.component';
import { DADOS_ENVIO, DADOS_PRAZO, DataConvitesDialog } from '../../shared/data-convites.dialog';
import { PlanilhaInstrucoesDados, PlanilhaInstrucoesDialog } from '../../shared/planilha-instrucoes.dialog';
import { PresencasDialog } from '../../shared/presencas.dialog';
import { ImportacoesDados, ImportacoesDialog } from '../../shared/importacoes.dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { STATUS } from '../../shared/status';
import { ComprovanteDialog } from '../dinheiro/comprovante.dialog';
import { pagamentosPorMes } from '../dinheiro/pagamentos-por-mes';
import { ParcelarPagamentoDialog } from '../dinheiro/parcelar-pagamento.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Página do cliente, sem login (SPEC-046): acompanha e atualiza o financeiro do evento quando a organizadora libera. */
@Component({
  selector: 'app-cliente',
  imports: [MatCardModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatTabsModule, GdDataPipe, GdDinheiroPipe, ConvidadosTopoComponent, MatTooltipModule],
  template: `
    <main class="pagina">
      @if (carregando()) {
        <p class="text-xs text-muted">Carregando…</p>
      } @else if (indisponivel()) {
        <mat-card class="cardWithShadow"><mat-card-content class="aviso">
          <mat-icon>link_off</mat-icon>
          <h1>Este link não está mais disponível</h1>
          <p class="text-muted">Peça um novo link à organizadora do seu evento.</p>
        </mat-card-content></mat-card>
      } @else if (dados(); as d) {
        <header class="topo">
          <h1>{{ d.evento }}</h1>
          @if (d.data) { <span class="text-sm text-muted">{{ d.data | gdData }}</span> }
        </header>

        @if (!d.financeiro && !d.convites) {
          @if (!d.convidadosLiberado) {
            <mat-card class="cardWithShadow"><mat-card-content class="aviso">
              <mat-icon>lock</mat-icon>
              <p>A organizadora ainda não liberou o financeiro nem o cadastro de convidados deste evento.</p>
            </mat-card-content></mat-card>
          }
        } @else {
          <mat-tab-group dynamicHeight>
            @if (d.financeiro) {
              <mat-tab label="Financeiro"><div class="aba">
                <mat-card class="cardWithShadow resumo"><mat-card-content>
                  <div><span class="rotulo">Contratado</span><strong>{{ d.financeiro.contratado | gdDinheiro }}</strong></div>
                  <div><span class="rotulo">Pago</span><strong>{{ d.financeiro.pago | gdDinheiro }}</strong></div>
                  <div><span class="rotulo">A pagar</span><strong>{{ d.financeiro.contratado - d.financeiro.pago | gdDinheiro }}</strong></div>
                </mat-card-content></mat-card>

                @if (d.financeiro.pagamentosFornecedores.length === 0) {
                  <p class="text-center text-muted py-10">Nenhum pagamento ainda. Eles aparecem quando a organizadora contrata um fornecedor.</p>
                }
                @for (grupo of grupos(); track grupo.chave) {
                  <h2 class="mes">{{ grupo.mes }} · {{ grupo.total | gdDinheiro }}</h2>
                  @for (pagamento of grupo.itens; track pagamento.pagamentoId) {
                    <mat-card class="cardWithShadow pagamento"><mat-card-content>
                      <div class="linha">
                        <div class="min-w-0">
                          <strong>{{ pagamento.servico }}</strong>
                          <span class="block text-xs text-muted">{{ pagamento.fornecedor ?? 'Sem fornecedor' }} · {{ pagamento.parcelas.length > 0 ? pagamento.parcelas.length + ' parcelas' : 'Sem parcelas' }}</span>
                        </div>
                        <div class="text-end">
                          <strong>{{ pagamento.valor | gdDinheiro }}</strong>
                          <span class="block"><span [class]="pagamento.pago ? status.sucesso : status.alerta">{{ pagamento.pago ? 'Pago' : 'Pendente' }}</span></span>
                        </div>
                      </div>

                      @for (parcela of pagamento.parcelas; track parcela.id) {
                        <div class="parcela">
                          <mat-checkbox [checked]="parcela.paga" (change)="marcarParcela(pagamento, parcela, $event.checked)">
                            {{ parcela.entrada ? 'Entrada' : 'Parcela ' + parcela.numero }} · vence {{ parcela.vencimento | gdData }} · {{ parcela.valor | gdDinheiro }}
                          </mat-checkbox>
                          <span class="arquivo">
                            @if (parcela.comprovante; as c) {
                              <button mat-button type="button" [matTooltip]="'Abrir comprovante: ' + c.nome" (click)="abrir(c)"><mat-icon>{{ icone(c) }}</mat-icon> Comprovante</button>
                              <button mat-icon-button type="button" aria-label="Excluir comprovante" matTooltip="Excluir comprovante" (click)="excluirComprovante(pagamento, parcela)"><mat-icon>delete</mat-icon></button>
                            } @else {
                              <button mat-button type="button" (click)="enviarComprovante(pagamento, parcela)"><mat-icon>upload_file</mat-icon> Comprovante</button>
                            }
                          </span>
                        </div>
                      }

                      <div class="acoes">
                        @if (pagamento.parcelas.length === 0) {
                          @if (pagamento.comprovante; as c) {
                            <button mat-button type="button" [matTooltip]="'Abrir comprovante: ' + c.nome" (click)="abrir(c)"><mat-icon>{{ icone(c) }}</mat-icon> Comprovante</button>
                            <button mat-icon-button type="button" aria-label="Excluir comprovante" matTooltip="Excluir comprovante" (click)="excluirComprovante(pagamento, null)"><mat-icon>delete</mat-icon></button>
                          } @else {
                            <button mat-button type="button" (click)="enviarComprovante(pagamento, null)"><mat-icon>upload_file</mat-icon> Comprovante</button>
                          }
                        }
                        @if (pagamento.contratoAssinado; as c) {
                          <button mat-button type="button" (click)="abrir(c)"><mat-icon>description</mat-icon> Contrato: {{ c.nome }}</button>
                          <button mat-icon-button type="button" aria-label="Excluir contrato assinado" matTooltip="Excluir contrato assinado" (click)="excluirContrato(pagamento)"><mat-icon>delete</mat-icon></button>
                        } @else {
                          <button mat-button type="button" (click)="enviarContrato(pagamento)"><mat-icon>upload_file</mat-icon> Contrato assinado</button>
                        }
                      </div>
                      <div class="acoes">
                        <button mat-button type="button" [class.text-error]="perdeAoRefazer(pagamento)" (click)="parcelar(pagamento)">{{ pagamento.parcelas.length > 0 ? 'Refazer parcelas' : 'Parcelar' }}</button>
                        @if (pagamento.parcelas.length > 0) {
                          <button mat-button type="button" (click)="removerParcelamento(pagamento)">Sem parcelas</button>
                        }
                        <button mat-flat-button type="button" (click)="marcarPagamento(pagamento, !pagamento.pago)">{{ pagamento.pago ? 'Desfazer' : 'Marcar como pago' }}</button>
                      </div>
                    </mat-card-content></mat-card>
                  }
                }
              </div></mat-tab>
            }
            @if (d.convites; as convites) {
              <mat-tab label="Convidados"><div class="aba">
                <app-convidados-topo
                  [porSituacao]="porSituacao()"
                  [prazoRsvp]="d.prazoRsvp"
                  [prazoEncerrado]="encerrado(d.prazoRsvp)"
                  [dataEnvio]="d.dataEnvioConvites"
                  [mostrarObservacao]="false"
                  (filtrar)="filtro.set($event)"
                  (novoConvite)="abrirConvite(null)"
                  (envio)="abrirEnvio(d.dataEnvioConvites)"
                  (prazo)="abrirPrazo(d.prazoRsvp)"
                  (presencas)="abrirPresencas()"
                  (planilha)="abrirPlanilha()"
                  (importar)="abrirImportacoes()">
                @if (convites.length === 0) {
                  <p class="text-center text-muted py-6">Nenhum convite ainda. Use "Novo convite" para cadastrar quem vai receber.</p>
                } @else if (convitesFiltrados().length === 0) {
                  <p class="text-center text-muted py-6">Nenhum convite com estes filtros.</p>
                }
                @for (convite of convitesFiltrados(); track convite.id) {
                  <mat-card class="cardWithShadow"><mat-card-content>
                    <div class="linha">
                      <button mat-icon-button type="button" class="seta" [class.aberta]="aberto(convite.id)" [attr.aria-expanded]="aberto(convite.id)" [attr.aria-controls]="'convidados-' + convite.id" [attr.aria-label]="(aberto(convite.id) ? 'Recolher' : 'Expandir') + ' convidados de ' + convite.nome" [matTooltip]="(aberto(convite.id) ? 'Recolher' : 'Expandir') + ' convidados de ' + convite.nome" (click)="alternar(convite.id)"><mat-icon>chevron_right</mat-icon></button>
                      <div class="min-w-0 flex-1">
                        <strong>{{ convite.nome }}</strong>
                        <span class="block text-xs text-muted">{{ convite.telefone ? ((convite.ddi ?? '') + ' ' + convite.telefone).trim() : 'Sem telefone' }}{{ convite.email ? ' · ' + convite.email : '' }}</span>
                        <span class="block text-xs text-muted">{{ resumo(convite) }}</span>
                      </div>
                      <button mat-icon-button type="button" aria-label="Editar convite" matTooltip="Editar convite" (click)="abrirConvite(convite)"><mat-icon>edit</mat-icon></button>
                    </div>
                    @if (aberto(convite.id)) {
                      <ul class="convidados" [id]="'convidados-' + convite.id">
                        @for (pessoa of convite.convidados; track pessoa.id) {
                          <li>{{ pessoa.nome }}@if (pessoa.principal) { <span class="inline-block rounded font-semibold px-2 text-xs bg-light text-muted">Principal</span> } <span class="text-xs text-muted">· {{ pessoa.situacao }}@for (dado of preenchidos(pessoa); track dado) { · {{ dado }} }</span></li>
                        }
                      </ul>
                    }
                  </mat-card-content></mat-card>
                }
                </app-convidados-topo>
              </div></mat-tab>
            }
          </mat-tab-group>
        }
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--mat-sys-background); }
    .pagina { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; display: grid; gap: 12px; }
    .topo { border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 12px; }
    h1 { font-size: 22px; margin: 0; overflow-wrap: anywhere; }
    .aviso { text-align: center; padding: 32px 16px; }
    .aviso mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--mat-sys-outline); }
    .resumo mat-card-content { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
    .rotulo { display: block; font-size: 12px; color: var(--mat-sys-outline); }
    .aba { display: grid; gap: 12px; padding-top: 16px; }
    .mes { font-size: 13px; font-weight: 600; text-transform: capitalize; margin: 8px 0 0; color: var(--mat-sys-outline); }
    .secao { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .secao .mes { margin: 0; }
    .convidados { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 2px; }
    .linha { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .seta { width: 32px; height: 32px; padding: 4px; flex: none; }
    .seta mat-icon { transition: transform 0.15s; }
    .seta.aberta mat-icon { transform: rotate(90deg); }
    .convidados { padding-left: 44px !important; }
    .parcela { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px 12px; border-top: 1px solid var(--mat-sys-outline-variant); margin-top: 8px; padding-top: 4px; }
    .acoes { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 4px 8px; margin-top: 8px; }
  `,
})
export class LinkClientePage implements OnInit {
  private readonly cliente = inject(LinkClienteClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly status = STATUS;
  protected readonly dados = signal<PaginaClienteLeitura | null>(null);
  /** Convites nascem recolhidos; clicar mostra os convidados (SPEC-059). */
  private readonly abertos = signal<ReadonlySet<string>>(new Set());
  /** Filtro da aba Convidados, aplicado na tela com as regras da organizadora (SPEC-059 §6.5). */
  protected readonly filtro = signal<FiltroDeConvites>({ nome: '', situacao: '', telefone: '', observacao: '', somenteConfirmados: false });
  protected readonly convitesFiltrados = computed(() => filtrarConvites(this.dados()?.convites ?? [], this.filtro()));
  protected readonly porSituacao = computed(() =>
    contarPorSituacao((this.dados()?.convites ?? []).flatMap((convite) => convite.convidados.map((pessoa) => pessoa.situacao))));
  protected readonly encerrado = (prazo: string | null) => prazoEncerrado(prazo);
  protected readonly carregando = signal(true);
  protected readonly indisponivel = signal(false);
  protected readonly grupos = computed(() => pagamentosPorMes(this.dados()?.financeiro?.pagamentosFornecedores ?? []));
  private token = '';

  ngOnInit(): void {
    this.token = this.rota.snapshot.paramMap.get('token') ?? '';
    this.cliente.obter(this.token).subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.carregando.set(false);
      },
      error: () => {
        this.indisponivel.set(true);
        this.carregando.set(false);
      },
    });
  }

  protected abrirPrazo(atual: string | null): void {
    this.dialog.open(DataConvitesDialog, { ...DIALOG_PEQUENO, data: DADOS_PRAZO(atual) }).afterClosed()
      .subscribe((resposta?: { data: string | null }) => {
        if (resposta) this.aplicar(this.cliente.definirPrazoRsvp(this.token, resposta.data), 'Prazo salvo.');
      });
  }

  protected abrirEnvio(atual: string | null): void {
    this.dialog.open(DataConvitesDialog, { ...DIALOG_PEQUENO, data: DADOS_ENVIO(atual) }).afterClosed()
      .subscribe((resposta?: { data: string | null }) => {
        if (resposta) this.aplicar(this.cliente.definirEnvioConvites(this.token, resposta.data), 'Data de envio salva.');
      });
  }

  protected abrirPresencas(): void {
    this.cliente.presencas(this.token).subscribe({
      next: (itens) => this.dialog.open(PresencasDialog, { ...DIALOG, data: itens }),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected abrirPlanilha(): void {
    const dados: PlanilhaInstrucoesDados = { baixar: () => this.cliente.planilha(this.token) };
    this.dialog.open(PlanilhaInstrucoesDialog, { ...DIALOG, data: dados });
  }

  /** Fila de importações (SPEC-059 §6.6); ao fechar depois de uma importação concluída, recarrega a lista. */
  protected abrirImportacoes(): void {
    const dados: ImportacoesDados = {
      listar: () => this.cliente.importacoes(this.token),
      enviar: (arquivo) => this.cliente.importar(this.token, arquivo),
    };
    this.dialog.open(ImportacoesDialog, { ...DIALOG, data: dados }).afterClosed().subscribe((importou?: boolean) => {
      if (importou) this.cliente.obter(this.token).subscribe((leitura) => this.dados.set(leitura));
    });
  }

  protected aberto(id: string): boolean {
    return this.abertos().has(id);
  }

  protected alternar(id: string): void {
    const abertos = new Set(this.abertos());
    if (abertos.has(id)) abertos.delete(id);
    else abertos.add(id);
    this.abertos.set(abertos);
  }

  protected resumo(convite: ConviteDoLink): string {
    return resumoDosConvidados(convite.convidados.map((pessoa) => pessoa.situacao));
  }

  protected preenchidos(pessoa: ConviteDoLink['convidados'][number]): string[] {
    return dadosPreenchidos(pessoa);
  }

  protected abrirConvite(convite: ConviteDoLink | null): void {
    const dados: ConviteFormDados = { convite: convite ? conviteDoFormulario(convite) : null, mostrarObservacao: false };
    this.dialog.open(ConviteFormDialog, { ...DIALOG, data: dados }).afterClosed().subscribe((pedido?: PedidoConvite) => {
      if (!pedido) return;
      if (convite) this.aplicar(this.cliente.atualizarConvite(this.token, convite.id, pedido), 'Convite salvo.');
      else this.aplicar(this.cliente.criarConvite(this.token, pedido), 'Convite cadastrado.');
    });
  }

  protected icone(arquivo: ComprovantePagamento): string {
    return arquivo.tipoConteudo === 'application/pdf' ? 'picture_as_pdf' : 'image';
  }

  protected readonly perdeAoRefazer = refazerPerdePagamentos;

  protected parcelar(pagamento: PagamentoFornecedor): void {
    this.dialog.open(ParcelarPagamentoDialog, { ...DIALOG, data: pagamento }).afterClosed().subscribe((pedido) => {
      if (pedido) this.aplicar(this.cliente.parcelar(this.token, pagamento.pagamentoId, pedido), 'Parcelamento salvo.');
    });
  }

  protected removerParcelamento(pagamento: PagamentoFornecedor): void {
    this.confirmar('Remover parcelamento', `Voltar "${pagamento.servico}" a um pagamento só, sem parcelas?`, 'Remover', () =>
      this.aplicar(this.cliente.removerParcelamento(this.token, pagamento.pagamentoId), 'Parcelamento removido.'));
  }

  protected marcarPagamento(pagamento: PagamentoFornecedor, pago: boolean): void {
    this.aplicar(this.cliente.marcarPagamento(this.token, pagamento.pagamentoId, pago), pago ? 'Pagamento marcado como pago.' : 'Pagamento desfeito.');
  }

  protected marcarParcela(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento, paga: boolean): void {
    this.aplicar(this.cliente.marcarParcela(this.token, pagamento.pagamentoId, parcela.id, paga), paga ? 'Parcela marcada como paga.' : 'Parcela desfeita.');
  }

  protected enviarComprovante(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento | null): void {
    this.dialog.open(ComprovanteDialog, DIALOG_PEQUENO).afterClosed().subscribe((arquivo?: File) => {
      if (arquivo) this.aplicar(this.cliente.enviarComprovante(this.token, pagamento.pagamentoId, parcela?.id ?? null, arquivo), 'Comprovante enviado.');
    });
  }

  protected excluirComprovante(pagamento: PagamentoFornecedor, parcela: ParcelaPagamento | null): void {
    const nome = (parcela ?? pagamento).comprovante?.nome ?? 'comprovante';
    this.confirmar('Excluir comprovante', `Excluir "${nome}"? O arquivo é apagado.`, 'Excluir', () =>
      this.aplicar(this.cliente.excluirComprovante(this.token, pagamento.pagamentoId, parcela?.id ?? null), 'Comprovante excluído.'));
  }

  protected enviarContrato(pagamento: PagamentoFornecedor): void {
    this.dialog.open(ComprovanteDialog, { ...DIALOG_PEQUENO, data: { titulo: 'Enviar contrato assinado' } }).afterClosed().subscribe((arquivo?: File) => {
      if (arquivo) this.aplicar(this.cliente.enviarContratoAssinado(this.token, pagamento.pagamentoId, arquivo), 'Contrato assinado enviado.');
    });
  }

  protected excluirContrato(pagamento: PagamentoFornecedor): void {
    const nome = pagamento.contratoAssinado?.nome ?? 'contrato';
    this.confirmar('Excluir contrato assinado', `Excluir "${nome}"? O arquivo é apagado.`, 'Excluir', () =>
      this.aplicar(this.cliente.excluirContratoAssinado(this.token, pagamento.pagamentoId), 'Contrato assinado excluído.'));
  }

  protected abrir(arquivo: ComprovantePagamento): void {
    const janela = window.open('', '_blank');
    this.cliente.baixarArquivo(this.token, arquivo.arquivoId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (janela) janela.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        janela?.close();
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private confirmar(titulo: string, texto: string, confirmar: string, acao: () => void): void {
    this.dialog.open(ConfirmaDialog, { ...DIALOG_PEQUENO, data: { titulo, texto, confirmar } }).afterClosed().subscribe((ok) => {
      if (ok) acao();
    });
  }

  private aplicar(chamada: Observable<PaginaClienteLeitura>, sucesso: string): void {
    chamada.subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.toast.sucesso(sucesso);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

/** Convite como o cliente vê, no formato do formulário único (SPEC-059). Sem observação: o cliente não a vê. */
export function conviteDoFormulario(convite: ConviteDoLink): ConviteDoFormulario {
  return {
    nome: convite.nome,
    email: convite.email,
    excecaoPrazoRsvp: convite.excecaoPrazoRsvp,
    convidados: convite.convidados.map((pessoa) => ({ id: pessoa.id, nome: pessoa.nome, ddi: pessoa.ddi, celular: pessoa.celular, genero: pessoa.genero, faixa: pessoa.faixa, principal: pessoa.principal })),
  };
}
