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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  CampoMesclagem,
  Contrato,
  ContratoClient,
  ContratoResumo,
  FormatoModelo,
  IMAGEM_MODELO_ACEITA,
  PreviaWord,
  ImagemDoModelo,
  imagemModeloValida,
  WORD_ACEITO,
  wordValido,
} from '../../core/contrato.client';
import { PreviaWordComponent } from './previa-word';
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
  formato: FormatoModelo;
  wordArquivoId: string | null;
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

/**
 * Contrato de exemplo do help do modo "Escrever na plataforma": curto (uma página), genérico, sem dado pessoal real,
 * com as tags no lugar dos dados e o espaço de assinatura escrito no próprio texto.
 */
export const CONTRATO_EXEMPLO = [
  'QUADRO-RESUMO',
  'CONTRATADA: {{contratada_nome}}, CPF/CNPJ nº {{contratada_documento}}, com endereço em {{contratada_endereco}}, representada por {{contratada_responsavel}}.',
  'CONTRATANTE: {{contratante_nome}}, {{contratante_nacionalidade}}, {{contratante_estado_civil}}, {{contratante_profissao}}, CPF/CNPJ nº {{contratante_documento}}, residente em {{contratante_endereco}}, e-mail {{contratante_email}}, celular {{contratante_telefone}}.',
  'EVENTO: {{evento_tipo}} em {{evento_data}}, cerimônia em {{evento_local_cerimonia}}, recepção em {{evento_local_recepcao}}, cerca de {{evento_convidados}} convidados.',
  'VALOR: {{contrato_valor}}, pago assim: {{contrato_parcelas}}. Pix: {{contratada_pix}}.',
  '',
  'CLÁUSULA 1ª – DO OBJETO. Assessoria completa do evento do Quadro-Resumo: planejamento, apoio na escolha dos fornecedores, roteiros, ensaio e coordenação no dia, com 1 cerimonialista e 2 assistentes.',
  'CLÁUSULA 2ª – DO PAGAMENTO. O saldo deve estar quitado até 10 dias antes do evento; atrasos têm multa de 2% e juros de 1% ao mês.',
  'CLÁUSULA 3ª – DA DESISTÊNCIA. Em até 7 dias da assinatura, a desistência tem devolução integral; depois, a CONTRATADA retém parte do valor conforme a antecedência.',
  'CLÁUSULA 4ª – DO FORO. Foro da comarca do domicílio do(a) CONTRATANTE.',
  '',
  'E, por estarem de acordo, as partes assinam este contrato em {{data_hoje}}.',
  '',
  '______________________________________',
  '{{contratada_nome}} – CONTRATADA',
  '',
  '______________________________________',
  '{{contratante_nome}} – CONTRATANTE',
].join('\n');

/** Logo e fundo de exemplo, desenhados na hora (PNG), para o help mostrar o contrato completo sem arquivo real. */
function imagemExemplo(largura: number, altura: number, desenhar: (ctx: CanvasRenderingContext2D) => void): string | null {
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext('2d');
  if (!ctx) return null;
  desenhar(ctx);
  return tela.toDataURL('image/png');
}

const LOGO_EXEMPLO = () =>
  imagemExemplo(400, 160, (ctx) => {
    ctx.strokeStyle = '#9a6b5b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(200, 58, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#9a6b5b';
    ctx.textAlign = 'center';
    ctx.font = 'italic 40px Georgia, serif';
    ctx.fillText('CE', 200, 72);
    ctx.font = '22px Georgia, serif';
    ctx.fillText('CERIMONIAL EXEMPLO', 200, 140);
  });

