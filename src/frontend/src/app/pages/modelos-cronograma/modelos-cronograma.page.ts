import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cronograma, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { horaParaApi } from '../../shared/mascaras';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-cronograma-editor-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, CampoDataComponent, CampoHoraComponent, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar cronograma' : 'Novo cronograma' }}</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Título</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Título'" matInput formControlName="titulo" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
          <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Descrição'" matInput rows="2" formControlName="descricao"></textarea></mat-form-field>
        </div>
        <div formArrayName="itens">
          @for (item of itens.controls; track $index; let i = $index) {
            <div class="bloco" [formGroupName]="i">
              <div class="linha">
                <div class="campo grow">
                  <mat-label class="font-semibold mb-2 block">Rótulo</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Rótulo'" matInput formControlName="rotulo" /></mat-form-field>
                </div>
                <button mat-icon-button aria-label="Remover item" matTooltip="Remover item" type="button" (click)="removerItem(i)"><mat-icon>delete</mat-icon></button>
              </div>
              <div class="linha">
                <app-campo-data rotulo="Data" formControlName="data" />
                <app-campo-hora rotulo="Hora" formControlName="hora" />
              </div>
              <div class="campo grow">
                <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Responsável'" matInput formControlName="responsavel" /></mat-form-field>
              </div>
              <div class="campo grow">
                <mat-label class="font-semibold mb-2 block">Recado fornecedores</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Recado fornecedores'" matInput formControlName="recadoFornecedores" /></mat-form-field>
              </div>
            </div>
          }
        </div>
        <button mat-stroked-button type="button" (click)="adicionarItem()">Adicionar item</button>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .bloco { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 12px; margin: 8px 0; }
    .linha { display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; }
    .grow { flex: 1; min-width: 160px; }
  `,
})
export class CronogramaEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Cronograma | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<CronogramaEditorDialog, boolean>);
  protected readonly form = this.fb.group({
    titulo: [this.dados?.titulo ?? '', Validators.required],
    descricao: [this.dados?.descricao ?? ''],
    itens: this.fb.array([]),
  });

  protected get itens(): FormArray {
    return this.form.get('itens') as FormArray;
  }

  constructor() {
    for (const item of this.dados?.itens ?? []) {
      this.itens.push(this.fb.group({
        rotulo: [item.rotulo ?? ''],
        data: [deIsoParaData(item.data)],
        hora: [(item.hora ?? '').slice(0, 5)],
        responsavel: [item.responsavel ?? ''],
        recadoFornecedores: [item.recadoFornecedores ?? ''],
      }));
    }
  }

  protected adicionarItem(): void {
    this.itens.push(this.fb.group({
      rotulo: [''],
      data: [null as Date | null],
      hora: [''],
      responsavel: [''],
      recadoFornecedores: [''],
    }));
  }

  protected removerItem(i: number): void {
    this.itens.removeAt(i);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      titulo: string | null;
      descricao: string | null;
      itens: {
        rotulo: string;
        data: Date | null;
        hora: string;
        responsavel: string;
        recadoFornecedores: string;
      }[];
    };
    const pedido = {
      titulo: valor.titulo,
      descricao: valor.descricao || null,
      itens: (valor.itens ?? []).map((item) => ({
        rotulo: item.rotulo || null,
        data: deDataParaIso(item.data),
        hora: horaParaApi(item.hora),
        responsavel: item.responsavel || null,
        recadoFornecedores: item.recadoFornecedores || null,
      })),
    };
    const req = this.dados
      ? this.negocio.atualizarCronograma(this.dados.id, pedido)
      : this.negocio.criarCronograma(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Cronograma salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({
  selector: 'app-modelos-cronograma',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Modelos de cronograma</mat-card-title>
        <mat-card-subtitle>Biblioteca de cronogramas da conta.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="abrir()">
        <mat-icon>add</mat-icon>
        Novo Modelo de Cronograma
      </button>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div class="campo w-full sm:w-64">
          <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <input matInput aria-label="Buscar" placeholder="Buscar" [value]="busca()" (input)="buscar($event)" />
        </mat-form-field>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Não há modelo de cronograma.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="titulo">
            <th mat-header-cell *matHeaderCellDef>Título</th>
            <td mat-cell *matCellDef="let item">
              {{ item.titulo }}
              @if (item.descricao) { <span class="block text-xs text-muted">{{ item.descricao }}</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Clonar" matTooltip="Clonar" (click)="clonar(item)"><mat-icon>content_copy</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
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
export class ModelosCronogramaPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<Cronograma[]>([]);
  protected readonly busca = signal('');
  protected readonly colunas = ['titulo', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: Cronograma): void {
    if (item) {
      this.negocio.cronograma(item.id).subscribe({
        next: (detalhe) => this.dialog.open(CronogramaEditorDialog, { ...DIALOG, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregar()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(CronogramaEditorDialog, { ...DIALOG, data: null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected clonar(item: Cronograma): void {
    this.negocio.clonarCronograma(item.id).subscribe({
      next: () => {
        this.toast.sucesso('Cronograma clonado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: Cronograma): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir cronograma', texto: `Confirma a exclusão de "${item.titulo}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirCronograma(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Cronograma excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.cronogramas(this.busca()).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
