import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { concat, of, switchMap, toArray } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CampoMesclagem, Contrato, ContratoClient, ContratoResumo, IMAGEM_MODELO_ACEITA, ImagemDoModelo, imagemModeloValida } from '../../core/contrato.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { FolhaContrato } from './folha-contrato';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { filtrarCampos, inserirMarca, previaDestacada, tagsDesconhecidas } from './mesclagem';
import { MatTooltipModule } from '@angular/material/tooltip';

/** O que o modal devolve: nome, texto e as mudanças de logo e fundo (arquivo novo, null = remover, ausente = sem mudança). */
export interface ContratoPedido {
  nome: string;
  texto: string;
  imagens: Partial<Record<ImagemDoModelo, File | null>>;
}

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

/** Novo/editar modelo de contrato com seletor de tags com busca e ajuda (SPEC-053) e Live Preview (SPEC-055, evolui o "Ver como fica" da SPEC-030 §6.1). */
@Component({
  selector: 'app-contrato-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatAutocompleteModule, FolhaContrato, MatTooltipModule],
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
        <div class="barra-previa">
          <button mat-stroked-button type="button" [attr.aria-pressed]="previaAberta()" (click)="previaAberta.set(!previaAberta())">
            <mat-icon>{{ previaAberta() ? 'visibility_off' : 'visibility' }}</mat-icon> {{ previaAberta() ? 'Fechar Live Preview' : 'Live Preview' }}
          </button>
          <span class="text-muted text-xs">Mostra como o contrato chega ao cliente, com exemplos no lugar das tags.</span>
        </div>
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
            <button mat-icon-button type="button" aria-label="Ajuda sobre as tags" matTooltip="Ajuda sobre as tags" (click)="abrirAjuda()">
              <mat-icon>help_outline</mat-icon>
            </button>
          </div>
        <div class="imagens">
          @for (qual of qualidades; track qual.id) {
            <div class="imagem">
              <span class="font-semibold block mb-1">{{ qual.rotulo }}</span>
              <span class="text-muted text-xs block mb-2">{{ qual.ajuda }}</span>
              @if (urlDe(qual.id); as url) {
                <img class="miniatura" [src]="url" [alt]="qual.rotulo" />
              }
              <div class="flex flex-wrap gap-2 items-center">
                <button mat-stroked-button type="button" (click)="entrada.click()">
                  <mat-icon>upload</mat-icon> {{ urlDe(qual.id) ? 'Trocar' : 'Escolher imagem' }}
                </button>
                @if (urlDe(qual.id)) {
                  <button mat-button type="button" (click)="remover(qual.id)"><mat-icon>delete</mat-icon> Remover</button>
                }
                <input #entrada type="file" hidden [accept]="aceita" [attr.aria-label]="qual.rotulo" (change)="escolherImagem(qual.id, $event)" />
              </div>
            </div>
          }
          @if (erroImagem()) { <p class="aviso" role="alert">{{ erroImagem() }}</p> }
        </div>
        <div class="editor" [class.com-previa]="previaAberta()">
          <div class="campo texto">
            <mat-label class="font-semibold mb-2 block">Texto do contrato</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <textarea [attr.aria-label]="'Texto do contrato'" #texto matInput rows="18" formControlName="texto" required></textarea>
              @if (form.controls.texto.invalid) { <mat-error>Informe o texto.</mat-error> }
            </mat-form-field>
          </div>
          @if (previaAberta()) {
            <div class="painel-previa" aria-label="Live Preview">
              <span class="font-semibold mb-2 block">Como chega ao cliente</span>
              @if (desconhecidas().length > 0) {
                <p class="aviso" role="status">Tag que não existe e não será trocada: {{ desconhecidas().join(', ') }}.</p>
              }
              <app-folha-contrato [titulo]="nomeAtual() || 'Contrato'" [html]="previa()" [logoUrl]="urlDe('logo')" [fundoUrl]="urlDe('fundo')" />
              <p class="text-muted text-xs mt-2">Os valores destacados são exemplos. No contrato real entram os dados do evento; sem dado, aparece ________. A logo e o fundo aparecem como no contrato gerado.</p>
            </div>
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
    .barra-previa { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .seletor-tags { display: flex; align-items: flex-start; gap: 8px; }
    .editor { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 900px) { .editor.com-previa { grid-template-columns: 1fr 1fr; } }
    .texto { width: 100%; }
    .texto textarea { font-family: inherit; line-height: 1.5; }
    .painel-previa { min-width: 0; }
    .imagens { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 700px) { .imagens { grid-template-columns: 1fr 1fr; } }
    .miniatura { display: block; max-width: 160px; max-height: 80px; object-fit: contain; margin-bottom: 8px; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-small); background: #fff; }
    .aviso { margin: 0 0 8px; font-size: 12px; color: #92400e; }
  `,
})
export class ContratoDialog {
  protected readonly dados = inject<{ contrato: Contrato | null; campos: CampoMesclagem[] }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ContratoDialog, ContratoPedido>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  protected readonly aceita = IMAGEM_MODELO_ACEITA;
  protected readonly qualidades: { id: ImagemDoModelo; rotulo: string; ajuda: string }[] = [
    { id: 'logo', rotulo: 'Logo', ajuda: 'Aparece centralizada no topo do contrato. JPG, PNG ou WebP, até 5 MB.' },
    { id: 'fundo', rotulo: 'Imagem de fundo', ajuda: 'Cobre a folha, com transparência, atrás do texto. JPG, PNG ou WebP, até 5 MB.' },
  ];
  /** Pré-visualização de cada imagem: a que o modelo já tem (baixada) ou a recém escolhida. */
  private readonly urls = signal<Record<ImagemDoModelo, string | null>>({ logo: null, fundo: null });
  /** Mudança pendente por imagem: arquivo novo, null (remover) ou ausente (sem mudança). */
  private readonly mudancas: Partial<Record<ImagemDoModelo, File | null>> = {};
  protected readonly erroImagem = signal('');
  private readonly areaTexto = viewChild<ElementRef<HTMLTextAreaElement>>('texto');
  /** Live Preview (SPEC-055): painel ao lado do texto, atualizado a cada tecla. */
  protected readonly previaAberta = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados.contrato?.nome ?? '', [Validators.required, Validators.pattern(/\S/)]],
    texto: [this.dados.contrato?.texto ?? '', [Validators.required, Validators.pattern(/\S/)]],
  });
  private readonly textoAtual = toSignal(this.form.controls.texto.valueChanges, { initialValue: this.form.controls.texto.value });
  private readonly nomeAtualSinal = toSignal(this.form.controls.nome.valueChanges, { initialValue: this.form.controls.nome.value });
  protected readonly nomeAtual = computed(() => this.nomeAtualSinal().trim());
  protected readonly previa = computed(() => previaDestacada(this.textoAtual(), this.dados.campos));
  protected readonly desconhecidas = computed(() => tagsDesconhecidas(this.textoAtual(), this.dados.campos));
  private readonly dialog = inject(MatDialog);
  /** Texto digitado na busca do seletor; ao escolher uma tag volta a ficar vazio. */
  protected readonly busca = new FormControl<string | CampoMesclagem>('', { nonNullable: true });
  private readonly termo = toSignal(this.busca.valueChanges, { initialValue: '' });
  protected readonly filtrados = computed(() => {
    const valor = this.termo();
    return filtrarCampos(this.dados.campos, typeof valor === 'string' ? valor : '');
  });

  constructor() {
    const contrato = this.dados.contrato;
    this.carregarExistente('logo', contrato?.logoArquivoId);
    this.carregarExistente('fundo', contrato?.fundoArquivoId);
    inject(DestroyRef).onDestroy(() => Object.values(this.urls()).forEach((url) => url && URL.revokeObjectURL(url)));
  }

  protected urlDe(qual: ImagemDoModelo): string | null {
    return this.urls()[qual];
  }

  private carregarExistente(qual: ImagemDoModelo, arquivoId?: string | null): void {
    if (!arquivoId) return;
    this.negocio.baixarArquivo(arquivoId).subscribe({ next: (blob) => this.definirUrl(qual, URL.createObjectURL(blob)) });
  }

  private definirUrl(qual: ImagemDoModelo, url: string | null): void {
    const anterior = this.urls()[qual];
    if (anterior) URL.revokeObjectURL(anterior);
    this.urls.update((atual) => ({ ...atual, [qual]: url }));
  }

  protected escolherImagem(qual: ImagemDoModelo, evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = '';
    if (!arquivo) return;
    const erro = imagemModeloValida(arquivo);
    this.erroImagem.set(erro ?? '');
    if (erro) return;
    this.mudancas[qual] = arquivo;
    this.definirUrl(qual, URL.createObjectURL(arquivo));
  }

  protected remover(qual: ImagemDoModelo): void {
    this.erroImagem.set('');
    this.mudancas[qual] = null;
    this.definirUrl(qual, null);
  }

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
      return;
    }
    const valor = this.form.getRawValue();
    this.ref.close({ nome: valor.nome.trim(), texto: valor.texto, imagens: { ...this.mudancas } });
  }
}

/** Tela Contratos (SPEC-030 §6.1): lista e botão "Novo contrato" acima da tabela. */
@Component({
  selector: 'app-contratos',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, GdDataPipe, MatTooltipModule],
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
                  <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrir(contrato)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir(contrato)"><mat-icon>delete</mat-icon></button>
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
      this.dialog.open(ContratoDialog, { ...DIALOG_LARGO, width: 'min(1180px, calc(100vw - 32px))', data: { contrato, campos: this.campos } }).afterClosed().subscribe((pedido?: ContratoPedido) => {
        if (!pedido) return;
        this.contratoClient.salvar(contrato?.id ?? null, { nome: pedido.nome, texto: pedido.texto }).pipe(
          // Logo e fundo (SPEC-056) vão depois do modelo salvo, que precisa existir para receber o arquivo.
          switchMap((salvo) => {
            const passos = (['logo', 'fundo'] as ImagemDoModelo[])
              .filter((qual) => qual in pedido.imagens)
              .map((qual) => {
                const arquivo = pedido.imagens[qual];
                return arquivo ? this.contratoClient.enviarImagem(salvo.id, qual, arquivo) : this.contratoClient.removerImagem(salvo.id, qual);
              });
            return passos.length ? concat(...passos).pipe(toArray()) : of([]);
          }),
        ).subscribe({
          next: () => {
            this.toast.sucesso(contrato ? 'Modelo atualizado.' : 'Modelo criado.');
            this.carregar();
          },
          error: (erro: unknown) => {
            this.toast.erro(mensagemDeErro(erro));
            this.carregar();
          },
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
