import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { CompromissoAgenda, EventoDetalhe, Local, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Dados do modal de compromisso: o item em edição ou a data já escolhida no calendário. */
export interface CompromissoDialogDados {
  item?: CompromissoAgenda;
  data?: string;
}

@Component({
  selector: 'app-compromisso-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, CampoDataComponent],
  template: `
    <h2 mat-dialog-title>{{ item ? 'Editar compromisso' : 'Novo compromisso' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Reunião, visita, prova ou qualquer marcação da sua agenda.</p>
    <mat-dialog-content>
      <form id="compromisso-form" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="campo sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Descrição'" matInput formControlName="descricao" maxlength="200" />
        </mat-form-field>
        </div>
        <app-campo-data formControlName="data" rotulo="Data" />
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Hora</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Hora'" matInput type="time" formControlName="hora" />
          <mat-hint>Opcional</mat-hint>
        </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="submit" form="compromisso-form" [disabled]="salvando()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class CompromissoDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly dados = inject<CompromissoDialogDados | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly ref = inject(MatDialogRef<CompromissoDialog, boolean>);
  protected readonly item = this.dados?.item ?? null;
  protected readonly salvando = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    descricao: [this.item?.descricao ?? '', Validators.required],
    data: this.fb.control<Date | null>(deIsoParaData(this.item?.data ?? this.dados?.data), Validators.required),
    hora: [this.item?.hora?.slice(0, 5) ?? ''],
  });

  protected salvar(): void {
    if (this.form.invalid || !this.form.getRawValue().descricao.trim()) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe descrição e data.');
      return;
    }
    const valor = this.form.getRawValue();
    const pedido = { descricao: valor.descricao.trim(), data: deDataParaIso(valor.data)!, hora: valor.hora || null };
    const req = this.item
      ? this.negocio.atualizarCompromisso(this.item.id, pedido)
      : this.negocio.criarCompromisso(pedido);
    this.salvando.set(true);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Compromisso salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

export type AcaoResumo = 'editar' | 'excluir' | undefined;

/** Resumo do item clicado no calendário: evento da conta ou compromisso avulso. */
@Component({
  selector: 'app-resumo-agenda-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, GdDataPipe],
  template: `
    @if (item.deEvento) {
      <h2 mat-dialog-title>{{ evento()?.nome ?? item.descricao }}</h2>
      <p class="text-muted text-sm px-6 -mt-2 mb-4">Evento{{ evento()?.tipo ? ' · ' + evento()!.tipo : '' }}</p>
      <mat-dialog-content>
        @if (carregando()) {
          <p class="text-muted">Carregando…</p>
        } @else if (evento(); as e) {
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 m-0 [&_dt]:text-xs [&_dt]:font-semibold [&_dt]:text-muted [&_dd]:m-0 [&_dd]:mt-0.5">
            <div><dt>Data</dt><dd>{{ e.data | gdData }}{{ e.hora ? ' às ' + e.hora.slice(0, 5) : '' }}</dd></div>
            <div><dt>Situação</dt><dd>{{ e.situacao }}{{ e.diasRestantes !== null && e.diasRestantes >= 0 ? ' · faltam ' + e.diasRestantes + ' dias' : '' }}</dd></div>
            <div><dt>Cerimônia</dt><dd>{{ local(e.cerimonia) }}</dd></div>
            <div><dt>Recepção</dt><dd>{{ local(e.recepcao) }}</dd></div>
            <div><dt>Convidados</dt><dd>{{ e.convidadosConfirmados }} confirmados de {{ e.convidados }}</dd></div>
            <div><dt>Tarefas</dt><dd>{{ e.tarefasConcluidas }} feitas de {{ e.tarefas }}</dd></div>
          </dl>
        } @else {
          <p class="text-muted">Não foi possível carregar o evento.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
        <button mat-flat-button type="button" (click)="abrirEvento()">Abrir evento</button>
      </mat-dialog-actions>
    } @else {
      <h2 mat-dialog-title>{{ item.descricao }}</h2>
      <p class="text-muted text-sm px-6 -mt-2 mb-4">Compromisso</p>
      <mat-dialog-content>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 m-0 [&_dt]:text-xs [&_dt]:font-semibold [&_dt]:text-muted [&_dd]:m-0 [&_dd]:mt-0.5">
          <div><dt>Data</dt><dd>{{ item.data | gdData }}</dd></div>
          <div><dt>Hora</dt><dd>{{ item.hora ? item.hora.slice(0, 5) : 'Sem hora' }}</dd></div>
        </dl>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button class="text-error" type="button" (click)="ref.close('excluir')">Excluir</button>
        <span class="flex-1 min-w-0"></span>
        <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
        <button mat-flat-button type="button" (click)="ref.close('editar')">Editar</button>
      </mat-dialog-actions>
    }
  `,
})
export class ResumoAgendaDialog implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly router = inject(Router);
  protected readonly item = inject<CompromissoAgenda>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ResumoAgendaDialog, AcaoResumo>);
  protected readonly evento = signal<EventoDetalhe | null>(null);
  protected readonly carregando = signal(false);

  ngOnInit(): void {
    if (!this.item.deEvento || !this.item.eventoId) return;
    this.carregando.set(true);
    this.negocio.evento(this.item.eventoId).subscribe({
      next: (e) => {
        this.evento.set(e);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected local(l: Local | null | undefined): string {
    if (!l) return '—';
    const partes = [l.nome, l.cidade].filter((p) => !!p);
    return partes.length ? partes.join(' · ') : '—';
  }

  protected abrirEvento(): void {
    this.ref.close();
    void this.router.navigate(['/eventos', this.item.eventoId]);
  }
}

type Vista = 'mes' | 'semana' | 'dia' | 'lista';

interface DiaCalendario {
  iso: string;
  numero: number;
  doMes: boolean;
  hoje: boolean;
  itens: CompromissoAgenda[];
}

const MAX_NO_DIA = 3;

@Component({
  selector: 'app-agenda',
  imports: [MatCardModule, MatButtonModule, MatButtonToggleModule, MatIconModule, GdDataPipe, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Minha agenda</mat-card-title>
        <mat-card-subtitle>Eventos, compromissos e tarefas da conta.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="novo()"><mat-icon>add</mat-icon> Novo compromisso</button>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-2">
          <button mat-icon-button type="button" aria-label="Período anterior" matTooltip="Período anterior" (click)="navegar(-1)"><mat-icon>chevron_left</mat-icon></button>
          <h4 class="text-lg font-semibold min-w-40 text-center first-letter:uppercase">{{ rotuloPeriodo() }}</h4>
          <button mat-icon-button type="button" aria-label="Próximo período" matTooltip="Próximo período" (click)="navegar(1)"><mat-icon>chevron_right</mat-icon></button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button mat-stroked-button type="button" (click)="hoje()">Hoje</button>
          <mat-button-toggle-group [value]="vista()" (change)="mudarVista($event.value)" aria-label="Vista da agenda">
            <mat-button-toggle value="mes">Mês</mat-button-toggle>
            <mat-button-toggle value="semana">Semana</mat-button-toggle>
            <mat-button-toggle value="dia">Dia</mat-button-toggle>
            <mat-button-toggle value="lista">Lista</mat-button-toggle>
          </mat-button-toggle-group>
        </div>
      </div>

      @if (vista() === 'mes') {
        <div class="calendario" role="grid" [attr.aria-label]="rotuloPeriodo()">
          @for (nome of diasDaSemana; track nome) {
            <div class="calendario-cabeca" role="columnheader">{{ nome }}</div>
          }
          @for (dia of grade(); track dia.iso) {
            <div class="calendario-dia" role="gridcell" [class.fora]="!dia.doMes" [class.hoje]="dia.hoje">
              <div class="calendario-dia-topo">
                <span class="calendario-numero">{{ dia.numero }}</span>
                <button
                  type="button"
                  class="calendario-mais"
                  [attr.aria-label]="'Novo compromisso em ' + (dia.iso | gdData)"
                  (click)="novo(dia.iso)"
                >
                  <mat-icon>add</mat-icon>
                </button>
              </div>
              @for (item of dia.itens.slice(0, maxNoDia); track item.id) {
                <button
                  type="button"
                  class="calendario-item"
                  [class.evento]="item.deEvento"
                  [class.tarefa]="item.origem !== 'compromisso'"
                  [class.concluida]="item.concluida"
                  [title]="item.contexto ? item.descricao + ' · ' + item.contexto : item.descricao"
                  (click)="resumo(item)"
                >
                  @if (item.hora) {
                    <span class="calendario-hora">{{ item.hora.slice(0, 5) }}</span>
                  }
                  @if (item.origem !== 'compromisso') {
                    <mat-icon class="calendario-hora !w-3 !h-3 !text-[12px] align-middle">{{ item.concluida ? 'check_circle' : 'task_alt' }}</mat-icon>
                  }
                  {{ item.descricao }}
                </button>
              }
              @if (dia.itens.length > maxNoDia) {
                <button type="button" class="calendario-resto" (click)="verDia(dia.iso)">
                  + {{ dia.itens.length - maxNoDia }} mais
                </button>
              }
            </div>
          }
        </div>
        <div class="calendario-legenda flex flex-wrap gap-4 mt-4 text-sm text-muted">
          <span class="inline-flex items-center gap-2"><i class="evento"></i> Evento</span>
          <span class="inline-flex items-center gap-2"><i></i> Compromisso</span>
          <span class="inline-flex items-center gap-2"><i class="tarefa"></i> Tarefa</span>
        </div>
      } @else if (itens().length === 0) {
        <p class="text-center text-muted py-10">Nada marcado neste período.</p>
      } @else {
        <ul class="list-none p-0 m-0 divide-y divide-border [&>li]:flex [&>li]:items-center [&>li]:gap-3 [&>li]:py-3">
          @for (item of ordenados(); track item.id) {
            <li>
              <button type="button" class="flex w-full items-center gap-3 text-left border-0 bg-transparent p-0 cursor-pointer text-inherit" (click)="resumo(item)">
                <span
                  class="agenda-etiqueta inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap"
                  [class.tarefa]="item.origem !== 'compromisso'"
                  [class.evento]="item.deEvento"
                >
                  {{ item.origem !== 'compromisso' ? (item.concluida ? 'Tarefa feita' : 'Tarefa') : item.deEvento ? 'Evento' : 'Compromisso' }}
                </span>
                <span class="flex-1 min-w-0">
                  <strong [class.line-through]="item.concluida">{{ item.descricao }}</strong>
                  <span class="block text-xs text-muted">{{ item.data | gdData }}{{ item.hora ? ' · ' + item.hora.slice(0, 5) : '' }}{{ item.contexto ? ' · ' + item.contexto : '' }}</span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </mat-card-content>
    </mat-card>
  `,
})
export class AgendaPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  protected readonly maxNoDia = MAX_NO_DIA;
  protected readonly vista = signal<Vista>('mes');
  protected readonly ancora = signal(new Date());
  protected readonly itens = signal<CompromissoAgenda[]>([]);
  protected readonly periodo = computed(() => calcularPeriodo(this.vista(), this.ancora()));
  protected readonly rotuloPeriodo = computed(() => this.periodo().rotulo);
  protected readonly ordenados = computed(() => [...this.itens()].sort(compararItens));
  protected readonly grade = computed(() => montarGrade(this.ancora(), this.ordenados()));

  ngOnInit(): void {
    this.carregar();
  }

  protected mudarVista(valor: Vista): void {
    this.vista.set(valor);
    this.carregar();
  }

  protected navegar(delta: number): void {
    const proxima = new Date(this.ancora());
    if (this.vista() === 'mes' || this.vista() === 'lista') {
      proxima.setDate(1);
      proxima.setMonth(proxima.getMonth() + delta);
    } else if (this.vista() === 'semana') proxima.setDate(proxima.getDate() + delta * 7);
    else proxima.setDate(proxima.getDate() + delta);
    this.ancora.set(proxima);
    this.carregar();
  }

  protected hoje(): void {
    this.ancora.set(new Date());
    this.carregar();
  }

  protected verDia(iso: string): void {
    this.ancora.set(deIsoParaData(iso)!);
    this.vista.set('dia');
    this.carregar();
  }

  protected novo(data?: string): void {
    this.abrirFormulario({ data });
  }

  protected resumo(item: CompromissoAgenda): void {
    if (item.origem === 'tarefa') {
      void this.router.navigate(['/eventos', item.eventoId]);
      return;
    }
    if (item.origem === 'tarefaFunil') {
      void this.router.navigate(['/tarefas-funil']);
      return;
    }
    this.dialog
      .open<ResumoAgendaDialog, CompromissoAgenda, AcaoResumo>(ResumoAgendaDialog, { ...DIALOG, data: item })
      .afterClosed()
      .subscribe((acao) => {
        if (acao === 'editar') this.abrirFormulario({ item });
        if (acao === 'excluir') this.excluir(item);
      });
  }

  private abrirFormulario(dados: CompromissoDialogDados): void {
    this.dialog
      .open(CompromissoDialog, { ...DIALOG, data: dados })
      .afterClosed()
      .subscribe((ok) => ok && this.carregar());
  }

  private excluir(item: CompromissoAgenda): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir compromisso', texto: `Confirma a exclusão de "${item.descricao}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.negocio.excluirCompromisso(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Compromisso excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    const { de, ate } = this.periodo();
    this.negocio.agenda(de, ate).subscribe({
      next: (lista) => this.itens.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

function compararItens(a: CompromissoAgenda, b: CompromissoAgenda): number {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;
  if (a.deEvento !== b.deEvento) return a.deEvento ? -1 : 1;
  const ta = a.origem !== 'compromisso';
  const tb = b.origem !== 'compromisso';
  if (ta !== tb) return ta ? 1 : -1;
  return (a.hora ?? '99').localeCompare(b.hora ?? '99');
}

/** Semanas completas (domingo a sábado) que cobrem o mês da âncora. */
function limitesGrade(ancora: Date): { inicio: Date; fim: Date } {
  const primeiro = new Date(ancora.getFullYear(), ancora.getMonth(), 1);
  const ultimo = new Date(ancora.getFullYear(), ancora.getMonth() + 1, 0);
  const inicio = new Date(primeiro);
  inicio.setDate(primeiro.getDate() - primeiro.getDay());
  const fim = new Date(ultimo);
  fim.setDate(ultimo.getDate() + (6 - ultimo.getDay()));
  return { inicio, fim };
}

function montarGrade(ancora: Date, itens: CompromissoAgenda[]): DiaCalendario[] {
  const { inicio, fim } = limitesGrade(ancora);
  const hojeIso = deDataParaIso(new Date());
  const porDia = new Map<string, CompromissoAgenda[]>();
  for (const item of itens) {
    const chave = item.data.slice(0, 10);
    porDia.set(chave, [...(porDia.get(chave) ?? []), item]);
  }
  const dias: DiaCalendario[] = [];
  for (const d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const iso = deDataParaIso(d)!;
    dias.push({
      iso,
      numero: d.getDate(),
      doMes: d.getMonth() === ancora.getMonth(),
      hoje: iso === hojeIso,
      itens: porDia.get(iso) ?? [],
    });
  }
  return dias;
}

function calcularPeriodo(vista: Vista, ancora: Date): { de: string; ate: string; rotulo: string } {
  if (vista === 'dia') {
    const iso = deDataParaIso(ancora)!;
    return {
      de: iso,
      ate: iso,
      rotulo: ancora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    };
  }
  if (vista === 'semana') {
    const inicio = new Date(ancora);
    inicio.setDate(ancora.getDate() - ancora.getDay());
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    const curto = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return { de: deDataParaIso(inicio)!, ate: deDataParaIso(fim)!, rotulo: `${curto(inicio)} a ${curto(fim)}` };
  }
  const rotulo = capitalizar(ancora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  if (vista === 'lista') {
    const inicio = new Date(ancora.getFullYear(), ancora.getMonth(), 1);
    const fim = new Date(ancora.getFullYear(), ancora.getMonth() + 1, 0);
    return { de: deDataParaIso(inicio)!, ate: deDataParaIso(fim)!, rotulo };
  }
  const { inicio, fim } = limitesGrade(ancora);
  return { de: deDataParaIso(inicio)!, ate: deDataParaIso(fim)!, rotulo };
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
