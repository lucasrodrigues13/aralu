import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Modelo, NegocioClient, TIPOS } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { ImportarTarefasModeloDialog } from './importar-tarefas-modelo.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-criar-modelo-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Criar modelo</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Tipo'" formControlName="tipo">
            @for (tipo of tipos; track tipo.valor) {
              <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Criar</button>
    </mat-dialog-actions>
  `,
})
export class CriarModeloDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject(MatDialogRef<CriarModeloDialog, Modelo>);
  protected readonly tipos = TIPOS;
  protected readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    tipo: ['Casamento', Validators.required],
  });

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    this.negocio.criarModelo({ nome: valor.nome, tipo: valor.tipo }).subscribe({
      next: (modelo) => {
        this.toast.sucesso('Modelo criado.');
        this.ref.close(modelo);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({
  selector: 'app-modelos-evento',
  imports: [MatCardModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div>
        <mat-card-title class="mb-0">Modelos de evento</mat-card-title>
        <mat-card-subtitle>Biblioteca de modelos para criar eventos.</mat-card-subtitle>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
      <div class="barra-lista">
        <div class="barra-lista-filtros">
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="busca()" (input)="buscar($event)" />
          </mat-form-field>
          </div>
        </div>
        <div class="barra-lista-acoes">
          <button mat-stroked-button type="button" (click)="importar()">
          <mat-icon>upload</mat-icon>
          Importar modelo
          </button>
          <button mat-flat-button type="button" (click)="criar()">
          <mat-icon>add</mat-icon>
          Novo Modelo de Evento
          </button>
        </div>
      </div>
      @if (modelos().length === 0) {
        <p class="text-center text-muted py-10">Não há modelo cadastrado.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="modelos()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let m">
              <a [routerLink]="['/modelos-evento', m.id]">{{ m.nome }}</a>
            </td>
          </ng-container>
          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let m">{{ rotuloTipo(m.tipo) }}</td>
          </ng-container>
          <ng-container matColumnDef="pacote">
            <th mat-header-cell *matHeaderCellDef>Tarefas · Serviços</th>
            <td mat-cell *matCellDef="let m">{{ m.tarefas.length }} tarefas · {{ m.servicos.length }} serviços</td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let m" class="text-end! whitespace-nowrap">
              <a mat-icon-button aria-label="Editar" matTooltip="Editar" [routerLink]="['/modelos-evento', m.id]"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button type="button" aria-label="Clonar" matTooltip="Clonar" (click)="clonar(m)"><mat-icon>content_copy</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir(m)"><mat-icon>delete</mat-icon></button>
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
export class ModelosEventoPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly modelos = signal<Modelo[]>([]);
  protected readonly busca = signal('');
  protected readonly colunas = ['nome', 'tipo', 'pacote', 'acoes'];
  protected readonly tipos = TIPOS;

  ngOnInit(): void {
    this.carregar();
  }

  protected rotuloTipo(tipo: string): string {
    return this.tipos.find((item) => item.valor === tipo)?.rotulo ?? tipo;
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected criar(): void {
    this.dialog.open(CriarModeloDialog, { ...DIALOG, width: 'min(480px, calc(100vw - 32px))' }).afterClosed().subscribe((modelo) => {
      if (modelo) {
        void this.router.navigate(['/modelos-evento', modelo.id]);
      }
    });
  }

  protected importar(): void {
    this.dialog.open(ImportarTarefasModeloDialog, { ...DIALOG_LARGO, data: {} }).afterClosed().subscribe((modelo) => {
      if (modelo && typeof modelo === 'object' && 'id' in modelo) {
        void this.router.navigate(['/modelos-evento', modelo.id]);
      } else {
        this.carregar();
      }
    });
  }

  protected clonar(modelo: Modelo): void {
    this.negocio.clonarModelo(modelo.id).subscribe({
      next: () => {
        this.toast.sucesso('Modelo clonado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(modelo: Modelo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir modelo', texto: `Confirma a exclusão de "${modelo.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirModelo(modelo.id).subscribe({
        next: () => {
          this.toast.sucesso('Modelo excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.modelos(this.busca()).subscribe({
      next: (lista) => this.modelos.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
