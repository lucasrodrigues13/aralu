import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { MascaraDirective } from '../../shared/mascara.directive';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { Convite, ListaConvites, NegocioClient, PresencaEvento } from '../../core/negocio.client';
import { ConviteDoFormulario, PedidoConvite } from '../../core/convite-formulario';
import { ConviteFormDados, ConviteFormDialog } from '../../shared/convite-form.dialog';
import { dadosPreenchidos, resumoDosConvidados } from '../../shared/convite-lista';
import { PlanilhaInstrucoesDialog } from './planilha-instrucoes.dialog';
import { EventoAbasComponent } from '../eventos/evento-abas.component';
import { MatTooltipModule } from '@angular/material/tooltip';

const SITUACOES = [
  { valor: 'Pendente', rotulo: 'Pendente', titulo: 'Pendentes', icone: 'schedule', cor: 'warning' },
  { valor: 'Confirmado', rotulo: 'Confirmado', titulo: 'Confirmados', icone: 'check_circle', cor: 'success' },
  { valor: 'NaoComparecera', rotulo: 'Não comparecerá', titulo: 'Não confirmados', icone: 'cancel', cor: 'error' },
];

/** Três cards fixos; situação sem convidados aparece com 0. */
export function cardsPorSituacao(porSituacao: { rotulo: string; quantidade: number }[]) {
  const porRotulo = new Map(porSituacao.map((item) => [item.rotulo, item.quantidade]));
  return SITUACOES.map((item) => ({ ...item, quantidade: porRotulo.get(item.rotulo) ?? 0 }));
}

