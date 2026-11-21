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
import { ListaConvites, NegocioClient } from '../../core/negocio.client';
import { EventoAbasComponent } from '../eventos/evento-abas.component';

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
  imports: [MatCardModule, MatButtonToggleModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, EventoAbasComponent, MatSelectModule, MatCheckboxModule, MatIconModule, MatDialogModule, MascaraDirective],
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
          </div>
          <div class="flex flex-wrap gap-2">
            <button mat-stroked-button type="button" (click)="baixarPlanilha()"><mat-icon>download</mat-icon> Planilha padrão</button>
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
                        <strong>{{ item.nome }}</strong>
                        <span class="block text-xs text-muted">@if (item.acessada) { acessada } @if (item.respondida) { @if (item.acessada) { · } respondida }</span>
                      </td>
                      <td>{{ item.telefone || '—' }}</td>
                      <td>
                        <ul class="list-none p-0 m-0 divide-y divide-border [&>li]:flex [&>li]:items-center [&>li]:gap-3 [&>li]:py-3 [&>li]:flex-wrap [&>li]:py-1! divide-y-0!">
                          @for (pessoa of item.convidados; track pessoa.id) {
                            <li>
                              <span>{{ pessoa.nome }}</span>
                              <span [class]="classeSituacao(pessoa.situacaoTela)">{{ pessoa.situacaoTela }}</span>
                              @if (pessoa.principal) { <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light text-muted">Principal</span> }
                              @if (pessoa.celular && !pessoa.principal) {
                                <button mat-button type="button" (click)="principal(item.id, pessoa.id)">Usar este telefone</button>
                              }
                              <button mat-icon-button type="button" aria-label="Excluir convidado" (click)="excluirConvidado(pessoa.id)"><mat-icon>delete</mat-icon></button>
                            </li>
                          }
                        </ul>
                      </td>
                      <td class="text-end! whitespace-nowrap">
                        <button mat-icon-button type="button" aria-label="Copiar link de RSVP" (click)="copiar(item.token)"><mat-icon>link</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Baixar QR Code" (click)="baixarQr(item.id)"><mat-icon>qr_code_2</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Enviar pelo WhatsApp" (click)="whatsapp(item.id)"><mat-icon>chat</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Editar" (click)="semEdicao()"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Excluir" (click)="semExclusao('convite')"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
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

    <ng-template #modalConvite>
      <h2 mat-dialog-title>Novo convite</h2>
      <p class="text-muted text-sm px-6 -mt-2 mb-4">O convite reúne a família; o telefone fica no convite.</p>
      <mat-dialog-content>
        <form id="convite-form" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="convite" (ngSubmit)="criarConvite()">
          <div class="campo sm:col-span-2">
            <mat-label class="font-semibold mb-2 block">Nome do convite</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome do convite'" matInput formControlName="nome" placeholder="Ex.: Joana e família" /></mat-form-field>
          </div>
          <div class="campo sm:col-span-2">
            <mat-label class="font-semibold mb-2 block">Observação</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Observação'" matInput formControlName="observacao" /></mat-form-field>
          </div>
          <div class="campo sm:col-span-2">
            <mat-label class="font-semibold mb-2 block">Nome do convidado</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome do convidado'" matInput formControlName="convidado" /></mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">DDI</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'DDI'" matInput formControlName="ddi" /></mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Celular</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Celular'" matInput formControlName="celular" gdMascara="celular" /></mat-form-field>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" form="convite-form">Salvar convite</button>
      </mat-dialog-actions>
    </ng-template>
  `,
})
export class ConvidadosPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<ListaConvites | null>(null);
  protected readonly visao = signal('convite');
  protected readonly eventoId = signal('');
  protected readonly cards = computed(() => {
    return cardsPorSituacao(this.lista()?.porSituacao ?? []);
  });
  private readonly modalConvite = viewChild.required<TemplateRef<unknown>>('modalConvite');
  private refConvite: MatDialogRef<unknown> | null = null;
  private readonly dialog = inject(MatDialog);
  protected readonly filtro = this.fb.nonNullable.group({
    nome: '', situacao: '', telefone: '', observacao: '', somenteConfirmados: false,
  });
  protected readonly convite = this.fb.nonNullable.group({
    nome: '', observacao: '', convidado: '', ddi: '+55', celular: '',
  });

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

  protected abrirConvite(): void {
    this.convite.reset({ ddi: '+55' });
    this.refConvite = this.dialog.open(this.modalConvite(), DIALOG);
  }

  protected classeSituacao(situacao: string): string {
    const texto = (situacao ?? '').toLowerCase();
    if (texto.startsWith('confirm')) return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-success text-success';
    if (texto.startsWith('não') || texto.startsWith('nao') || texto.startsWith('cancel')) return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-error text-error';
    return 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-warning text-warning';
  }

  protected criarConvite(): void {
    const valor = this.convite.getRawValue();
    this.negocio.criarConvite(this.eventoId(), {
      nome: valor.nome,
      observacao: valor.observacao,
      usaTransfer: false,
      localOrigem: '',
      principal: valor.celular ? 0 : null,
      convidados: [{
        nome: valor.convidado,
        ddi: valor.ddi,
        celular: valor.celular,
        situacao: 'Pendente',
      }],
    }).subscribe({
      next: () => {
        this.convite.reset({ ddi: '+55' });
        this.refConvite?.close();
        this.toast.sucesso('Convite criado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
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

  protected semEdicao(): void {
    this.toast.erro('A edição do convite ainda não está disponível neste fluxo.');
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

  protected baixarPlanilha(): void {
    this.negocio.planilha(this.eventoId()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'convidados.xlsx';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
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
