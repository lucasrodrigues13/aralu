import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Modelo, NegocioClient, PreviaImportacaoTarefas, TIPOS } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

export interface ImportarTarefasModeloDados {
  /** Se informado, acrescenta ao modelo aberto; senão cria modelo novo. */
  modeloId?: string;
  tipoPadrao?: string;
}

@Component({
  selector: 'app-importar-tarefas-modelo',
  imports: [MatCardModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule],
  template: `
    <h2 mat-dialog-title>{{ dados.modeloId ? 'Colar tarefas' : 'Importar modelo' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Cole a lista ou envie a planilha. Nada é gravado antes de Importar.</p>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        @if (!dados.modeloId) {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
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
          </div>
        }
        <div class="campo sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Lista de tarefas</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <textarea [attr.aria-label]="'Lista de tarefas'" matInput rows="8" formControlName="texto" placeholder="Cerimônia:&#10;- Reservar igreja (6 semanas)"></textarea>
        </mat-form-field>
        </div>
        <div class="acoes-arquivo">
          <button mat-stroked-button type="button" (click)="arquivo.click()">Enviar planilha</button>
          <button mat-button type="button" (click)="baixarPadrao()">Baixar planilha padrão</button>
          <input #arquivo type="file" accept=".xlsx,.xls,.csv" hidden (change)="enviarArquivo($event)" />
          @if (nomeArquivo()) { <span class="block text-xs text-muted">{{ nomeArquivo() }}</span> }
        </div>
      </form>
      @if (previa(); as p) {
        @if (p.total === 0) {
          <p class="flex gap-3 rounded p-4 mb-4 bg-light-primary">Nenhuma tarefa encontrada</p>
        } @else {
          <p class="text-muted">{{ p.total }} {{ p.total === 1 ? 'tarefa' : 'tarefas' }} na prévia</p>
          <mat-card class="cardWithShadow previa"><mat-card-content>
            <table mat-table class="min-w-full" [dataSource]="p.tarefas">
              <ng-container matColumnDef="grupo">
                <th mat-header-cell *matHeaderCellDef>Grupo</th>
                <td mat-cell *matCellDef="let t">{{ t.grupo || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="tarefa">
                <th mat-header-cell *matHeaderCellDef>Tarefa</th>
                <td mat-cell *matCellDef="let t">
                  {{ t.titulo }}
                  @if (t.aviso) { <span class="block text-xs text-muted">{{ t.aviso }}</span> }
                </td>
              </ng-container>
              <ng-container matColumnDef="prazo">
                <th mat-header-cell *matHeaderCellDef>Prazo</th>
                <td mat-cell *matCellDef="let t">{{ t.prazoLegivel }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colunas"></tr>
              <tr mat-row *matRowDef="let row; columns: colunas"></tr>
            </table>
          </mat-card-content></mat-card>
        }
        @if (p.linhasIgnoradas.length) {
          <div class="flex gap-3 rounded p-4 mb-4 bg-light-primary">
            <strong>Linhas ignoradas</strong>
            <ul>@for (linha of p.linhasIgnoradas; track $index) { <li>{{ linha }}</li> }</ul>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-stroked-button type="button" (click)="gerarPrevia()">Prévia</button>
      <button mat-flat-button type="button" [disabled]="!podeImportar()" (click)="importar()">Importar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .previa { max-height: 280px; overflow: auto; margin-top: 12px; }
    .acoes-arquivo { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
  `,
})
export class ImportarTarefasModeloDialog {
  protected readonly dados = inject<ImportarTarefasModeloDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ImportarTarefasModeloDialog, Modelo | true | undefined>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly tipos = TIPOS;
  protected readonly previa = signal<PreviaImportacaoTarefas | null>(null);
  protected readonly nomeArquivo = signal<string | null>(null);
  private arquivo: File | null = null;
  protected readonly colunas = ['grupo', 'tarefa', 'prazo'];
  protected readonly form = this.fb.nonNullable.group({
    nome: ['', this.dados.modeloId ? [] : Validators.required],
    tipo: [this.dados.tipoPadrao ?? 'Casamento', Validators.required],
    texto: [''],
  });

  protected podeImportar(): boolean {
    const p = this.previa();
    return !!p && p.total > 0 && (this.dados.modeloId ? true : this.form.controls.nome.valid);
  }

  protected gerarPrevia(): void {
    const req = this.arquivo
      ? (() => {
          const dados = new FormData();
          dados.append('arquivo', this.arquivo!);
          return this.negocio.previaImportarTarefasModelo(dados, this.dados.modeloId);
        })()
      : this.negocio.previaImportarTarefasModelo({ texto: this.form.controls.texto.value }, this.dados.modeloId);
    req.subscribe({
      next: (previa) => this.previa.set(previa),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected enviarArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    this.arquivo = arquivo;
    this.nomeArquivo.set(arquivo?.name ?? null);
    if (arquivo) {
      this.gerarPrevia();
    }
  }

  protected baixarPadrao(): void {
    this.negocio.planilhaTarefasModelo().subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'tarefas-modelo.xlsx';
        link.click();
        URL.revokeObjectURL(link.href);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected importar(): void {
    if (!this.podeImportar()) {
      return;
    }
    const dados = new FormData();
    if (this.arquivo) {
      dados.append('arquivo', this.arquivo);
    } else {
      dados.append('texto', this.form.controls.texto.value);
    }
    if (this.dados.modeloId) {
      this.negocio.importarTarefasModelo(this.dados.modeloId, dados).subscribe({
        next: () => {
          const n = this.previa()!.total;
          this.toast.sucesso(`${n} ${n === 1 ? 'tarefa importada' : 'tarefas importadas'}.`);
          this.ref.close(true);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    dados.append('nome', this.form.controls.nome.value);
    dados.append('tipo', this.form.controls.tipo.value);
    this.negocio.importarModeloNovo(dados).subscribe({
      next: (modelo) => {
        const n = this.previa()!.total;
        this.toast.sucesso(`${n} ${n === 1 ? 'tarefa importada' : 'tarefas importadas'}.`);
        this.ref.close(modelo);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