@Component({
  selector: 'app-convidados',
  imports: [MatCardModule, MatButtonToggleModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, EventoAbasComponent, MatSelectModule, MatCheckboxModule, MatIconModule, MatDialogModule, MascaraDirective, GdDataPipe, DatePipe, MatTooltipModule],
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

      @if (lista()) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          @for (item of cards(); track item.valor) {
            <button type="button" class="card-situacao text-start p-0 border-0 bg-transparent cursor-pointer" [attr.aria-label]="item.titulo" [attr.aria-pressed]="filtro.controls.situacao.value === item.valor" (click)="filtrarPorSituacao(item.valor)">
              <mat-card class="shadow-none text-center mb-0! h-full {{ 'bg-light-' + item.cor }}" [class.ring-2]="filtro.controls.situacao.value === item.valor">
                <mat-card-content>
                  <mat-icon class="{{ 'text-' + item.cor }}">{{ item.icone }}</mat-icon>
                  <h4 class="text-sm font-semibold mt-2! {{ 'text-' + item.cor }}">{{ item.titulo }}</h4>
                  <h6 class="text-xl font-semibold mt-2! {{ 'text-' + item.cor }}">{{ item.quantidade }}</h6>
                </mat-card-content>
              </mat-card>
            </button>
          }
        </div>
      }

      <mat-card class="cardWithShadow">
        <div class="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <mat-card-title class="mb-0">Convites e convidados</mat-card-title>
            <mat-card-subtitle>Lista do evento e o RSVP de cada convite.</mat-card-subtitle>
            <p class="text-sm text-muted mt-1 mb-0" data-teste="prazo-rsvp">
              @if (lista()?.prazoRsvp; as prazo) {
                Confirmar presença até {{ prazo | gdData }}@if (lista()?.prazoEncerrado) { · <strong>Prazo encerrado</strong> }
              } @else {
                Sem prazo para confirmar presença.
              }
            </p>
            <p class="text-sm text-muted mt-1 mb-0" data-teste="envio-convites">
              @if (lista()?.dataEnvioConvites; as envio) {
                Envio dos convites em {{ envio | gdData }}
              } @else {
                Data de envio dos convites não definida.
              }
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button mat-stroked-button type="button" (click)="abrirEnvio()"><mat-icon>send</mat-icon> Data de envio</button>
            <button mat-stroked-button type="button" (click)="abrirPrazo()"><mat-icon>event_busy</mat-icon> Prazo de confirmação</button>
            <button mat-stroked-button type="button" (click)="abrirPresencas()"><mat-icon>fact_check</mat-icon> Lista de presença</button>
            <button mat-stroked-button type="button" (click)="abrirPlanilha()"><mat-icon>description</mat-icon> Planilha padrão</button>
            <button mat-stroked-button type="button" (click)="arquivo.click()"><mat-icon>upload</mat-icon> Importar</button>
            <input #arquivo type="file" accept=".xlsx,.xls" hidden (change)="importar($event)" />
            <button mat-flat-button type="button" (click)="abrirConvite()"><mat-icon>add</mat-icon> Novo convite</button>
          </div>
        </div>
        <mat-card-content class="border-t border-border">
        <mat-button-toggle-group [value]="visao()" (change)="visao.set($event.value)" aria-label="Visão da lista" class="mb-6">
          <mat-button-toggle value="convite">Por convite</mat-button-toggle>
          <mat-button-toggle value="convidado">Por convidado</mat-button-toggle>
        </mat-button-toggle-group>
        <form class="flex flex-wrap items-end gap-4 mb-6" [formGroup]="filtro" (ngSubmit)="carregar()">
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Convite</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput formControlName="nome" aria-label="Convite" placeholder="Ex.: Família Souza" />
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-44">
            <mat-label class="font-semibold mb-2 block">Situação</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select formControlName="situacao" aria-label="Situação">
                <mat-option value="">Todas</mat-option>
                <mat-option value="Pendente">Pendente</mat-option>
                <mat-option value="Confirmado">Confirmado</mat-option>
                <mat-option value="NaoComparecera">Não comparecerá</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-44">
            <mat-label class="font-semibold mb-2 block">Telefone</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <input matInput formControlName="telefone" gdMascara="celular" aria-label="Telefone" placeholder="(11) 90000-0000" />
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-44">
            <mat-label class="font-semibold mb-2 block">Observação</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <input matInput formControlName="observacao" aria-label="Observação" placeholder="Ex.: vegetariano" />
            </mat-form-field>
          </div>
          <mat-checkbox formControlName="somenteConfirmados" class="mb-1">Só confirmados</mat-checkbox>
          <button mat-flat-button type="submit">Filtrar</button>
        </form>

        @if (lista(); as dados) {
          @if (dados.convites.length === 0) {
            <div class="flex flex-col items-center gap-2 text-center text-muted py-10">
              <mat-icon>mail</mat-icon>
              <strong>Nenhum convite</strong>
              Crie o primeiro convite ou importe a planilha.
            </div>
          } @else if (visao() === 'convite') {
            <div class="relative overflow-auto">
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
            <div class="relative overflow-auto">
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
      </mat-card-content></mat-card>
    }

    <ng-template #modalEnvio>
      <h2 mat-dialog-title>Data de envio dos convites</h2>
      <p class="text-muted text-sm px-6 -mt-2 mb-4">Uma data só para todos os convites do evento. Deixe vazio se ainda não definiu.</p>
      <mat-dialog-content>
        <form id="envio-form" class="grid grid-cols-1 gap-4" [formGroup]="envioForm" (ngSubmit)="salvarEnvio()">
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Data de envio</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Data de envio'" matInput type="date" formControlName="data" /></mat-form-field>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" form="envio-form">Salvar</button>
      </mat-dialog-actions>
    </ng-template>

    <ng-template #modalPrazo>
      <h2 mat-dialog-title>Prazo de confirmação</h2>
      <p class="text-muted text-sm px-6 -mt-2 mb-4">Depois desta data o link do convite mostra que expirou. Deixe vazio para não ter prazo.</p>
      <mat-dialog-content>
        <form id="prazo-form" class="grid grid-cols-1 gap-4" [formGroup]="prazoForm" (ngSubmit)="salvarPrazo()">
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Data limite</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Data limite'" matInput type="date" formControlName="prazo" /></mat-form-field>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" form="prazo-form">Salvar</button>
      </mat-dialog-actions>
    </ng-template>

    <ng-template #modalPresencas>
      <h2 mat-dialog-title>Lista de presença</h2>
      <mat-dialog-content>
        @if (presencas().length === 0) {
          <p>Ninguém confirmou ainda.</p>
        } @else {
          <table class="w-full text-sm">
            <thead><tr><th class="text-start">Id</th><th class="text-start">Convidado</th><th class="text-start">Convite</th><th class="text-start">Confirmou em</th><th class="text-start">Compareceu</th></tr></thead>
            <tbody>
              @for (item of presencas(); track item.id) {
                <tr>
                  <td class="font-mono text-xs" [attr.title]="item.id">{{ item.id.slice(0, 8) }}</td>
                  <td>{{ item.convidado }}</td>
                  <td>{{ item.convite }}</td>
                  <td>{{ item.confirmadoEm | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ item.compareceuEm ? (item.compareceuEm | date: 'dd/MM/yyyy HH:mm') : "Não" }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-flat-button type="button" mat-dialog-close>Fechar</button>
      </mat-dialog-actions>
    </ng-template>
  `,
  styles: `
    .seta { width: 32px; height: 32px; padding: 4px; flex: none; }
    .seta mat-icon { transition: transform 0.15s; }
    .seta.aberta mat-icon { transform: rotate(90deg); }
    tr.detalhe td { padding-top: 0; }
  `,
})
export class ConvidadosPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<ListaConvites | null>(null);
  protected readonly visao = signal('convite');
  private readonly abertos = signal<ReadonlySet<string>>(new Set());
  protected readonly eventoId = signal('');
  protected readonly cards = computed(() => {
    return cardsPorSituacao(this.lista()?.porSituacao ?? []);
  });
  private readonly dialog = inject(MatDialog);
  protected readonly filtro = this.fb.nonNullable.group({
    nome: '', situacao: '', telefone: '', observacao: '', somenteConfirmados: false,
  });
  protected readonly envioForm = this.fb.nonNullable.group({ data: '' });
  protected readonly prazoForm = this.fb.nonNullable.group({ prazo: '' });
  protected readonly presencas = signal<PresencaEvento[]>([]);
  private readonly modalPrazo = viewChild.required<TemplateRef<unknown>>('modalPrazo');
  private readonly modalPresencas = viewChild.required<TemplateRef<unknown>>('modalPresencas');
  private readonly modalEnvio = viewChild.required<TemplateRef<unknown>>('modalEnvio');
  private refPrazo: MatDialogRef<unknown> | null = null;
  private refEnvio: MatDialogRef<unknown> | null = null;

  ngOnInit(): void {
    const id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.eventoId.set(id);
    const situacao = this.rota.snapshot.queryParamMap.get('situacao');
    if (situacao) this.filtro.patchValue({ situacao });
    if (!id) {
      return;
    }
    this.carregar();
  }

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected carregar(): void {
    const valor = this.filtro.getRawValue();
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

  protected filtrarPorSituacao(valor: string): void {
    const atual = this.filtro.controls.situacao.value;
    this.filtro.controls.situacao.setValue(atual === valor ? '' : valor);
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
    this.prazoForm.reset({ prazo: this.lista()?.prazoRsvp ?? '' });
    this.refPrazo = this.dialog.open(this.modalPrazo(), DIALOG_PEQUENO);
  }

  protected salvarPrazo(): void {
    this.negocio.definirPrazoRsvp(this.eventoId(), this.prazoForm.getRawValue().prazo || null).subscribe({
      next: () => {
        this.refPrazo?.close();
        this.toast.sucesso('Prazo salvo.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected abrirEnvio(): void {
    this.envioForm.reset({ data: this.lista()?.dataEnvioConvites ?? '' });
    this.refEnvio = this.dialog.open(this.modalEnvio(), DIALOG_PEQUENO);
  }

  protected salvarEnvio(): void {
    this.negocio.definirEnvioConvites(this.eventoId(), this.envioForm.getRawValue().data || null).subscribe({
      next: () => {
        this.refEnvio?.close();
        this.toast.sucesso('Data de envio salva.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected abrirPresencas(): void {
    this.negocio.presencas(this.eventoId()).subscribe({
      next: (itens) => {
        this.presencas.set(itens);
        this.dialog.open(this.modalPresencas(), DIALOG);
      },
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
  protected abrirPlanilha(): void {
    this.dialog.open(PlanilhaInstrucoesDialog, { ...DIALOG, data: this.eventoId() });
  }

  /** Convites nascem recolhidos; clicar mostra os convidados (SPEC-059). */
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

  protected importar(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    if (!arquivo) {
      return;
    }
    this.negocio.importar(this.eventoId(), arquivo).subscribe({
      next: () => {
        this.toast.sucesso('Planilha importada.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
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
    convidados: convidados.map((pessoa) => ({ id: pessoa.id, nome: pessoa.nome, ddi: pessoa.ddi, celular: pessoa.celular })),
  };
}
