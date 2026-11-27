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
import { EditorRico } from '../../shared/editor-rico';
import { toSignal } from '@angular/core/rxjs-interop';
import { DepoimentoAceite, MidiaAceite } from '../../core/negocio.client';
import {
  abrirAjudaAceite, abrirGerarComIa, abrirPreviaAceite, AssistenteMidiaAceite, AssuntoAjuda, espacosDoHtml, GrupoTags, SeletorTagsAceite,
  TAGS_BLOCOS, TAGS_COMPONENTES, TAGS_DADOS,
} from './pagina-aceite';
import { FecharModal } from '../../shared/fechar-modal';

type TipoModelo = 'servico' | 'orcamento';

@Component({
  selector: 'app-modelo-funil-dialog',
  imports: [FecharModal, 
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTooltipModule,
    CampoDinheiroComponent, EditorRico, SeletorTagsAceite, AssistenteMidiaAceite,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados.item ? 'Editar' : 'Novo' }} modelo <app-fechar-modal /></h2>
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
            <app-editor-rico #editorTexto formControlName="texto" rotulo="Texto" altura="180px" />
            <app-seletor-tags-aceite class="mt-2 block" [grupos]="gruposTexto" (escolhida)="editorTexto.inserirTag($event)" (ajuda)="ajuda('tags-texto')" />
          </div>
          <div class="cores">
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Cor primária</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Cor primária'" matInput formControlName="corPrimaria" placeholder="#112233" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Cor secundária</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Cor secundária'" matInput formControlName="corSecundaria" placeholder="#aabbcc" /></mat-form-field>
            </div>
          </div>
          <div class="campo">
            <div class="cabeca-aceite">
              <span class="font-semibold">Tela de aceite (HTML, opcional)</span>
              <button mat-icon-button type="button" aria-label="Ajuda sobre a tela de aceite" matTooltip="Ajuda sobre a tela de aceite" (click)="ajuda('pagina')"><mat-icon>help_outline</mat-icon></button>
              <span class="flex-1"></span>
              <button mat-stroked-button type="button" (click)="gerarComIa()"><mat-icon>auto_awesome</mat-icon> Gerar com IA</button>
              <button mat-stroked-button type="button" (click)="previa()"><mat-icon>visibility</mat-icon> Live Preview</button>
            </div>
            <textarea #codigo class="codigo" formControlName="htmlAceite" aria-label="HTML da tela de aceite" spellcheck="false"
              placeholder="Cole aqui o HTML da sua página de aceite (ou use Gerar com IA)."></textarea>
            <app-seletor-tags-aceite class="mt-2 block" rotulo="Inserir tags no HTML" [grupos]="gruposHtml" (escolhida)="inserirNoHtml(codigo, $event)" (ajuda)="ajuda('tags-html')" />
            <app-assistente-midia-aceite class="mt-3 block" [html]="htmlAceite()" [midias]="midias()" [depoimentos]="depoimentos()"
              (midiasMudaram)="midias.set($event)" (depoimentosMudaram)="depoimentos.set($event)" />
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .cores { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .cabeca-aceite { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
    .codigo { display: block; width: 100%; height: 360px; resize: vertical; padding: 12px; border-radius: 8px; font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace;
      border: 1px solid var(--mat-sys-outline); background: var(--mat-sys-surface); color: var(--mat-sys-on-surface); tab-size: 2; }
    .codigo:focus { outline: 2px solid var(--mat-sys-primary); outline-offset: -1px; }
  `,
})
export class ModeloFunilDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly dados = inject<{ tipo: TipoModelo; item: ModeloServicoFunil | ModeloOrcamentoFunil | null }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ModeloFunilDialog, boolean>);
  /** Texto: as 17 tags de dados; HTML: dados, componentes e blocos (SPEC-061). */
  protected readonly gruposTexto: GrupoTags[] = [{ titulo: 'Dados', tags: TAGS_DADOS }];
  protected readonly gruposHtml: GrupoTags[] = [
    { titulo: 'Dados', tags: TAGS_DADOS },
    { titulo: 'Componentes', tags: TAGS_COMPONENTES },
    { titulo: 'Blocos do sistema', tags: TAGS_BLOCOS },
  ];
  private readonly orcamento = this.dados.item as ModeloOrcamentoFunil | null;
  protected readonly midias = signal<MidiaAceite[]>(this.orcamento?.midias ?? []);
  protected readonly depoimentos = signal<DepoimentoAceite[]>(this.orcamento?.depoimentos ?? []);
  protected readonly form = this.fb.nonNullable.group({
    nome: [(this.dados.item as { nome?: string } | null)?.nome ?? '', Validators.required],
    descricao: [(this.dados.item as ModeloServicoFunil | null)?.descricao ?? ''],
    valor: [(this.dados.item as ModeloServicoFunil | null)?.valor ?? null as number | null],
    texto: [(this.dados.item as ModeloOrcamentoFunil | null)?.texto ?? ''],
    corPrimaria: [(this.dados.item as ModeloOrcamentoFunil | null)?.corPrimaria ?? ''],
    corSecundaria: [(this.dados.item as ModeloOrcamentoFunil | null)?.corSecundaria ?? ''],
    htmlAceite: [(this.dados.item as ModeloOrcamentoFunil | null)?.htmlAceite ?? ''],
  });

  protected readonly htmlAceite = toSignal(this.form.controls.htmlAceite.valueChanges, { initialValue: this.form.controls.htmlAceite.value });

  /** Põe {{marca}} onde está o cursor do código (ou no fim) e devolve o foco logo depois dela. */
  protected inserirNoHtml(campo: HTMLTextAreaElement, marca: string): void {
    const trecho = `{{${marca}}}`;
    const valor = this.form.controls.htmlAceite.value;
    const inicio = campo.selectionStart ?? valor.length;
    const fim = campo.selectionEnd ?? inicio;
    this.form.controls.htmlAceite.setValue(valor.slice(0, inicio) + trecho + valor.slice(fim));
    queueMicrotask(() => {
      campo.focus();
      campo.setSelectionRange(inicio + trecho.length, inicio + trecho.length);
    });
  }

  protected ajuda(assunto: AssuntoAjuda): void {
    abrirAjudaAceite(this.dialog, assunto);
  }

  protected gerarComIa(): void {
    abrirGerarComIa(this.dialog);
  }

  protected previa(): void {
    const v = this.form.getRawValue();
    abrirPreviaAceite(this.dialog, {
      texto: v.texto || null,
      htmlAceite: v.htmlAceite || null,
      corPrimaria: v.corPrimaria || null,
      corSecundaria: v.corSecundaria || null,
      midias: this.midiasUsadas(),
      depoimentos: this.depoimentosPreenchidos(),
    });
  }

  /** Só as fotos dos espaços que o HTML ainda usa. */
  private midiasUsadas(): MidiaAceite[] {
    const usados = new Set(espacosDoHtml(this.form.controls.htmlAceite.value).map((e) => e.espaco));
    return this.midias().filter((m) => usados.has(m.espaco));
  }

  private depoimentosPreenchidos(): DepoimentoAceite[] {
    return this.depoimentos().filter((d) => d.texto.trim());
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
      const pedido = {
        nome: v.nome,
        texto: v.texto,
        corPrimaria: v.corPrimaria || null,
        corSecundaria: v.corSecundaria || null,
        htmlAceite: v.htmlAceite || null,
        midias: this.midiasUsadas(),
        depoimentos: this.depoimentosPreenchidos(),
      };
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
            <td mat-cell *matCellDef="let item"><button type="button" class="link-nome" (click)="abrir(item)">{{ item.nome }}</button></td>
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
      .open(ModeloFunilDialog, {
        ...DIALOG,
        ...(this.tipo === 'orcamento' ? { width: 'min(960px, calc(100vw - 32px))' } : {}),
        data: { tipo: this.tipo, item: item ?? null },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.carregar());
  }

  protected excluir(item: { id: string; nome: string }): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir modelo', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir', destrutivo: true },
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
