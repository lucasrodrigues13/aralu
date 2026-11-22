import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CampoMesclagem, Contrato, ContratoClient, ContratoResumo } from '../../core/contrato.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { filtrarCampos, inserirMarca, previaDestacada } from './mesclagem';

/** Ajuda das tags (SPEC-053): como usar e a lista completa, da mesma lista do seletor e do preenchimento. */
@Component({
  selector: 'app-ajuda-tags-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Como usar as tags</h2>
    <mat-dialog-content>
      <p class="text-sm mb-2">
        Tags são trechos como <code>{{ marca({ marca: 'contratante_nome', rotulo: '', fonte: '', exemplo: '' }) }}</code> que o sistema troca pelos dados reais quando o contrato é gerado.
        Use o campo "Inserir tag no cursor" para colocar uma tag onde o cursor está no texto. Quando um dado não existe, aparece uma linha em branco (________).
      </p>
      <div class="tabela-tags">
        <table class="w-full text-sm">
          <thead>
            <tr><th>Tag</th><th>O que representa</th><th>De onde puxa o valor</th><th>Exemplo</th></tr>
          </thead>
          <tbody>
            @for (campo of dados.campos; track campo.marca) {
              <tr>
                <td><code>{{ marca(campo) }}</code></td>
                <td>{{ campo.rotulo }}</td>
                <td>{{ campo.fonte }}</td>
                <td>{{ campo.exemplo }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .tabela-tags { overflow-x: auto; }
    th { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    td { vertical-align: top; padding: 6px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    code { font-size: 12px; white-space: nowrap; }
  `,
})
export class AjudaTagsDialog {
  protected readonly dados = inject<{ campos: CampoMesclagem[] }>(MAT_DIALOG_DATA);

  protected marca(campo: CampoMesclagem): string {
    return `{{${campo.marca}}}`;
  }
}

/** Novo/editar modelo de contrato com seletor de tags com busca e ajuda (SPEC-053) e "Ver como fica" (SPEC-030 §6.1). */
@Component({
  selector: 'app-contrato-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatIconModule, MatAutocompleteModule],
  template: `
    <h2 mat-dialog-title>{{ dados.contrato ? 'Editar modelo de contrato' : 'Novo modelo de contrato' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Clique num campo para inserir no texto. Ele é trocado pelos dados do evento.</p>
    <mat-dialog-content>
      <form id="contrato" class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Nome'" matInput formControlName="nome" maxlength="120" required />
          @if (form.controls.nome.invalid) { <mat-error>Informe o nome.</mat-error> }
        </mat-form-field>
        </div>
        <mat-button-toggle-group [value]="modo()" (change)="modo.set($event.value)" aria-label="Modo">
          <mat-button-toggle value="editar">Editar texto</mat-button-toggle>
          <mat-button-toggle value="previa">Ver como fica</mat-button-toggle>
        </mat-button-toggle-group>
        @if (modo() === 'editar') {
          <div class="seletor-tags">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Inserir tag no cursor</mat-label>
              <input matInput [formControl]="busca" [matAutocomplete]="auto" aria-label="Buscar tag para inserir" placeholder="Digite para buscar (ex.: nome, data, valor)" />
              <mat-autocomplete #auto="matAutocomplete" (optionSelected)="escolher($event.option.value)">
                @for (campo of filtrados(); track campo.marca) {
                  <mat-option [value]="campo">
                    <span class="font-medium">{{ campo.marca }}</span>
                    <span class="text-muted text-xs"> · {{ campo.rotulo }}</span>
                  </mat-option>
                } @empty {
                  <mat-option disabled>Nenhuma tag encontrada</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
            <button mat-icon-button type="button" aria-label="Ajuda sobre as tags" title="Como usar as tags" (click)="abrirAjuda()">
              <mat-icon>help_outline</mat-icon>
            </button>
          </div>
        }
        <div class="editor">
          @if (modo() === 'editar') {
            <div class="campo texto">
              <mat-label class="font-semibold mb-2 block">Texto do contrato</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <textarea [attr.aria-label]="'Texto do contrato'" #texto matInput rows="18" formControlName="texto" required></textarea>
              @if (form.controls.texto.invalid) { <mat-error>Informe o texto.</mat-error> }
            </mat-form-field>
            </div>
          } @else {
            <div class="previa" [innerHTML]="previa()"></div>
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="contrato">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-button-toggle-group { width: fit-content; }
    .seletor-tags { display: flex; align-items: flex-start; gap: 8px; }
    .texto { width: 100%; }
    .texto textarea { font-family: inherit; line-height: 1.5; }
    .previa { min-height: 360px; max-height: 60vh; overflow: auto; padding: 12px 14px; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-small); font-size: 14px; line-height: 1.6; white-space: normal; }
    .previa ::ng-deep mark { background: color-mix(in oklab, var(--mat-sys-primary) 18%, transparent); color: inherit; border-radius: 4px; padding: 0 2px; }
  `,
})
export class ContratoDialog {
  protected readonly dados = inject<{ contrato: Contrato | null; campos: CampoMesclagem[] }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ContratoDialog, { nome: string; texto: string }>);
  private readonly fb = inject(FormBuilder);
  private readonly areaTexto = viewChild<ElementRef<HTMLTextAreaElement>>('texto');
  protected readonly modo = signal<'editar' | 'previa'>('editar');
  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados.contrato?.nome ?? '', [Validators.required, Validators.pattern(/\S/)]],
    texto: [this.dados.contrato?.texto ?? '', [Validators.required, Validators.pattern(/\S/)]],
  });
  private readonly textoAtual = toSignal(this.form.controls.texto.valueChanges, { initialValue: this.form.controls.texto.value });
  protected readonly previa = computed(() => previaDestacada(this.textoAtual(), this.dados.campos));
  private readonly dialog = inject(MatDialog);
  /** Texto digitado na busca do seletor; ao escolher uma tag volta a ficar vazio. */
  protected readonly busca = new FormControl<string | CampoMesclagem>('', { nonNullable: true });
  private readonly termo = toSignal(this.busca.valueChanges, { initialValue: '' });
  protected readonly filtrados = computed(() => {
    const valor = this.termo();
    return filtrarCampos(this.dados.campos, typeof valor === 'string' ? valor : '');
  });

  protected abrirAjuda(): void {
    this.dialog.open(AjudaTagsDialog, { ...DIALOG_LARGO, data: { campos: this.dados.campos } });
  }

  protected escolher(campo: CampoMesclagem): void {
    this.inserir(campo);
    this.busca.setValue('');
  }

  protected inserir(campo: CampoMesclagem): void {
    const area = this.areaTexto()?.nativeElement;
    const texto = this.form.controls.texto.value;
    const inicio = area?.selectionStart ?? texto.length;
    const fim = area?.selectionEnd ?? texto.length;
    const novo = inserirMarca(texto, inicio, fim, campo.marca);
    this.form.controls.texto.setValue(novo.texto);
    setTimeout(() => {
      area?.focus();
      area?.setSelectionRange(novo.cursor, novo.cursor);
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.modo.set('editar');
      return;
    }
    const valor = this.form.getRawValue();
    this.ref.close({ nome: valor.nome.trim(), texto: valor.texto });
  }
}

/** Tela Contratos (SPEC-030 §6.1): lista e botão "Novo contrato" acima da tabela. */
@Component({
  selector: 'app-contratos',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, GdDataPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Modelos de Contrato</mat-card-title>
        <mat-card-subtitle>Modelos dos contratos que você envia aos clientes, para orçamentos aprovados. Os campos puxam os dados do contratante, do evento, do orçamento aprovado e da sua empresa.</mat-card-subtitle>
      </div>
      <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo modelo</button>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div class="campo w-full sm:w-64">
          <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="busca()" (input)="busca.set($any($event.target).value)" />
        </mat-form-field>
        </div>
      </div>
      @if (visiveis().length === 0) {
        <p class="text-center text-muted py-10">{{ contratos().length === 0 ? 'Nenhum modelo cadastrado.' : 'Nenhum modelo com esse nome.' }}</p>
      } @else {
        <table class="tabela">
          <thead><tr><th>Nome</th><th>Atualizado em</th><th class="text-end! whitespace-nowrap">Ações</th></tr></thead>
          <tbody>
            @for (contrato of visiveis(); track contrato.id) {
              <tr>
                <td>{{ contrato.nome }}</td>
                <td>{{ contrato.atualizadoEm | gdData }}</td>
                <td class="text-end! whitespace-nowrap">
                  <button mat-icon-button type="button" aria-label="Editar" (click)="abrir(contrato)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button type="button" aria-label="Excluir" (click)="excluir(contrato)"><mat-icon>delete</mat-icon></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-card-content>
    </mat-card>
  `,
})
export class ContratosPage implements OnInit {
  private readonly contratoClient = inject(ContratoClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly contratos = signal<ContratoResumo[]>([]);
  protected readonly busca = signal('');
  private campos: CampoMesclagem[] = [];

  protected readonly visiveis = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.contratos().filter((item) => !termo || item.nome.toLowerCase().includes(termo));
  });

  ngOnInit(): void {
    this.contratoClient.campos().subscribe({ next: (resposta) => (this.campos = resposta.campos) });
    this.carregar();
  }

  protected abrir(resumo?: ContratoResumo): void {
    const abrirDialogo = (contrato: Contrato | null) =>
      this.dialog.open(ContratoDialog, { ...DIALOG_LARGO, data: { contrato, campos: this.campos } }).afterClosed().subscribe((pedido) => {
        if (!pedido) return;
        this.contratoClient.salvar(contrato?.id ?? null, pedido).subscribe({
          next: () => {
            this.toast.sucesso(contrato ? 'Modelo atualizado.' : 'Modelo criado.');
            this.carregar();
          },
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
    if (!resumo) {
      abrirDialogo(null);
      return;
    }
    this.contratoClient.obter(resumo.id).subscribe({
      next: (contrato) => abrirDialogo(contrato),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(contrato: ContratoResumo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: {
        titulo: 'Excluir modelo',
        texto: `Excluir "${contrato.nome}"? Contratos já criados a partir dele não mudam.`,
        confirmar: 'Excluir',
      },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.contratoClient.excluir(contrato.id).subscribe({
        next: () => {
          this.toast.sucesso('Modelo excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.contratoClient.listar().subscribe({
      next: (lista) => this.contratos.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
