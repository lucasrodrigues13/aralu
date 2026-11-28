import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
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
import { HttpErrorResponse } from '@angular/common/http';
import { AcessoLinkComponent } from './acesso-link.component';
import { Estado } from '../../shared/estado';
import { PaginaPublica } from '../../shared/pagina-publica';

/** Página do cliente, sem login (SPEC-046): acompanha e atualiza o financeiro do evento quando a organizadora libera. */
@Component({
  selector: 'app-cliente',
  imports: [ExpandirTodosComponent, MatCardModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatTabsModule, GdDataPipe, GdDinheiroPipe, ConvidadosTopoComponent, MatTooltipModule, AcessoLinkComponent, Estado, PaginaPublica],
  template: `
    <app-pagina-publica [titulo]="titulo()" [subtitulo]="subtitulo()">
      @if (carregando()) {
        <mat-card class="cardWithShadow"><mat-card-content><app-estado titulo="Carregando…" /></mat-card-content></mat-card>
      } @else if (indisponivel()) {
        <mat-card class="cardWithShadow"><mat-card-content>
          <app-estado icone="link_off" titulo="Este link não está mais disponível" texto="Fale com a assessoria." />
        </mat-card-content></mat-card>
      } @else if (pedeCodigo()) {
        <app-acesso-link [token]="token" (aberto)="carregar()" />
      } @else if (dados(); as d) {
        @if (!d.financeiro && !d.convites) {
          @if (!d.convidadosLiberado) {
            <mat-card class="cardWithShadow"><mat-card-content>
              <app-estado icone="lock" titulo="A organizadora ainda não liberou o financeiro nem o cadastro de convidados deste evento." />
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
                  <app-estado titulo="Nenhum pagamento ainda" texto="Eles aparecem quando a organizadora contrata um fornecedor." />
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
                  (importar)="abrirImportacoes()">
                @if (convites.length === 0) {
                  <app-estado titulo="Nenhum convite ainda" texto="Use &quot;Novo convite&quot; para cadastrar quem vai receber." />
                } @else if (convitesFiltrados().length === 0) {
                  <app-estado titulo="Nada encontrado" texto="Mude a busca ou os filtros." />
                }
                @if (convitesFiltrados().length > 0) {
                  <app-expandir-todos class="mb-3 rounded-lg! border-b!" [abertos]="todosAbertos()" (alternar)="alternarTodos()">
                    {{ convitesFiltrados().length }} {{ convitesFiltrados().length === 1 ? 'convite' : 'convites' }}
                  </app-expandir-todos>
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
    </app-pagina-publica>
  `,
  styles: `
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
  /** Sem sessão do link: pede o código enviado ao e-mail do cliente (SPEC-063). */
  protected readonly pedeCodigo = signal(false);
  protected token = '';
  private readonly dataPipe = new GdDataPipe();
  private readonly aberta = computed(() => (this.carregando() || this.indisponivel() || this.pedeCodigo() ? null : this.dados()));
  protected readonly titulo = computed(() => this.aberta()?.evento);
  protected readonly subtitulo = computed(() => {
    const d = this.aberta();
    return d?.data ? this.dataPipe.transform(d.data) : undefined;
  });

  ngOnInit(): void {
    this.token = this.rota.snapshot.paramMap.get('token') ?? '';
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.cliente.obter(this.token).subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.pedeCodigo.set(false);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        if (sessaoVencida(erro)) this.pedeCodigo.set(true);
        else this.indisponivel.set(true);
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

  /** Fila de importações (SPEC-059 §6.6); ao fechar depois de uma importação concluída, recarrega a lista. */
  protected abrirImportacoes(): void {
    const dados: ImportacoesDados = {
      listar: () => this.cliente.importacoes(this.token),
      enviar: (arquivo) => this.cliente.importar(this.token, arquivo),
      baixar: () => this.cliente.planilha(this.token),
    };
    this.dialog.open(ImportacoesDialog, { ...DIALOG, data: dados }).afterClosed().subscribe((importou?: boolean) => {
      if (importou) this.cliente.obter(this.token).subscribe((leitura) => this.dados.set(leitura));
    });
  }

  protected readonly todosAbertos = computed(() => {
    const convites = this.convitesFiltrados();
    return convites.length > 0 && convites.every((convite) => this.abertos().has(convite.id));
  });

  protected alternarTodos(): void {
    this.abertos.set(this.todosAbertos() ? new Set() : new Set(this.convitesFiltrados().map((convite) => convite.id)));
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
    this.dialog.open(ConfirmaDialog, { ...DIALOG_PEQUENO, data: { titulo, texto, confirmar, destrutivo: ['Excluir', 'Remover'].includes(confirmar) } }).afterClosed().subscribe((ok) => {
      if (ok) acao();
    });
  }

  private aplicar(chamada: Observable<PaginaClienteLeitura>, sucesso: string): void {
    chamada.subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.toast.sucesso(sucesso);
      },
      error: (erro: unknown) => {
        if (sessaoVencida(erro)) {
          this.dados.set(null);
          this.pedeCodigo.set(true);
          return;
        }
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

/** 401 nas rotas do link = sessão vencida ou ausente (SPEC-063 §11): volta para o pedido de código. */
function sessaoVencida(erro: unknown): boolean {
  return erro instanceof HttpErrorResponse && erro.status === 401;
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
