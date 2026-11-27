import { Component, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AssistentesClient } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, Oportunidade, TarefaFunil, TIPOS_TAREFA_FUNIL } from '../../core/negocio.client';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { chaveResponsavel, opcoesResponsavel, OpcaoResponsavel, pedidoResponsavel, rotuloResponsavel } from '../../shared/responsaveis';
import { aplicarLink, aplicarLista, aplicarNegrito, EdicaoTexto, htmlDeTextoSimples } from '../../shared/texto-simples';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FecharModal } from '../../shared/fechar-modal';

@Component({
  selector: 'app-tarefa-funil-dialog',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, CampoDataComponent, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar tarefa' : 'Nova tarefa' }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Título</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Título'" matInput formControlName="titulo" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Oportunidade</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Oportunidade'" formControlName="oportunidadeId">
            @for (o of oportunidades(); track o.id) { <mat-option [value]="o.id">{{ o.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Tipo'" formControlName="tipo">
            @for (t of tipos; track t.valor) { <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Responsáveis</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Responsáveis'" formControlName="responsaveis" multiple required>
              @for (opcao of opcoes(); track opcao.valor) { <mat-option [value]="opcao.valor">{{ opcao.rotulo }}</mat-option> }
            </mat-select>
            @if (form.controls.responsaveis.hasError('required')) { <mat-error>Informe ao menos um responsável.</mat-error> }
          </mat-form-field>
        </div>
        <app-campo-data formControlName="prazo" rotulo="Prazo" />
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Observação</mat-label>
          <div class="flex gap-1 mb-1" role="toolbar" aria-label="Formatação da observação">
            <button mat-icon-button type="button" aria-label="Negrito" matTooltip="Negrito" (click)="formatar('negrito')"><mat-icon>format_bold</mat-icon></button>
            <button mat-icon-button type="button" aria-label="Lista" matTooltip="Lista" (click)="formatar('lista')"><mat-icon>format_list_bulleted</mat-icon></button>
            <button mat-icon-button type="button" aria-label="Link" matTooltip="Link" (click)="formatar('link')"><mat-icon>link</mat-icon></button>
          </div>
          <mat-form-field appearance="outline" class="w-full"><textarea #observacao [attr.aria-label]="'Observação'" matInput rows="4" formControlName="observacao"></textarea></mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class TarefaFunilDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<TarefaFunil | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<TarefaFunilDialog, boolean>);
  protected readonly tipos = TIPOS_TAREFA_FUNIL;
  private readonly assistentes = inject(AssistentesClient);
  private readonly campoObservacao = viewChild<ElementRef<HTMLTextAreaElement>>('observacao');
  protected readonly oportunidades = signal<Oportunidade[]>([]);
  protected readonly opcoes = signal<OpcaoResponsavel[]>(
    opcoesResponsavel([], 'Eu').filter((opcao) => opcao.valor !== 'Cliente'),
  );
  protected readonly form = this.fb.nonNullable.group({
    titulo: [this.dados?.titulo ?? '', Validators.required],
    oportunidadeId: [this.dados?.oportunidadeId ?? '', Validators.required],
    tipo: [this.dados?.tipo ?? 'Tarefa', Validators.required],
    responsaveis: [this.dados?.responsaveis?.filter((item) => item.papel === 'Organizer' || item.papel === 'Assistente').map((item) => chaveResponsavel(item)) ?? ['Organizer'] as string[], Validators.required],
    prazo: this.fb.control<Date | null>(deIsoParaData(this.dados?.prazo), Validators.required),
    observacao: [this.dados?.observacao ?? ''],
  });

  ngOnInit(): void {
    this.negocio.oportunidades().subscribe({ next: (lista) => this.oportunidades.set(lista) });
    const atuais = (this.dados?.responsaveis ?? []).map((item) => chaveResponsavel(item));
    this.assistentes.nomes().subscribe({
      next: (nomes) => this.opcoes.set(opcoesResponsavel(nomes, 'Eu', atuais).filter((opcao) => opcao.valor !== 'Cliente')),
      error: () => undefined,
    });
  }

  protected formatar(tipo: 'negrito' | 'lista' | 'link'): void {
    const campo = this.campoObservacao()?.nativeElement;
    if (!campo) return;
    const aplicar: (texto: string, inicio: number, fim: number) => EdicaoTexto =
      tipo === 'negrito' ? aplicarNegrito : tipo === 'lista' ? aplicarLista : aplicarLink;
    const edicao = aplicar(campo.value, campo.selectionStart, campo.selectionEnd);
    this.form.controls.observacao.setValue(edicao.texto);
    campo.focus();
    setTimeout(() => campo.setSelectionRange(edicao.inicio, edicao.fim));
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.erro('Preencha os campos obrigatórios.');
      return;
    }
    const v = this.form.getRawValue();
    const pedido = {
      titulo: v.titulo,
      oportunidadeId: v.oportunidadeId,
      tipo: v.tipo,
      observacao: v.observacao,
      responsaveis: v.responsaveis.map((chave) => pedidoResponsavel(chave)),
      prazo: deDataParaIso(v.prazo),
    };
    const req = this.dados
      ? this.negocio.atualizarTarefaFunil(this.dados.id, pedido)
      : this.negocio.criarTarefaFunil(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Tarefa salva.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({
  selector: 'app-tarefas-funil',
  imports: [ReactiveFormsModule, CampoDataComponent, MatButtonToggleModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatSelectModule, GdDataPipe, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div><mat-card-title class="mb-0">Tarefas do funil</mat-card-title><mat-card-subtitle>Reuniões, ligações, e-mails e tarefas comerciais.</mat-card-subtitle></div>
      </div>
      <mat-card-content class="border-t border-border">
      <div class="barra-lista">
        <div class="barra-lista-filtros">
          <mat-button-toggle-group [value]="completa()" (change)="completa.set($event.value); carregar()" aria-label="Situação das tarefas">
            <mat-button-toggle [value]="false">Incompletas</mat-button-toggle>
            <mat-button-toggle [value]="true">Completas</mat-button-toggle>
          </mat-button-toggle-group>
          <div class="campo w-full sm:w-48">
            <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
            <mat-select [attr.aria-label]="'Tipo'" [value]="tipo()" (selectionChange)="tipo.set($event.value); carregar()">
              <mat-option value="">Todos</mat-option>
              @for (t of tipos; track t.valor) { <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
          <div class="campo w-full sm:w-52">
            <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
            <mat-select [attr.aria-label]="'Responsável'" [value]="responsavel()" (selectionChange)="responsavel.set($event.value); carregar()">
              <mat-option value="">Todos</mat-option>
              @for (o of opcoes(); track o.valor) { <mat-option [value]="o.valor">{{ o.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
          <div class="w-full sm:w-44"><app-campo-data [formControl]="prazoDe" rotulo="Prazo de" /></div>
          <div class="w-full sm:w-44"><app-campo-data [formControl]="prazoAte" rotulo="Prazo até" /></div>
        </div>
        <div class="barra-lista-acoes">
          <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Adicionar tarefa</button>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Não há tarefa.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="titulo">
            <th mat-header-cell *matHeaderCellDef>Título</th>
            <td mat-cell *matCellDef="let item">
              {{ item.titulo }}<span class="block text-xs text-muted">{{ item.oportunidadeNome }}</span>
              @if (item.observacao) { <div class="observacao text-sm mt-1" [innerHTML]="html(item.observacao)"></div> }
            </td>
          </ng-container>
          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let item">{{ item.tipo }}</td>
          </ng-container>
          <ng-container matColumnDef="responsaveis">
            <th mat-header-cell *matHeaderCellDef>Responsáveis</th>
            <td mat-cell *matCellDef="let item">{{ nomes(item) }}</td>
          </ng-container>
          <ng-container matColumnDef="prazo">
            <th mat-header-cell *matHeaderCellDef>Prazo</th>
            <td mat-cell *matCellDef="let item">{{ item.prazo | gdData }}</td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              <button mat-icon-button aria-label="Editar tarefa" matTooltip="Editar tarefa" type="button" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
              @if (!item.completa) {
                <button mat-icon-button aria-label="Concluir tarefa" matTooltip="Concluir tarefa" type="button" (click)="concluir(item)"><mat-icon>check</mat-icon></button>
              } @else {
                <button mat-icon-button aria-label="Reabrir tarefa" matTooltip="Reabrir tarefa" type="button" (click)="reabrir(item)"><mat-icon>undo</mat-icon></button>
              }
              @if (auth.podeExcluirDoFunil(item.criadoPor)) {
                <button mat-icon-button aria-label="Excluir tarefa" matTooltip="Excluir tarefa" type="button" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas"></tr>
        </table>
      }
    </mat-card-content>
    </mat-card>
  `,
})
export class TarefasFunilPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly tipos = TIPOS_TAREFA_FUNIL;
  protected readonly completa = signal(false);
  protected readonly tipo = signal('');
  protected readonly responsavel = signal('');
  protected readonly prazoDe = new FormControl<Date | null>(null);
  protected readonly prazoAte = new FormControl<Date | null>(null);
  protected readonly lista = signal<TarefaFunil[]>([]);
  protected readonly colunas = ['titulo', 'tipo', 'responsaveis', 'prazo', 'acoes'];
  private readonly assistentes = inject(AssistentesClient);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly opcoes = signal<OpcaoResponsavel[]>(opcoesResponsavel([], 'Dona da conta'));

  protected html(texto: string | null): string {
    return htmlDeTextoSimples(texto);
  }

  protected nomes(item: TarefaFunil): string {
    return (item.responsaveis ?? []).map((responsavel) => rotuloResponsavel(responsavel, this.opcoes())).join(', ');
  }

  ngOnInit(): void {
    this.assistentes.nomes().subscribe({
      next: (nomes) => this.opcoes.set(opcoesResponsavel(nomes, 'Dona da conta', nomes.map((item) => `Assistente:${item.id}`))),
      error: () => undefined,
    });
    merge(this.prazoDe.valueChanges, this.prazoAte.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregar());
    this.carregar();
  }

  protected abrir(item?: TarefaFunil): void {
    this.dialog.open(TarefaFunilDialog, { ...DIALOG, data: item ?? null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected concluir(item: TarefaFunil): void {
    this.negocio.concluirTarefaFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Tarefa concluída.'); this.carregar(); },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected reabrir(item: TarefaFunil): void {
    this.negocio.reabrirTarefaFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Tarefa reaberta.'); this.carregar(); },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: TarefaFunil): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir tarefa', texto: `Confirma a exclusão de "${item.titulo}"?`, confirmar: 'Excluir', destrutivo: true },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.negocio.excluirTarefaFunil(item.id).subscribe({
        next: () => { this.toast.sucesso('Tarefa excluída.'); this.carregar(); },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected carregar(): void {
    this.negocio.tarefasFunil({
      completa: String(this.completa()),
      tipo: this.tipo() || undefined,
      responsavel: this.responsavel() || undefined,
      prazoDe: deDataParaIso(this.prazoDe.value) ?? undefined,
      prazoAte: deDataParaIso(this.prazoAte.value) ?? undefined,
    }).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
