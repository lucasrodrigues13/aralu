import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { MensagemModelo, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-mensagem-editor-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar mensagem' : 'Novo modelo' }}</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Texto</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <textarea [attr.aria-label]="'Texto'" matInput rows="6" formControlName="texto" #textoArea></textarea>
        </mat-form-field>
        </div>
        <div class="params">
          <span>Inserir parâmetro:</span>
          @for (param of parametros; track param) {
            <button mat-stroked-button type="button" (click)="inserir(param, textoArea)">{{ param }}</button>
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .params { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
    .params button { font-size: 0.75rem; }
  `,
})
export class MensagemEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<MensagemModelo | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<MensagemEditorDialog, boolean>);
  protected readonly parametros = this.dados?.parametros?.length
    ? this.dados.parametros
    : [
        '#nome_da_empresa', '#nome_evento', '#tipo_evento', '#data_evento', '#hora_evento',
        '#local_cerimonia', '#local_recepcao', '#endereco_cerimonia', '#endereco_recepcao',
        '#convite', '#link_convite', '#link_unico', '#nome_convidados', '#mesa_dos_convidados',
        '#site_url', '#prazo_rsvp', '#qr_code',
      ];
  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    texto: [this.dados?.texto ?? '', Validators.required],
  });

  protected inserir(param: string, area: HTMLTextAreaElement): void {
    const atual = this.form.controls.texto.value;
    const inicio = area.selectionStart ?? atual.length;
    const fim = area.selectionEnd ?? atual.length;
    const novo = atual.slice(0, inicio) + param + atual.slice(fim);
    this.form.controls.texto.setValue(novo);
    setTimeout(() => {
      area.focus();
      const pos = inicio + param.length;
      area.setSelectionRange(pos, pos);
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    const req = this.dados
      ? this.negocio.atualizarMensagem(this.dados.id, valor)
      : this.negocio.criarMensagem(valor);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Mensagem salva.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({
  selector: 'app-modelos-mensagens',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Modelos de mensagens</mat-card-title>
        <mat-card-subtitle>Textos com parâmetros para RSVP e convites.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="abrir()">
        <mat-icon>add</mat-icon>
        Novo Modelo de Mensagem
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
        <p class="text-center text-muted py-10">Sem modelos de mensagens cadastrados</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let item">{{ item.nome }}</td>
          </ng-container>
          <ng-container matColumnDef="texto">
            <th mat-header-cell *matHeaderCellDef>Texto</th>
            <td mat-cell *matCellDef="let item"><span class="block text-xs text-muted">{{ item.texto }}</span></td>
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
export class ModelosMensagensPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<MensagemModelo[]>([]);
  protected readonly busca = signal('');
  protected readonly colunas = ['nome', 'texto', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: MensagemModelo): void {
    if (item) {
      this.negocio.mensagem(item.id).subscribe({
        next: (detalhe) => this.dialog.open(MensagemEditorDialog, { ...DIALOG, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregar()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(MensagemEditorDialog, { ...DIALOG, data: null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected clonar(item: MensagemModelo): void {
    this.negocio.clonarMensagem(item.id).subscribe({
      next: () => {
        this.toast.sucesso('Mensagem clonada.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: MensagemModelo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir mensagem', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirMensagem(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Mensagem excluída.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.mensagens(this.busca()).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