const FUNDO_EXEMPLO = () =>
  imagemExemplo(595, 842, (ctx) => {
    const degrade = ctx.createLinearGradient(0, 0, 595, 842);
    degrade.addColorStop(0, '#f3d9cf');
    degrade.addColorStop(1, '#e8c3b4');
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, 595, 842);
    ctx.strokeStyle = '#b07a66';
    ctx.lineWidth = 3;
    for (const [x, y, r] of [[60, 60, 90], [540, 790, 120], [300, 430, 180]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

/** Como funciona o modelo escrito na plataforma: texto, tags, imagens, assinatura e um contrato de exemplo. */
@Component({
  selector: 'app-ajuda-texto-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, FolhaContrato],
  template: `
    <h2 mat-dialog-title>Como funciona o modelo escrito na plataforma</h2>
    <mat-dialog-content>
      <ol class="passos text-sm">
        <li><strong>Escreva o texto do contrato</strong> no campo "Texto do contrato", do jeito que ele deve chegar ao cliente: título, cláusulas e parágrafos. Cada quebra de linha do texto vira uma linha no contrato; deixe uma linha vazia para separar os blocos.</li>
        <li><strong>Use tags no lugar dos dados que mudam</strong> de cliente para cliente, como nome, CPF, data e local do evento e valor. Clique no texto onde o dado deve entrar e escolha a tag em "Inserir tag no cursor". Ela aparece assim: <code ngNonBindable>{{contratante_nome}}</code>.</li>
        <li>Quando o contrato é gerado para uma oportunidade, cada tag é trocada pelo dado real do cliente, do evento, do orçamento aprovado e da sua empresa. Se faltar algum dado, aparece uma linha em branco (________) para preencher à mão.</li>
        <li><strong>Logo e imagem de fundo</strong> são opcionais: envie nos campos "Logo" e "Imagem de fundo". A logo fica centralizada no topo e o fundo cobre cada folha, com transparência.</li>
        <li><strong>Inclua o espaço para assinatura no final do texto</strong>: uma linha (______) e, embaixo, o nome e o papel de cada parte. Use as tags <code ngNonBindable>{{contratante_nome}}</code> e <code ngNonBindable>{{contratada_nome}}</code> para os nomes saírem preenchidos.</li>
        <li>Abra o <strong>Live Preview</strong> para ver o contrato como chega ao cliente, com exemplos no lugar das tags. Use "Ver em tela cheia" para ler com mais espaço.</li>
      </ol>

      <h3 class="text-base font-semibold mb-2">Exemplo de contrato</h3>
      <p class="text-muted text-xs mb-3">Um modelo pequeno e genérico, com logo, imagem de fundo, tags e espaço para assinatura. Os dados destacados são exemplos fictícios.</p>
      <div class="exemplo">
        <div class="texto-exemplo">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold text-sm">Texto para colar no editor</span>
            <button mat-button type="button" (click)="copiar()"><mat-icon>{{ copiado() ? 'check' : 'content_copy' }}</mat-icon> {{ copiado() ? 'Copiado!' : 'Copiar texto' }}</button>
          </div>
          <pre>{{ exemplo }}</pre>
        </div>
        <div class="previa-exemplo">
          <span class="font-semibold text-sm block mb-2">Como chega ao cliente</span>
          <app-folha-contrato titulo="Contrato de Assessoria e Cerimonial" [html]="previa" [logoUrl]="logoUrl" [fundoUrl]="fundoUrl" />
        </div>
      </div>
      <p class="text-muted text-xs mt-3 mb-0">Prefere usar um contrato que já tem pronto? Escolha "Enviar meu documento Word" e veja "Como preparar o Word".</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(exemplo)"><mat-icon>edit_note</mat-icon> Usar este exemplo no texto</button>
      <button mat-flat-button type="button" mat-dialog-close>Entendi</button>
    </mat-dialog-actions>
  `,
  styles: `
    .passos { margin: 0 0 20px; padding-left: 20px; display: grid; gap: 8px; line-height: 1.5; }
    code { font-size: 12px; }
    .exemplo { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 1000px) { .exemplo { grid-template-columns: minmax(0, 1fr) 640px; } }
    pre { margin: 0; max-height: 70vh; overflow: auto; white-space: pre-wrap; font: 12px/1.5 ui-monospace, Consolas, monospace; padding: 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-small); }
    .previa-exemplo { min-width: 0; }
  `,
})
export class AjudaTextoDialog {
  protected readonly dados = inject<{ campos: CampoMesclagem[] }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<AjudaTextoDialog, string>);
  protected readonly exemplo = CONTRATO_EXEMPLO;
  protected readonly previa = previaDestacada(CONTRATO_EXEMPLO, this.dados.campos);
  protected readonly logoUrl = LOGO_EXEMPLO();
  protected readonly fundoUrl = FUNDO_EXEMPLO();
  protected readonly copiado = signal(false);

  protected copiar(): void {
    void navigator.clipboard?.writeText(this.exemplo).then(() => this.copiado.set(true));
  }
}

/** Orientações para preparar o próprio Word: como escrever as tags e a lista completa, com botão de copiar. */
@Component({
  selector: 'app-ajuda-word-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>Como preparar o seu contrato no Word</h2>
    <mat-dialog-content>
      <ol class="passos text-sm">
        <li>Abra o seu contrato no <strong>Microsoft Word</strong> (ou Google Docs / LibreOffice) e salve no formato <strong>.docx</strong>. Outros formatos (.doc, .pdf, .odt) não são aceitos.</li>
        <li>No lugar de cada dado que muda de cliente para cliente, escreva a <strong>tag</strong> entre chaves duplas, por exemplo <code ngNonBindable>{{contratante_nome}}</code>. Use o botão <mat-icon class="mini">content_copy</mat-icon> da tabela para copiar e cole no Word.</li>
        <li>Escreva a tag <strong>sem espaços nem acentos</strong> e com as chaves duplas dos dois lados. Maiúsculas e minúsculas tanto faz.</li>
        <li>A formatação é mantida: o valor entra com a mesma fonte, tamanho, cor, negrito ou itálico aplicados à tag. Para deixar o nome do cliente em negrito, deixe a tag em negrito.</li>
        <li>Tags funcionam no texto, em tabelas, no <strong>cabeçalho</strong> e no <strong>rodapé</strong>. Logo, imagens, numeração de páginas e espaços para assinatura do seu Word ficam como estão.</li>
        <li>Envie o arquivo e confira o <strong>Live Preview</strong>: os valores em amarelo são exemplos. Tags com erro de digitação aparecem no aviso e não são trocadas.</li>
        <li>Quando um dado não existir no cadastro, o contrato mostra uma linha em branco (________) para preencher à mão.</li>
        <li>Para mudar o texto depois, edite o arquivo no seu computador e envie de novo no modelo. Contratos já gerados não mudam.</li>
      </ol>
      <div class="tabela-tags">
        <table class="w-full text-sm">
          <thead>
            <tr><th>Tag para colar no Word</th><th>O que representa</th><th>De onde puxa o valor</th><th>Exemplo</th></tr>
          </thead>
          <tbody>
            @for (campo of dados.campos; track campo.marca) {
              <tr>
                <td class="whitespace-nowrap">
                  <code>{{ marca(campo) }}</code>
                  <button mat-icon-button type="button" class="copiar" [attr.aria-label]="'Copiar ' + marca(campo)" [matTooltip]="copiada() === campo.marca ? 'Copiada!' : 'Copiar'" (click)="copiar(campo)">
                    <mat-icon>{{ copiada() === campo.marca ? 'check' : 'content_copy' }}</mat-icon>
                  </button>
                </td>
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
      <button mat-stroked-button type="button" (click)="copiarTodas()"><mat-icon>content_copy</mat-icon> Copiar todas as tags</button>
      <button mat-flat-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .passos { margin: 0 0 16px; padding-left: 20px; display: grid; gap: 6px; line-height: 1.5; }
    .mini { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; }
    .tabela-tags { overflow-x: auto; }
    th { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    td { vertical-align: middle; padding: 4px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    code { font-size: 12px; white-space: nowrap; }
    .copiar { transform: scale(0.8); }
  `,
})
export class AjudaWordDialog {
  protected readonly dados = inject<{ campos: CampoMesclagem[] }>(MAT_DIALOG_DATA);
  protected readonly copiada = signal<string | null>(null);

  protected marca(campo: CampoMesclagem): string {
    return `{{${campo.marca}}}`;
  }

  protected copiar(campo: CampoMesclagem): void {
    void navigator.clipboard?.writeText(this.marca(campo)).then(() => this.copiada.set(campo.marca));
  }

  protected copiarTodas(): void {
    const texto = this.dados.campos.map((campo) => `${this.marca(campo)}\t${campo.rotulo}`).join('\n');
    void navigator.clipboard?.writeText(texto).then(() => this.copiada.set('*'));
  }
}

/** Live Preview em tela cheia (os dois formatos): só a visualização, num modal grande. */
@Component({
  selector: 'app-previa-ampliada-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, FolhaContrato, PreviaWordComponent],
  template: `
    <div class="topo">
      <h2 mat-dialog-title class="m-0!">Live Preview · {{ dados.titulo }}</h2>
      <button mat-icon-button type="button" aria-label="Fechar" mat-dialog-close><mat-icon>close</mat-icon></button>
    </div>
    <mat-dialog-content class="conteudo">
      @if (dados.word) {
        <app-previa-word [documento]="dados.word" [ampliada]="true" />
      } @else {
        <div class="folha-grande">
          <app-folha-contrato [titulo]="dados.titulo" [html]="dados.html" [logoUrl]="dados.logoUrl" [fundoUrl]="dados.fundoUrl" />
        </div>
      }
    </mat-dialog-content>
    <p class="text-muted text-xs px-6 pb-4 m-0">Os valores destacados são exemplos. No contrato real entram os dados do cliente, do evento e do orçamento aprovado.</p>
  `,
  styles: `
    .topo { display: flex; align-items: center; justify-content: space-between; padding-right: 12px; }
    .conteudo { max-height: none !important; height: calc(95vh - 140px); display: flex; flex-direction: column; }
    .conteudo > * { flex: 1; min-height: 0; }
    .folha-grande ::ng-deep .area { max-height: none; height: 100%; box-sizing: border-box; }
  `,
})
export class PreviaAmpliadaDialog {
  protected readonly dados = inject<{ titulo: string; html: string; logoUrl: string | null; fundoUrl: string | null; word: string | null }>(MAT_DIALOG_DATA);
}

/** Novo/editar modelo de contrato com seletor de tags com busca e ajuda (SPEC-053) e Live Preview (SPEC-055, evolui o "Ver como fica" da SPEC-030 §6.1). */
@Component({
  selector: 'app-contrato-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    FolhaContrato,
    MatTooltipModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    PreviaWordComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados.contrato ? 'Editar modelo de contrato' : 'Novo modelo de contrato' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">
      {{ ehWord() ? 'Envie o seu contrato em Word com as tags no lugar dos dados. Elas são trocadas pelos dados do evento.' : 'Clique num campo para inserir no texto. Ele é trocado pelos dados do evento.' }}
    </p>
    <mat-dialog-content>
      <form id="contrato" class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Nome'" matInput formControlName="nome" maxlength="120" required />
          @if (form.controls.nome.invalid) { <mat-error>Informe o nome.</mat-error> }
        </mat-form-field>
        </div>
        <div class="campo">
          <span class="font-semibold mb-2 block" id="rotulo-formato">Como você quer criar o modelo?</span>
          <mat-button-toggle-group class="formato" aria-labelledby="rotulo-formato" [value]="formato()" (change)="trocarFormato($event.value)">
            <mat-button-toggle value="texto"><mat-icon>edit_note</mat-icon> Escrever na plataforma</mat-button-toggle>
            <mat-button-toggle value="word"><mat-icon>description</mat-icon> Enviar meu documento Word</mat-button-toggle>
          </mat-button-toggle-group>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <span class="text-muted text-xs">Escolha uma das opções. O modelo usa só a opção escolhida.</span>
            @if (!ehWord()) {
              <button mat-button type="button" (click)="abrirAjudaTexto()"><mat-icon>help_outline</mat-icon> Como funciona</button>
            }
          </div>
        </div>
        @if (ehWord()) {
          <div class="word">
            <div class="flex flex-wrap items-center gap-2">
              <mat-icon class="text-muted">description</mat-icon>
              <span class="font-medium">{{ wordNome() || 'Nenhum documento enviado' }}</span>
              <span class="flex-1"></span>
              <button mat-stroked-button type="button" [disabled]="enviandoWord()" (click)="entradaWord.click()">
                <mat-icon>upload</mat-icon> {{ wordArquivoId() ? 'Trocar documento' : 'Enviar documento .docx' }}
              </button>
              @if (wordArquivoId()) {
                <button mat-button type="button" (click)="baixarWord()"><mat-icon>download</mat-icon> Baixar</button>
              }
              <button mat-button type="button" (click)="abrirAjudaWord()"><mat-icon>help_outline</mat-icon> Como preparar o Word</button>
              <input #entradaWord type="file" hidden [accept]="aceitaWord" aria-label="Documento Word do modelo" (change)="escolherWord($event)" />
            </div>
            <span class="text-muted text-xs block mt-1">Somente Word (.docx), até 10 MB. A logo, o fundo e o layout vêm do próprio documento.</span>
            @if (enviandoWord()) { <mat-progress-bar mode="indeterminate" class="mt-2" /> }
            @if (erroWord()) { <p class="aviso mt-2" role="alert">{{ erroWord() }}</p> }
            @if (tentouSalvar() && !wordArquivoId()) { <p class="erro mt-2" role="alert">Envie o documento Word do modelo.</p> }
            @if (previaWord(); as previa) {
              @if (previa.desconhecidas.length > 0) {
                <p class="aviso mt-2" role="status">Tag que não existe e não será trocada: {{ previa.desconhecidas.join(', ') }}. Confira a grafia em "Como preparar o Word".</p>
              } @else if (previa.tags.length === 0) {
                <p class="aviso mt-2" role="status">Nenhuma tag encontrada no documento. Sem tags, o contrato sai igual para todos os clientes.</p>
              } @else {
                <p class="ok mt-2" role="status"><mat-icon class="mini">check_circle</mat-icon> {{ previa.tags.length }} {{ previa.tags.length === 1 ? 'tag reconhecida' : 'tags reconhecidas' }}.</p>
              }
            }
          </div>
        }
        @if (ehWord()) {
          <div class="barra-previa">
            <button mat-stroked-button type="button" [disabled]="!previaWord()" (click)="ampliar()">
              <mat-icon>open_in_full</mat-icon> Ver em tela cheia
            </button>
          </div>
          <div class="painel-previa" aria-label="Live Preview">
            <span class="font-semibold mb-2 block">Live Preview · como chega ao cliente</span>
            @if (previaWord(); as previa) {
              <app-previa-word [documento]="previa.documento" />
              <p class="text-muted text-xs mt-2">Os valores em amarelo são exemplos. No contrato real entram os dados do evento; sem dado, aparece ________.</p>
            } @else {
              <p class="vazio text-muted text-sm">Envie o documento .docx para ver o Live Preview.</p>
            }
          </div>
        } @else {
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
        <div class="ferramentas">
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
          <button mat-stroked-button type="button" [attr.aria-pressed]="previaAberta()" (click)="previaAberta.set(!previaAberta())">
            <mat-icon>{{ previaAberta() ? 'visibility_off' : 'visibility' }}</mat-icon> {{ previaAberta() ? 'Fechar Live Preview' : 'Live Preview' }}
          </button>
          <button mat-stroked-button type="button" (click)="ampliar()">
            <mat-icon>open_in_full</mat-icon> Tela cheia
          </button>
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
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="contrato">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .barra-previa { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .ferramentas { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
    .seletor-tags { display: flex; align-items: center; gap: 4px; flex: 0 1 340px; min-width: 240px; }
    .seletor-tags mat-form-field { flex: 1; }
    .seletor-tags ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .editor { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 900px) { .editor.com-previa { grid-template-columns: minmax(320px, 2fr) 3fr; } }
    .painel-previa ::ng-deep .area { max-height: 78vh; }
    .formato { flex-wrap: wrap; }
    .word { padding: 12px 16px; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-medium); }
    .mini { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; }
    .ok { margin: 0; font-size: 12px; color: #166534; }
    .erro { margin: 0; font-size: 12px; color: var(--mat-sys-error); }
    .vazio { padding: 48px 16px; text-align: center; border: 1px dashed var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-small); }
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
  private readonly contratoClient = inject(ContratoClient);
  protected readonly aceitaWord = WORD_ACEITO;
  /** Formato escolhido: um ou outro (escrever na plataforma ou documento Word próprio). */
  protected readonly formato = signal<FormatoModelo>(this.dados.contrato?.formato === 'word' || this.dados.contrato?.wordArquivoId ? 'word' : 'texto');
  protected readonly ehWord = computed(() => this.formato() === 'word');
  protected readonly wordArquivoId = signal<string | null>(this.dados.contrato?.wordArquivoId ?? null);
  protected readonly wordNome = signal<string | null>(this.dados.contrato?.wordNome ?? null);
  protected readonly previaWord = signal<PreviaWord | null>(null);
  protected readonly enviandoWord = signal(false);
  protected readonly erroWord = signal('');
  protected readonly tentouSalvar = signal(false);
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
    this.trocarFormato(this.formato());
    if (this.wordArquivoId()) this.carregarPreviaWord(this.wordArquivoId()!);
  }

  protected trocarFormato(formato: FormatoModelo): void {
    this.formato.set(formato);
    // Texto é obrigatório só no editor da plataforma; no Word o conteúdo vem do documento.
    const texto = this.form.controls.texto;
    texto.setValidators(formato === 'texto' ? [Validators.required, Validators.pattern(/\S/)] : []);
    texto.updateValueAndValidity();
  }

  protected escolherWord(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = '';
    if (!arquivo) return;
    const erro = wordValido(arquivo);
    this.erroWord.set(erro ?? '');
    if (erro) return;
    this.enviandoWord.set(true);
    this.contratoClient.enviarWord(arquivo).subscribe({
      next: (enviado) => {
        this.wordArquivoId.set(enviado.arquivoId);
        this.wordNome.set(enviado.nome);
        this.carregarPreviaWord(enviado.arquivoId);
      },
      error: (falha: unknown) => {
        this.enviandoWord.set(false);
        this.erroWord.set(mensagemDeErro(falha));
      },
    });
  }

  private carregarPreviaWord(arquivoId: string): void {
    this.enviandoWord.set(true);
    this.contratoClient.previaWord(arquivoId).subscribe({
      next: (previa) => {
        this.enviandoWord.set(false);
        this.previaWord.set(previa);
      },
      error: (falha: unknown) => {
        this.enviandoWord.set(false);
        this.previaWord.set(null);
        this.erroWord.set(mensagemDeErro(falha));
      },
    });
  }

  protected baixarWord(): void {
    const id = this.wordArquivoId();
    if (!id) return;
    this.negocio.baixarArquivo(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.wordNome() || 'modelo.docx';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    });
  }

  protected abrirAjudaTexto(): void {
    this.dialog
      .open(AjudaTextoDialog, { ...DIALOG_LARGO, width: 'min(1200px, calc(100vw - 32px))', maxHeight: '95vh', data: { campos: this.dados.campos } })
      .afterClosed()
      .subscribe((texto?: string) => {
        if (texto) this.form.controls.texto.setValue(texto);
      });
  }

  protected abrirAjudaWord(): void {
    this.dialog.open(AjudaWordDialog, { ...DIALOG_LARGO, width: 'min(1000px, calc(100vw - 32px))', data: { campos: this.dados.campos } });
  }

  /** Live Preview num modal grande, só com a visualização. */
  protected ampliar(): void {
    this.dialog.open(PreviaAmpliadaDialog, {
      ...DIALOG_LARGO,
      width: 'min(1280px, calc(100vw - 32px))',
      height: '95vh',
      maxHeight: '95vh',
      autoFocus: false,
      data: {
        titulo: this.nomeAtual() || 'Contrato',
        html: this.previa(),
        logoUrl: this.urlDe('logo'),
        fundoUrl: this.urlDe('fundo'),
        word: this.ehWord() ? (this.previaWord()?.documento ?? null) : null,
      },
    });
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
    this.tentouSalvar.set(true);
    if (this.form.invalid || (this.ehWord() && (!this.wordArquivoId() || this.enviandoWord()))) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    this.ref.close({
      nome: valor.nome.trim(),
      texto: this.ehWord() ? '' : valor.texto,
      formato: this.formato(),
      wordArquivoId: this.ehWord() ? this.wordArquivoId() : null,
      imagens: this.ehWord() ? {} : { ...this.mudancas },
    });
  }
}

/** Tela Contratos (SPEC-030 §6.1): lista e botão "Novo contrato" acima da tabela. */
@Component({
  selector: 'app-contratos',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, GdDataPipe, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div>
        <mat-card-title class="mb-0">Modelos de Contrato</mat-card-title>
        <mat-card-subtitle>Modelos dos contratos que você envia aos clientes, para orçamentos aprovados. Os campos puxam os dados do contratante, do evento, do orçamento aprovado e da sua empresa.</mat-card-subtitle>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
      <div class="barra-lista">
        <div class="barra-lista-filtros">
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="busca()" (input)="busca.set($any($event.target).value)" />
          </mat-form-field>
          </div>
        </div>
        <div class="barra-lista-acoes">
          <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo modelo</button>
        </div>
      </div>
      @if (visiveis().length === 0) {
        <p class="text-center text-muted py-10">{{ contratos().length === 0 ? 'Nenhum modelo cadastrado.' : 'Nenhum modelo com esse nome.' }}</p>
      } @else {
        <table class="tabela">
          <thead><tr><th>Nome</th><th>Tipo</th><th>Atualizado em</th><th class="text-end! whitespace-nowrap">Ações</th></tr></thead>
          <tbody>
            @for (contrato of visiveis(); track contrato.id) {
              <tr>
                <td>{{ contrato.nome }}</td>
                <td>{{ contrato.formato === 'word' ? 'Documento Word' : 'Escrito na plataforma' }}</td>
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
      this.dialog.open(ContratoDialog, { ...DIALOG_LARGO, width: 'min(1480px, calc(100vw - 32px))', maxHeight: '95vh', data: { contrato, campos: this.campos } }).afterClosed().subscribe((pedido?: ContratoPedido) => {
        if (!pedido) return;
        this.contratoClient.salvar(contrato?.id ?? null, { nome: pedido.nome, texto: pedido.texto, formato: pedido.formato, wordArquivoId: pedido.wordArquivoId }).pipe(
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
