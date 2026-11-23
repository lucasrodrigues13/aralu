import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ModeloOrcamentoFunil, ModeloServicoFunil, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

type TipoModelo = 'servico' | 'orcamento';

@Component({
  selector: 'app-modelo-funil-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>{{ dados.item ? 'Editar' : 'Novo' }} modelo</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        @if (dados.tipo === 'servico') {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
            <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Descrição'" matInput rows="3" formControlName="descricao" maxlength="200"></textarea></mat-form-field>
          </div>
          <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        } @else {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Texto</mat-label>
            <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Texto'" matInput rows="8" formControlName="texto" #area></textarea></mat-form-field>
          </div>
          <div class="params">
            @for (p of parametros; track p) {
              <button mat-stroked-button type="button" (click)="inserir(p, area)">{{ p }}</button>
            }
          </div>
          @if (dados.tipo === 'orcamento') {
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Cor primária</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Cor primária'" matInput formControlName="corPrimaria" placeholder="#112233" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Cor secundária</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Cor secundária'" matInput formControlName="corSecundaria" placeholder="#aabbcc" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">HTML da tela de aceite (opcional)</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <textarea [attr.aria-label]="'HTML da tela de aceite'" matInput rows="8" maxlength="50000" formControlName="htmlAceite" placeholder="<h2>Por que nos escolher</h2><p>…</p>"></textarea>
                <mat-hint>Aparece para o cliente na tela de aceite. Por segurança só ficam títulos, texto, listas, tabelas, links e imagens https; scripts, estilos e formulários são removidos.</mat-hint>
              </mat-form-field>
              @if (form.controls.htmlAceite.value.trim()) {
                <p class="text-xs text-muted mt-2">Prévia (já filtrada):</p>
                <div class="previa" [innerHTML]="form.controls.htmlAceite.value"></div>
              }
            </div>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `.params { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; } .previa { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 12px; overflow-wrap: anywhere; } .previa img { max-width: 100%; height: auto; }`,
})
export class ModeloFunilDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<{ tipo: TipoModelo; item: ModeloServicoFunil | ModeloOrcamentoFunil | null }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ModeloFunilDialog, boolean>);
  /** Orçamento: lista fechada (SPEC-031 §17, ponto 12). */
  protected readonly parametros = ['{{nome_oportunidade}}', '{{tipo_evento}}', '{{data_evento}}', '{{convidados}}', '{{local_cerimonia}}', '{{local_recepcao}}', '{{valor}}', '{{validade}}', '{{nome_assessoria}}'];
  protected readonly form = this.fb.nonNullable.group({
    nome: [(this.dados.item as { nome?: string } | null)?.nome ?? '', Validators.required],
    descricao: [(this.dados.item as ModeloServicoFunil | null)?.descricao ?? ''],
    valor: [(this.dados.item as ModeloServicoFunil | null)?.valor ?? null as number | null],
    texto: [(this.dados.item as ModeloOrcamentoFunil | null)?.texto ?? ''],
    corPrimaria: [(this.dados.item as ModeloOrcamentoFunil | null)?.corPrimaria ?? ''],
    corSecundaria: [(this.dados.item as ModeloOrcamentoFunil | null)?.corSecundaria ?? ''],
    htmlAceite: [(this.dados.item as ModeloOrcamentoFunil | null)?.htmlAceite ?? ''],
  });

  protected inserir(param: string, area: HTMLTextAreaElement): void {
    const atual = this.form.controls.texto.value;
    const inicio = area.selectionStart ?? atual.length;
    const fim = area.selectionEnd ?? atual.length;
    this.form.controls.texto.setValue(atual.slice(0, inicio) + param + atual.slice(fim));
  }

  protected salvar(): void {
    if (this.form.controls.nome.invalid || (this.dados.tipo !== 'servico' && !this.form.controls.texto.value.trim())) {
      this.form.markAllAsTouched();
      this.toast.erro('Confira os campos obrigatórios.');
      return;
    }
    const v = this.form.getRawValue();
    const id = this.dados.item?.id;
    let req: Observable<ModeloServicoFunil | ModeloOrcamentoFunil>;
    if (this.dados.tipo === 'servico') {
      const pedido = { nome: v.nome, descricao: v.descricao || null, valor: v.valor };
      req = id ? this.negocio.atualizarModeloServicoFunil(id, pedido) : this.negocio.criarModeloServicoFunil(pedido);
    } else {
      const pedido = { nome: v.nome, texto: v.texto, corPrimaria: v.corPrimaria || null, corSecundaria: v.corSecundaria || null, htmlAceite: v.htmlAceite || null };
      req = id ? this.negocio.atualizarModeloOrcamentoFunil(id, pedido) : this.negocio.criarModeloOrcamentoFunil(pedido);
    }
    req.subscribe({
      next: () => {
        this.toast.sucesso('Modelo salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({
  selector: 'app-modelos-funil',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div>
        <mat-card-title class="mb-0">{{ titulo }}</mat-card-title>
        <mat-card-subtitle>{{ apoio }}</mat-card-subtitle>
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
          <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> {{ rotuloNovo }}</button>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">{{ vazio }}</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let item">{{ item.nome }}</td>
          </ng-container>
          <ng-container matColumnDef="detalhe">
            <th mat-header-cell *matHeaderCellDef>Detalhe</th>
            <td mat-cell *matCellDef="let item"><span class="block text-xs text-muted">{{ detalhe(item) }}</span></td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              <button mat-icon-button aria-label="Editar" matTooltip="Editar" type="button" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button aria-label="Excluir" matTooltip="Excluir" type="button" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
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
export class ModelosFunilPage implements OnInit {
  @Input({ required: true }) tipo!: TipoModelo;
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<Array<ModeloServicoFunil | ModeloOrcamentoFunil>>([]);
  protected readonly busca = signal('');
  protected readonly colunas = ['nome', 'detalhe', 'acoes'];

  get rotuloNovo(): string {
    return this.tipo === 'servico' ? 'Novo Modelo de Serviço/Produto' : 'Novo Modelo de Orçamento';
  }

  get titulo(): string {
    return this.tipo === 'servico' ? 'Modelos de Serviços/Produtos' : 'Modelo de orçamento';
  }

  get apoio(): string {
    return this.tipo === 'servico' ? 'Catálogo usado nas oportunidades do funil.' : 'Biblioteca de textos para orçamentos do funil.';
  }

  get vazio(): string {
    return this.tipo === 'servico' ? 'Não há serviço/produto cadastrado.' : 'Não há modelo cadastrado.';
  }

  ngOnInit(): void {
    this.carregar();
  }

  protected detalhe(item: ModeloServicoFunil | ModeloOrcamentoFunil): string {
    if ('descricao' in item) return item.descricao ?? '';
    if ('texto' in item) return item.texto;
    return '';
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: ModeloServicoFunil | ModeloOrcamentoFunil): void {
    this.dialog
      .open(ModeloFunilDialog, { ...DIALOG, data: { tipo: this.tipo, item: item ?? null } })
      .afterClosed()
      .subscribe((ok) => ok && this.carregar());
  }

  protected excluir(item: { id: string; nome: string }): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir modelo', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      const req: Observable<unknown> =
        this.tipo === 'servico' ? this.negocio.excluirModeloServicoFunil(item.id) : this.negocio.excluirModeloOrcamentoFunil(item.id);
      req.subscribe({
        next: () => {
          this.toast.sucesso('Modelo excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    const req: Observable<Array<ModeloServicoFunil | ModeloOrcamentoFunil>> =
      this.tipo === 'servico' ? this.negocio.modelosServicoFunil(this.busca()) : this.negocio.modelosOrcamentoFunil(this.busca());
    req.subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({ selector: 'app-modelos-servicos-funil', imports: [ModelosFunilPage], template: `<app-modelos-funil tipo="servico" />` })
export class ModelosServicosFunilPage {}

@Component({ selector: 'app-modelos-orcamento-funil', imports: [ModelosFunilPage], template: `<app-modelos-funil tipo="orcamento" />` })
export class ModelosOrcamentoFunilPage {}
