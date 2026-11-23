import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { QuillEditorComponent, QuillModules } from 'ngx-quill';
import type Quill from 'quill';

/** Texto antigo (sem HTML) vira parágrafos, para o editor não perder as quebras de linha. */
export function textoParaHtml(texto: string | null | undefined): string {
  const valor = texto ?? '';
  if (!valor.trim() || ehHtml(valor)) {
    return valor;
  }
  const escapar = (linha: string) => linha.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return valor.split(/\r?\n/).map((linha) => `<p>${linha ? escapar(linha) : '<br>'}</p>`).join('');
}

/**
 * O HTML do Quill 2 troca todo espaço por &nbsp;, e aí a linha não quebra entre palavras.
 * Cada sequência vira um espaço comum; só os espaços repetidos continuam como &nbsp;.
 */
export function espacosNormais(html: string): string {
  return html.replace(/(?:&nbsp;)+/g, (sequencia) => ' ' + '&nbsp;'.repeat(sequencia.length / 6 - 1));
}

/** Conteúdo gravado pelo editor começa com uma tag HTML; texto antigo, não. */
export function ehHtml(texto: string | null | undefined): boolean {
  return /^\s*<[a-z]/i.test(texto ?? '');
}

/**
 * Editor com formatação (negrito, itálico, sublinhado, listas, link). Guarda HTML.
 * `inserirTag` põe {{marca}} no último ponto do cursor, sem a formatação ao redor.
 */
@Component({
  selector: 'app-editor-rico',
  imports: [QuillEditorComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => EditorRico), multi: true }],
  template: `
    <quill-editor
      class="editor-rico"
      [class.invalido]="invalido()"
      format="html"
      theme="snow"
      [modules]="modulos"
      [placeholder]="placeholder()"
      [readOnly]="desabilitado()"
      [style.--altura]="altura()"
      [ngModel]="valor()"
      (ngModelChange)="mudou($event)"
      (onEditorCreated)="criado($event)"
      (onBlur)="tocado()"
      [attr.aria-label]="rotulo()"
    />
  `,
  styles: `
    :host { display: block; }
    .editor-rico { display: block; }
    :host ::ng-deep .ql-toolbar.ql-snow { border-color: var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-small) var(--mat-sys-corner-small) 0 0; background: var(--mat-sys-surface-container); }
    :host ::ng-deep .ql-container.ql-snow { border-color: var(--mat-sys-outline-variant); border-radius: 0 0 var(--mat-sys-corner-small) var(--mat-sys-corner-small); font-family: inherit; font-size: 14px; }
    :host ::ng-deep .ql-editor { min-height: var(--altura, 200px); max-height: 70vh; overflow-y: auto; line-height: 1.5; color: var(--mat-sys-on-surface); }
    :host ::ng-deep .ql-editor.ql-blank::before { color: var(--mat-sys-on-surface-variant); font-style: normal; }
    :host ::ng-deep .ql-snow .ql-stroke { stroke: var(--mat-sys-on-surface-variant); }
    :host ::ng-deep .ql-snow .ql-fill { fill: var(--mat-sys-on-surface-variant); }
    :host ::ng-deep .ql-snow .ql-picker { color: var(--mat-sys-on-surface-variant); }
    :host ::ng-deep .ql-snow .ql-picker-options { background: var(--mat-sys-surface-container-high); }
    :host ::ng-deep .ql-snow .ql-tooltip { background: var(--mat-sys-surface-container-high); color: var(--mat-sys-on-surface); border-color: var(--mat-sys-outline-variant); box-shadow: none; z-index: 2; }
    :host ::ng-deep .ql-snow .ql-tooltip input[type=text] { background: var(--mat-sys-surface); color: var(--mat-sys-on-surface); border-color: var(--mat-sys-outline-variant); }
    :host ::ng-deep .ql-snow button:hover .ql-stroke, :host ::ng-deep .ql-snow button.ql-active .ql-stroke { stroke: var(--mat-sys-primary); }
    :host ::ng-deep .ql-snow button:hover .ql-fill, :host ::ng-deep .ql-snow button.ql-active .ql-fill { fill: var(--mat-sys-primary); }
    :host ::ng-deep .ql-snow a { color: var(--mat-sys-primary); }
    .invalido ::ng-deep .ql-container.ql-snow, .invalido ::ng-deep .ql-toolbar.ql-snow { border-color: var(--mat-sys-error); }
  `,
})
export class EditorRico implements ControlValueAccessor {
  readonly placeholder = input('');
  readonly rotulo = input('');
  readonly altura = input('200px');
  readonly invalido = input(false);

  protected readonly modulos: QuillModules = {
    toolbar: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link'],
      ['clean'],
    ],
  };

  protected readonly valor = signal('');
  protected readonly desabilitado = signal(false);
  private editor: Quill | null = null;
  private ultimoIndice: number | null = null;
  private aoMudar: (valor: string) => void = () => {};
  private aoTocar: () => void = () => {};

  writeValue(valor: string | null): void {
    this.valor.set(textoParaHtml(valor));
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  protected criado(editor: Quill): void {
    this.editor = editor;
    // Guarda o cursor a cada mudança (digitação ou clique): ao clicar fora (busca de tag, botão), o Quill perde a seleção.
    editor.on('editor-change', () => {
      const intervalo = editor.getSelection();
      if (intervalo) {
        this.ultimoIndice = intervalo.index;
      }
    });
  }

  protected mudou(html: string | null): void {
    // Só o formulário recebe o valor normalizado; devolver ao editor reposicionaria o cursor a cada tecla.
    this.aoMudar(espacosNormais(html ?? ''));
  }

  protected tocado(): void {
    this.aoTocar();
  }

  /** Insere {{marca}} onde o cursor estava (ou no fim) e devolve o foco ao editor. */
  inserirTag(marca: string): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }
    const trecho = `{{${marca}}}`;
    const indice = this.ultimoIndice ?? Math.max(editor.getLength() - 1, 0);
    const semFormato = { bold: false, italic: false, underline: false, strike: false, link: false };
    editor.insertText(indice, trecho, semFormato, 'user');
    editor.setSelection(indice + trecho.length, 0, 'user');
    this.ultimoIndice = indice + trecho.length;
  }
}
