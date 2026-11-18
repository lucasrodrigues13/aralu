import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { inserirMarca, previaDestacada } from './mesclagem';

/** Novo/editar contrato com a lista de campos de mesclagem e "Ver como fica" (SPEC-030 §6.1). */
@Component({
  selector: 'app-contrato-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ dados.contrato ? 'Editar contrato' : 'Novo contrato' }}</h2>
    <p class="gd-dialog-descricao">Clique num campo para inserir no texto. Ele é trocado pelos dados do evento.</p>
    <mat-dialog-content>
      <form id="contrato" class="gd-campos" [formGroup]="form" (ngSubmit)="salvar()">
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" maxlength="120" required />
          @if (form.controls.nome.invalid) { <mat-error>Informe o nome.</mat-error> }
        </mat-form-field>
        <mat-button-toggle-group [value]="modo()" (change)="modo.set($event.value)" aria-label="Modo">
          <mat-button-toggle value="editar">Editar texto</mat-button-toggle>
          <mat-button-toggle value="previa">Ver como fica</mat-button-toggle>
        </mat-button-toggle-group>
        <div class="editor">
          @if (modo() === 'editar') {
            <mat-form-field appearance="outline" class="texto">
              <mat-label>Texto do contrato</mat-label>
              <textarea #texto matInput rows="18" formControlName="texto" required></textarea>
              @if (form.controls.texto.invalid) { <mat-error>Informe o texto.</mat-error> }
            </mat-form-field>
          } @else {
            <div class="previa" [innerHTML]="previa()"></div>
          }
          <aside class="campos" aria-label="Campos de mesclagem">
            <span class="gd-rotulo">Campos</span>
            @for (campo of dados.campos; track campo.marca) {
              <button type="button" class="campo" [disabled]="modo() !== 'editar'" (click)="inserir(campo)" [title]="marca(campo)">
                {{ campo.rotulo }}
              </button>
            }
          </aside>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="contrato">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-button-toggle-group { width: fit-content; }
    .editor { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 16px; align-items: start; }
    .texto { width: 100%; }
    .texto textarea { font-family: inherit; line-height: 1.5; }
    .previa { min-height: 360px; max-height: 60vh; overflow: auto; padding: 12px 14px; border: 1px solid var(--gd-border); border-radius: var(--gd-radius-campo); font-size: 14px; line-height: 1.6; white-space: normal; }
    .previa ::ng-deep mark { background: color-mix(in oklab, var(--gd-primary) 18%, transparent); color: inherit; border-radius: 4px; padding: 0 2px; }
    .campos { display: flex; flex-direction: column; gap: 4px; max-height: 60vh; overflow: auto; }
    .campo { text-align: left; padding: 6px 10px; border: 1px solid var(--gd-border); border-radius: 8px; background: transparent; color: var(--gd-foreground); font: inherit; font-size: 12px; cursor: pointer; }
    .campo:hover:not(:disabled) { border-color: var(--gd-primary); color: var(--gd-primary); }
    .campo:disabled { opacity: 0.5; cursor: default; }
    @media (max-width: 719px) { .editor { grid-template-columns: 1fr; } .campos { flex-direction: row; flex-wrap: wrap; max-height: none; } }
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

  protected marca(campo: CampoMesclagem): string {
    return `{{${campo.marca}}}`;
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
  imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, GdDataPipe],
  template: `
    <header class="gd-cabecalho">
      <div>
        <h1>Contratos</h1>
        <p>Contratos da assessoria com campos que puxam os dados do cliente e do evento.</p>
      </div>
      <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo contrato</button>
    </header>
    <section class="gd-painel">
      <div class="gd-barra">
        <mat-form-field class="gd-busca" appearance="outline" subscriptSizing="dynamic">
          <mat-icon matIconPrefix>search</mat-icon>
          <input matInput placeholder="Buscar por nome" [value]="busca()" (input)="busca.set($any($event.target).value)" />
        </mat-form-field>
      </div>
      @if (visiveis().length === 0) {
        <p class="gd-vazio">{{ contratos().length === 0 ? 'Nenhum contrato cadastrado.' : 'Nenhum contrato com esse nome.' }}</p>
      } @else {
        <table class="gd-grade">
          <thead><tr><th>Nome</th><th>Atualizado em</th><th class="gd-acoes">Ações</th></tr></thead>
          <tbody>
            @for (contrato of visiveis(); track contrato.id) {
              <tr>
                <td>{{ contrato.nome }}</td>
                <td>{{ contrato.atualizadoEm | gdData }}</td>
                <td class="gd-acoes">
                  <button mat-icon-button type="button" aria-label="Editar" (click)="abrir(contrato)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button type="button" aria-label="Excluir" (click)="excluir(contrato)"><mat-icon>delete</mat-icon></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
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
            this.toast.sucesso(contrato ? 'Contrato atualizado.' : 'Contrato criado.');
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
        titulo: 'Excluir contrato',
        texto: `Excluir "${contrato.nome}"? Ele sai também dos modelos e eventos em que estiver.`,
        confirmar: 'Excluir',
      },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.contratoClient.excluir(contrato.id).subscribe({
        next: () => {
          this.toast.sucesso('Contrato excluído.');
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
