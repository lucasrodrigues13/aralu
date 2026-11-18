import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
    <p class="gd-dialog-descricao">Reunião, visita, prova ou qualquer marcação da sua agenda.</p>
    <mat-dialog-content>
      <form id="compromisso-form" class="gd-campos duas" [formGroup]="form" (ngSubmit)="salvar()">
        <mat-form-field class="inteiro">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="descricao" maxlength="200" />
        </mat-form-field>
        <app-campo-data formControlName="data" rotulo="Data" />
        <mat-form-field>
          <mat-label>Hora</mat-label>
          <input matInput type="time" formControlName="hora" />
          <mat-hint>Opcional</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button class="gd-secundario" type="button" mat-dialog-close>Cancelar</button>
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
      <p class="gd-dialog-descricao">Evento{{ evento()?.tipo ? ' · ' + evento()!.tipo : '' }}</p>
      <mat-dialog-content>
        @if (carregando()) {
          <p class="gd-apoio">Carregando…</p>
        } @else if (evento(); as e) {
          <dl class="gd-resumo">
            <div><dt>Data</dt><dd>{{ e.data | gdData }}{{ e.hora ? ' às ' + e.hora.slice(0, 5) : '' }}</dd></div>
            <div><dt>Situação</dt><dd>{{ e.situacao }}{{ e.diasRestantes !== null && e.diasRestantes >= 0 ? ' · faltam ' + e.diasRestantes + ' dias' : '' }}</dd></div>
            <div><dt>Cerimônia</dt><dd>{{ local(e.cerimonia) }}</dd></div>
            <div><dt>Recepção</dt><dd>{{ local(e.recepcao) }}</dd></div>
            <div><dt>Convidados</dt><dd>{{ e.convidadosConfirmados }} confirmados de {{ e.convidados }}</dd></div>
            <div><dt>Tarefas</dt><dd>{{ e.tarefasConcluidas }} feitas de {{ e.tarefas }}</dd></div>
          </dl>
        } @else {
          <p class="gd-apoio">Não foi possível carregar o evento.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button class="gd-secundario" type="button" mat-dialog-close>Fechar</button>
        <button mat-flat-button type="button" (click)="abrirEvento()">Abrir evento</button>
      </mat-dialog-actions>
    } @else {
      <h2 mat-dialog-title>{{ item.descricao }}</h2>
      <p class="gd-dialog-descricao">Compromisso</p>
      <mat-dialog-content>
        <dl class="gd-resumo">
          <div><dt>Data</dt><dd>{{ item.data | gdData }}</dd></div>
          <div><dt>Hora</dt><dd>{{ item.hora ? item.hora.slice(0, 5) : 'Sem hora' }}</dd></div>
        </dl>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button class="gd-perigo" type="button" (click)="ref.close('excluir')">Excluir</button>
        <span class="gd-crescer"></span>
        <button mat-button class="gd-secundario" type="button" mat-dialog-close>Fechar</button>
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
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule, GdDataPipe],
  template: `
    <header class="gd-cabecalho">
      <div>
        <h1>Minha agenda</h1>
        <p>Eventos e compromissos da conta.</p>
      </div>
      <button mat-flat-button type="button" (click)="novo()"><mat-icon>add</mat-icon> Novo compromisso</button>
    </header>
    <section class="gd-painel">
      <div class="gd-calendario-topo">
        <div class="gd-calendario-nav">
          <button mat-icon-button type="button" aria-label="Período anterior" (click)="navegar(-1)"><mat-icon>chevron_left</mat-icon></button>
          <h2>{{ rotuloPeriodo() }}</h2>
          <button mat-icon-button type="button" aria-label="Próximo período" (click)="navegar(1)"><mat-icon>chevron_right</mat-icon></button>
        </div>
        <div class="gd-calendario-nav">
          <button mat-button class="gd-secundario gd-pequeno" type="button" (click)="hoje()">Hoje</button>
          <mat-button-toggle-group [value]="vista()" (change)="mudarVista($event.value)" aria-label="Vista da agenda">
            <mat-button-toggle value="mes">Mês</mat-button-toggle>
            <mat-button-toggle value="semana">Semana</mat-button-toggle>
            <mat-button-toggle value="dia">Dia</mat-button-toggle>
            <mat-button-toggle value="lista">Lista</mat-button-toggle>
          </mat-button-toggle-group>
        </div>
      </div>

      @if (vista() === 'mes') {
        <div class="gd-calendario" role="grid" [attr.aria-label]="rotuloPeriodo()">
          @for (nome of diasDaSemana; track nome) {
            <div class="gd-calendario-cabeca" role="columnheader">{{ nome }}</div>
          }
          @for (dia of grade(); track dia.iso) {
            <div class="gd-calendario-dia" role="gridcell" [class.fora]="!dia.doMes" [class.hoje]="dia.hoje">
              <div class="gd-calendario-dia-topo">
                <span class="gd-calendario-numero">{{ dia.numero }}</span>
                <button
                  type="button"
                  class="gd-calendario-mais"
                  [attr.aria-label]="'Novo compromisso em ' + (dia.iso | gdData)"
                  (click)="novo(dia.iso)"
                >
                  <mat-icon>add</mat-icon>
                </button>
              </div>
              @for (item of dia.itens.slice(0, maxNoDia); track item.id) {
                <button
                  type="button"
                  class="gd-calendario-item"
                  [class.evento]="item.deEvento"
                  [title]="item.descricao"
                  (click)="resumo(item)"
                >
                  @if (item.hora) {
                    <span class="gd-calendario-hora">{{ item.hora.slice(0, 5) }}</span>
                  }
                  {{ item.descricao }}
                </button>
              }
              @if (dia.itens.length > maxNoDia) {
                <button type="button" class="gd-calendario-resto" (click)="verDia(dia.iso)">
                  + {{ dia.itens.length - maxNoDia }} mais
                </button>
              }
            </div>
          }
        </div>
        <div class="gd-calendario-legenda">
          <span><i class="evento"></i> Evento</span>
          <span><i></i> Compromisso</span>
        </div>
      } @else if (itens().length === 0) {
        <p class="gd-vazio">Nada marcado neste período.</p>
      } @else {
        <ul class="gd-lista">
          @for (item of ordenados(); track item.id) {
            <li>
              <button type="button" class="gd-agenda-linha" (click)="resumo(item)">
                <span class="gd-status" [class.ok]="item.deEvento" [class.info]="!item.deEvento">
                  {{ item.deEvento ? 'Evento' : 'Compromisso' }}
                </span>
                <span class="gd-crescer">
                  <strong>{{ item.descricao }}</strong>
                  <span class="gd-sub">{{ item.data | gdData }}{{ item.hora ? ' · ' + item.hora.slice(0, 5) : '' }}</span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .gd-agenda-linha {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .gd-agenda-linha .gd-crescer { display: flex; flex-direction: column; }
  `,
})
export class AgendaPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
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
