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
import { NegocioClient, Roteiro } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { horaParaApi } from '../../shared/mascaras';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-roteiro-editor-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, CampoHoraComponent, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar roteiro' : 'Novo roteiro' }}</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div formArrayName="secoes">
          @for (secao of secoes.controls; track $index; let i = $index) {
            <div class="bloco" [formGroupName]="i">
              <div class="linha">
                <div class="campo grow">
                  <mat-label class="font-semibold mb-2 block">Título</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Título'" matInput formControlName="titulo" /></mat-form-field>
                </div>
                <app-campo-hora rotulo="Horário" formControlName="horario" />
                <button mat-icon-button aria-label="Remover seção" matTooltip="Remover seção" type="button" (click)="removerSecao(i)"><mat-icon>delete</mat-icon></button>
              </div>
              <div class="campo grow">
                <mat-label class="font-semibold mb-2 block">Música</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Música'" matInput formControlName="musica" /></mat-form-field>
              </div>
              <div formArrayName="itens">
                @for (item of itensDe(i).controls; track $index; let j = $index) {
                  <div class="linha" [formGroupName]="j">
                    <div class="campo grow">
                      <mat-label class="font-semibold mb-2 block">Item</mat-label>
                      <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Item'" matInput formControlName="texto" /></mat-form-field>
                    </div>
                    <button mat-icon-button aria-label="Remover item" matTooltip="Remover item" type="button" (click)="removerItem(i, j)"><mat-icon>close</mat-icon></button>
                  </div>
                }
              </div>
              <button mat-stroked-button type="button" (click)="adicionarItem(i)">Adicionar item</button>
            </div>
          }
        </div>
        <button mat-stroked-button type="button" (click)="adicionarSecao()">Adicionar seção</button>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .bloco { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 12px; margin: 8px 0; }
    .linha { display: flex; gap: 8px; align-items: flex-start; }
    .grow { flex: 1; }
  `,
})
export class RoteiroEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Roteiro | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<RoteiroEditorDialog, boolean>);
  protected readonly form = this.fb.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    secoes: this.fb.array([]),
  });

  protected get secoes(): FormArray {
    return this.form.get('secoes') as FormArray;
  }

  constructor() {
    for (const secao of this.dados?.secoes ?? []) {
      const grupo = this.novaSecao(secao.titulo ?? '', (secao.horario ?? '').slice(0, 5), secao.musica ?? '');
      const itens = grupo.get('itens') as FormArray;
      for (const item of secao.itens) {
        itens.push(this.fb.nonNullable.group({ texto: item.texto }));
      }
      this.secoes.push(grupo);
    }
  }

  protected itensDe(i: number): FormArray {
    return this.secoes.at(i).get('itens') as FormArray;
  }

  protected adicionarSecao(): void {
    this.secoes.push(this.novaSecao('', '', ''));
  }

  protected removerSecao(i: number): void {
    this.secoes.removeAt(i);
  }

  protected adicionarItem(i: number): void {
    this.itensDe(i).push(this.fb.nonNullable.group({ texto: '' }));
  }

  protected removerItem(i: number, j: number): void {
    this.itensDe(i).removeAt(j);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      nome: string | null;
      secoes: { titulo: string; horario: string; musica: string; itens: { texto: string }[] }[];
    };
    const pedido = {
      nome: valor.nome,
      secoes: (valor.secoes ?? []).map((secao) => ({
        titulo: secao.titulo || null,
        horario: horaParaApi(secao.horario),
        musica: secao.musica || null,
        itens: (secao.itens ?? [])
          .filter((item) => item.texto?.trim())
          .map((item) => ({ texto: item.texto })),
      })),
    };
    const req = this.dados
      ? this.negocio.atualizarRoteiro(this.dados.id, pedido)
      : this.negocio.criarRoteiro(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Roteiro salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private novaSecao(titulo: string, horario: string, musica: string) {
    return this.fb.group({
      titulo: [titulo],
      horario: [horario],
      musica: [musica],
      itens: this.fb.array([]),
    });
  }
}

@Component({
  selector: 'app-modelos-roteiro',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Modelos de roteiro</mat-card-title>
        <mat-card-subtitle>Biblioteca de roteiros do dia.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="abrir()">
        <mat-icon>add</mat-icon>
        Novo Modelo de Roteiro
      </button>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div class="campo w-full sm:w-64">
          <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="busca()" (input)="buscar($event)" />
        </mat-form-field>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Não há modelo de roteiro.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let item">{{ item.nome }}</td>
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
export class ModelosRoteiroPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<Roteiro[]>([]);
  protected readonly busca = signal('');
  protected readonly colunas = ['nome', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: Roteiro): void {
    if (item) {
      this.negocio.roteiro(item.id).subscribe({
        next: (detalhe) => this.dialog.open(RoteiroEditorDialog, { ...DIALOG, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregar()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(RoteiroEditorDialog, { ...DIALOG, data: null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected clonar(item: Roteiro): void {
    this.negocio.clonarRoteiro(item.id).subscribe({
      next: () => {
        this.toast.sucesso('Roteiro clonado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: Roteiro): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir roteiro', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirRoteiro(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Roteiro excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.roteiros(this.busca()).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
