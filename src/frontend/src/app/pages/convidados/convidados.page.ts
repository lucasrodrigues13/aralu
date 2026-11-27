import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { Convite, ListaConvites, NegocioClient } from '../../core/negocio.client';
import { ConviteDoFormulario, PedidoConvite } from '../../core/convite-formulario';
import { ConviteFormDados, ConviteFormDialog } from '../../shared/convite-form.dialog';
import { dadosPreenchidos, FiltroDeConvites, resumoDosConvidados } from '../../shared/convite-lista';
import { ConvidadosTopoComponent } from '../../shared/convidados-topo.component';
import { DADOS_ENVIO, DADOS_PRAZO, DataConvitesDialog } from '../../shared/data-convites.dialog';
import { PresencasDialog } from '../../shared/presencas.dialog';
import { ImportacoesDados, ImportacoesDialog } from '../../shared/importacoes.dialog';
import { EventoAbasComponent } from '../eventos/evento-abas.component';
import { MatTooltipModule } from '@angular/material/tooltip';

export { cardsPorSituacao } from '../../shared/convite-lista';

@Component({
  selector: 'app-convidados',
  imports: [ExpandirTodosComponent, MatCardModule, MatButtonToggleModule, MatButtonModule, EventoAbasComponent, MatIconModule, MatDialogModule, ConvidadosTopoComponent, MatTooltipModule],
  template: `
    @if (!eventoId()) {
      <mat-card class="cardWithShadow">
        <mat-card-content>
          <mat-card-title>Convidados</mat-card-title>
          <mat-card-subtitle>A lista fica dentro do evento. Abra um evento e use a aba Convidados.</mat-card-subtitle>
        </mat-card-content>
      </mat-card>
    } @else {
      <app-evento-abas [eventoId]="eventoId()" />

      <app-convidados-topo
        [porSituacao]="lista()?.porSituacao ?? []"
        [prazoRsvp]="lista()?.prazoRsvp ?? null"
        [prazoEncerrado]="lista()?.prazoEncerrado ?? false"
        [dataEnvio]="lista()?.dataEnvioConvites ?? null"
        [mostrarObservacao]="true"
        [situacaoInicial]="filtroAtual().situacao"
        (filtrar)="filtrar($event)"
        (novoConvite)="abrirConvite()"
        (envio)="abrirEnvio()"
        (prazo)="abrirPrazo()"
        (presencas)="abrirPresencas()"
        (importar)="abrirImportacoes()">
        <mat-button-toggle-group antesDoFiltro [value]="visao()" (change)="visao.set($event.value)" aria-label="Visão da lista">
          <mat-button-toggle value="convite">Por convite</mat-button-toggle>
          <mat-button-toggle value="convidado">Por convidado</mat-button-toggle>
        </mat-button-toggle-group>
        @if (lista(); as dados) {
          @if (dados.convites.length === 0) {
            <div class="flex flex-col items-center gap-2 text-center text-muted py-10">
              <mat-icon>mail</mat-icon>
              <strong>Nenhum convite</strong>
              Crie o primeiro convite ou importe a planilha.
            </div>
          } @else if (visao() === 'convite') {
            <app-expandir-todos [abertos]="todosAbertos()" (alternar)="alternarTodos()">
              {{ dados.convites.length }} {{ dados.convites.length === 1 ? 'convite' : 'convites' }}
            </app-expandir-todos>
            <div class="relative">
              <table class="tabela">
                <thead>
                  <tr>
                    <th>Convite</th>
                    <th>Telefone</th>
                    <th>Convidados</th>
                    <th class="text-end! whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of dados.convites; track item.id) {
                    <tr>
                      <td>
                        <div class="flex items-start gap-1">
                          <button mat-icon-button type="button" class="seta" [class.aberta]="aberto(item.id)" [attr.aria-expanded]="aberto(item.id)" [attr.aria-controls]="'convidados-' + item.id" [attr.aria-label]="(aberto(item.id) ? 'Recolher' : 'Expandir') + ' convidados de ' + item.nome" [matTooltip]="(aberto(item.id) ? 'Recolher' : 'Expandir') + ' convidados de ' + item.nome" (click)="alternar(item.id)"><mat-icon>chevron_right</mat-icon></button>
                          <div class="min-w-0 pt-2">
                            <strong>{{ item.nome }}</strong>
                            @if (item.email) { <span class="block text-xs text-muted">{{ item.email }}</span> }
                            @if (item.observacao) { <span class="block text-xs text-muted">{{ item.observacao }}</span> }
                            @if (item.excecaoPrazoRsvp) { <span class="block text-xs text-muted">Exceção aberta após o prazo</span> }
                            <span class="block text-xs text-muted">@if (item.acessada) { acessada } @if (item.respondida) { @if (item.acessada) { · } respondida }</span>
                          </div>
                        </div>
                      </td>
                      <td>{{ item.telefone || '—' }}</td>
                      <td class="text-sm">{{ resumo(item.convidados) }}</td>
                      <td class="text-end! whitespace-nowrap">
                        <button mat-icon-button type="button" aria-label="Copiar link de RSVP" matTooltip="Copiar link de RSVP" (click)="copiar(item.token)"><mat-icon>link</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Baixar QR Code" matTooltip="Baixar QR Code" (click)="baixarQr(item.id)"><mat-icon>qr_code_2</mat-icon></button>
                        @if (temConfirmado(item)) {
                          <button mat-icon-button type="button" aria-label="Baixar QR de entrada" matTooltip="Baixar QR de entrada" (click)="baixarQrEntrada(item.id)"><mat-icon>qr_code_scanner</mat-icon></button>
                        }
                        <button mat-icon-button type="button" aria-label="Enviar pelo WhatsApp" matTooltip="Enviar pelo WhatsApp" (click)="whatsapp(item.id)"><mat-icon>chat</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrirEdicao(item)"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="semExclusao('convite')"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                    @if (aberto(item.id)) {
                      <tr class="detalhe">
                        <td colspan="4" [id]="'convidados-' + item.id">
                          <ul class="list-none p-0 m-0 pl-12 grid gap-2">
                            @for (pessoa of item.convidados; track pessoa.id) {
                              <li class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span class="font-semibold">{{ pessoa.nome }}</span>
                                <span [class]="classeSituacao(pessoa.situacaoTela)">{{ pessoa.situacaoTela }}</span>
                                @if (pessoa.principal) { <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light text-muted">Principal</span> }
                                @for (dado of preenchidos(pessoa); track dado) { <span class="text-xs text-muted">{{ dado }}</span> }
                                @if (pessoa.celular && !pessoa.principal) {
                                  <button mat-button type="button" (click)="principal(item.id, pessoa.id)">Usar este telefone</button>
                                }
                                <button mat-icon-button type="button" aria-label="Excluir convidado" matTooltip="Excluir convidado" (click)="excluirConvidado(pessoa.id)"><mat-icon>delete</mat-icon></button>
                              </li>
                            }
                          </ul>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="relative">
              <table class="tabela">
                <thead>
                  <tr><th>Convidado</th><th>Convite</th><th>Situação</th><th>Mesa</th></tr>
                </thead>
                <tbody>
                  @for (item of dados.convites; track item.id) {
                    @for (pessoa of item.convidados; track pessoa.id) {
                      <tr>
                        <td><strong>{{ pessoa.nome }}</strong></td>
                        <td>{{ item.nome }}</td>
                        <td><span [class]="classeSituacao(pessoa.situacaoTela)">{{ pessoa.situacaoTela }}</span></td>
                        <td>{{ pessoa.mesa || '—' }}</td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </app-convidados-topo>
    }

  `,
})
export class ConvidadosPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<ListaConvites | null>(null);
  protected readonly visao = signal('convite');
  private readonly abertos = signal<ReadonlySet<string>>(new Set());
  protected readonly eventoId = signal('');
  private readonly dialog = inject(MatDialog);
  protected readonly filtroAtual = signal<FiltroDeConvites>({ nome: '', situacao: '', telefone: '', observacao: '', somenteConfirmados: false });

  ngOnInit(): void {
    const id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.eventoId.set(id);
    const situacao = this.rota.snapshot.queryParamMap.get('situacao');
    if (situacao) this.filtroAtual.update((filtro) => ({ ...filtro, situacao }));
    if (!id) {
      return;
    }
    this.carregar();
  }

  protected carregar(): void {
    const valor = this.filtroAtual();
    this.negocio.convites(this.eventoId(), {
      nome: valor.nome,
      situacao: valor.situacao,
      telefone: valor.telefone,
      observacao: valor.observacao,
      somenteConfirmados: valor.somenteConfirmados ? 'true' : '',
    }).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected filtrar(filtro: FiltroDeConvites): void {
    this.filtroAtual.set(filtro);
    this.carregar();
  }

  /** Novo convite pelo formulário único (SPEC-059), com a observação livre da organizadora. */
  protected abrirConvite(): void {
    this.abrirFormulario(null).subscribe((pedido) => {
      if (!pedido) return;
      this.negocio.criarConvite(this.eventoId(), pedido).subscribe({
        next: () => this.concluir('Convite criado.'),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  /** Edição pelo mesmo formulário da criação (SPEC-059). */
  protected abrirEdicao(convite: Convite): void {
    this.abrirFormulario(conviteDoFormulario(convite)).subscribe((pedido) => {
      if (!pedido) return;
      this.negocio.atualizarConvite(convite.id, pedido).subscribe({
        next: () => this.concluir('Convite salvo.'),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private abrirFormulario(convite: ConviteDoFormulario | null) {
    const dados: ConviteFormDados = { convite, mostrarObservacao: true };
    return this.dialog.open<ConviteFormDialog, ConviteFormDados, PedidoConvite>(ConviteFormDialog, { ...DIALOG, data: dados }).afterClosed();
  }

  private concluir(mensagem: string): void {
    this.toast.sucesso(mensagem);
    this.carregar();
  }

  protected classeSituacao(situacao: string): string {
    const texto = (situacao ?? '').toLowerCase();
    if (texto.startsWith('confirm')) return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-success text-success';
    if (texto.startsWith('não') || texto.startsWith('nao') || texto.startsWith('cancel')) return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-error text-error';
    return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-warning text-warning';
  }

  protected principal(conviteId: string, convidadoId: string): void {
    this.negocio.definirPrincipal(conviteId, convidadoId).subscribe({
      next: () => {
        this.toast.sucesso('Telefone principal atualizado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected copiar(token: string): void {
    const link = `${location.origin}/rsvp/${token}`;
    void navigator.clipboard.writeText(link);
    this.toast.sucesso('Link copiado.');
  }

  protected temConfirmado(item: Convite): boolean {
    return item.convidados.some((pessoa) => pessoa.situacaoTela === 'Confirmado');
  }

  protected baixarQrEntrada(id: string): void {
    this.negocio.qrEntrada(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entrada.png';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected baixarQr(id: string): void {
    this.negocio.qr(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'convite.png';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected whatsapp(id: string): void {
    this.negocio.whatsapp(id).subscribe({
      next: (resposta) => {
        if (!resposta.url) {
          this.toast.erro('O convite não tem telefone de principal.');
          return;
        }
        window.open(resposta.url, '_blank', 'noopener');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluirConvidado(id: string): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir convidado', texto: 'Confirma a exclusão deste convidado?', confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.removerConvidado(id).subscribe({
        next: () => {
          this.toast.sucesso('Convidado excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected abrirPrazo(): void {
    this.dialog.open(DataConvitesDialog, { ...DIALOG_PEQUENO, data: DADOS_PRAZO(this.lista()?.prazoRsvp ?? null) }).afterClosed()
      .subscribe((resposta?: { data: string | null }) => {
        if (!resposta) return;
        this.negocio.definirPrazoRsvp(this.eventoId(), resposta.data).subscribe({
          next: () => this.concluir('Prazo salvo.'),
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  protected abrirEnvio(): void {
    this.dialog.open(DataConvitesDialog, { ...DIALOG_PEQUENO, data: DADOS_ENVIO(this.lista()?.dataEnvioConvites ?? null) }).afterClosed()
      .subscribe((resposta?: { data: string | null }) => {
        if (!resposta) return;
        this.negocio.definirEnvioConvites(this.eventoId(), resposta.data).subscribe({
          next: () => this.concluir('Data de envio salva.'),
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  protected abrirPresencas(): void {
    this.negocio.presencas(this.eventoId()).subscribe({
      next: (itens) => this.dialog.open(PresencasDialog, { ...DIALOG, data: itens }),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected semExclusao(tipo: string): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir', texto: `Confirma a exclusão deste ${tipo}?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) {
        this.toast.erro('A exclusão ainda não está disponível neste fluxo.');
      }
    });
  }

  /** Instruções de preenchimento com o download do modelo dentro do modal (SPEC-059). */
  /** Convites nascem recolhidos; clicar mostra os convidados (SPEC-059). */
  protected readonly todosAbertos = computed(() => {
    const convites = this.lista()?.convites ?? [];
    return convites.length > 0 && convites.every((convite) => this.abertos().has(convite.id));
  });

  protected alternarTodos(): void {
    this.abertos.set(this.todosAbertos() ? new Set() : new Set((this.lista()?.convites ?? []).map((convite) => convite.id)));
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

  protected resumo(convidados: Convite['convidados']): string {
    return resumoDosConvidados(convidados.map((pessoa) => pessoa.situacaoTela));
  }

  protected preenchidos(pessoa: Convite['convidados'][number]): string[] {
    return dadosPreenchidos(pessoa);
  }

  /** Fila de importações (SPEC-059 §6.6); ao fechar depois de uma importação concluída, recarrega a lista. */
  protected abrirImportacoes(): void {
    const dados: ImportacoesDados = {
      listar: () => this.negocio.importacoes(this.eventoId()),
      enviar: (arquivo) => this.negocio.importar(this.eventoId(), arquivo),
      baixar: () => this.negocio.planilha(this.eventoId()),
    };
    this.dialog.open(ImportacoesDialog, { ...DIALOG, data: dados }).afterClosed().subscribe((importou?: boolean) => {
      if (importou) this.carregar();
    });
  }


}

/** Convite da organizadora no formato do formulário único (SPEC-059); o convidado principal vem primeiro. */
export function conviteDoFormulario(convite: Convite): ConviteDoFormulario {
  const convidados = [...convite.convidados].sort((a, b) => Number(b.principal) - Number(a.principal));
  return {
    nome: convite.nome,
    email: convite.email,
    observacao: convite.observacao,
    excecaoPrazoRsvp: convite.excecaoPrazoRsvp,
    convidados: convidados.map((pessoa) => ({ id: pessoa.id, nome: pessoa.nome, ddi: pessoa.ddi, celular: pessoa.celular, genero: pessoa.genero, faixa: pessoa.faixa, principal: pessoa.principal })),
  };
}
