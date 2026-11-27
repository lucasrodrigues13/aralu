import { Component, computed, inject, signal } from '@angular/core';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { FecharModal } from '../../shared/fechar-modal';

export interface OpcaoSelecao {
  id: string;
  nome: string;
  /** Linha de apoio na lista (ex.: serviços que o fornecedor presta). */
  detalhe?: string;
  /** Já está no evento/serviço: aparece desabilitada. */
  bloqueada?: boolean;
  motivo?: string;
}

export interface SeletorMultiploDados {
  titulo: string;
  rotulo: string;
  descricao?: string;
  placeholder: string;
  textoCriar: string;
  confirmar: string;
  opcoes: OpcaoSelecao[];
  /** Abre o cadastro (com o termo digitado) e devolve o que foi criado, já marcado. */
  criar: (termo: string) => Observable<OpcaoSelecao[]>;
}

const CRIAR = '__criar__';

/** Escolha de vários itens com busca e cadastro na hora; fecha com os ids marcados. */
@Component({
  selector: 'app-seletor-multiplo-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule, MatChipsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ dados.titulo }} <app-fechar-modal /></h2>
    @if (dados.descricao) { <p class="text-muted text-sm px-6 -mt-2 mb-4">{{ dados.descricao }}</p> }
    <mat-dialog-content>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">{{ dados.rotulo }}</mat-label>
        <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <mat-chip-grid #chips [attr.aria-label]="dados.rotulo">
            @for (opcao of marcadas(); track opcao.id) {
              <mat-chip-row (removed)="desmarcar(opcao.id)">
                {{ opcao.nome }}
                <button matChipRemove type="button" [attr.aria-label]="'Remover ' + opcao.nome"><mat-icon>cancel</mat-icon></button>
              </mat-chip-row>
            }
            <input
              #campo
              [attr.aria-label]="'Buscar ' + dados.rotulo"
              [placeholder]="dados.placeholder"
              [value]="termo()"
              (input)="termo.set(campo.value)"
              [matChipInputFor]="chips"
              [matAutocomplete]="lista"
              #gatilho="matAutocompleteTrigger"
            />
          </mat-chip-grid>
          <mat-autocomplete #lista="matAutocomplete" class="painel-com-criar" (optionSelected)="escolher($event.option.value, campo, gatilho)">
            <mat-option class="opcao-criar" [value]="criar"><mat-icon>add</mat-icon> {{ dados.textoCriar }}</mat-option>
            @for (opcao of filtradas(); track opcao.id) {
              <mat-option [value]="opcao.id" [disabled]="opcao.bloqueada">
                <span class="opcao-nome">{{ opcao.nome }}</span>
                @if (opcao.bloqueada) { <span class="block text-xs text-muted">{{ opcao.motivo }}</span> }
                @else if (opcao.detalhe) { <span class="block text-xs text-muted">{{ opcao.detalhe }}</span> }
              </mat-option>
            } @empty {
              <mat-option disabled>Nada encontrado.</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="marcadas().length === 0" (click)="ref.close(ids())">{{ dados.confirmar }}</button>
    </mat-dialog-actions>
  `,
  styles: `.opcao-nome { display: block; font-size: 14px; line-height: 20px; }`,
})
export class SeletorMultiploDialog {
  protected readonly dados = inject<SeletorMultiploDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<SeletorMultiploDialog, string[]>);
  protected readonly criar = CRIAR;
  protected readonly termo = signal('');
  private readonly opcoes = signal<OpcaoSelecao[]>(this.dados.opcoes);
  protected readonly ids = signal<string[]>([]);

  protected readonly marcadas = computed(() => {
    const porId = new Map(this.opcoes().map((opcao) => [opcao.id, opcao]));
    return this.ids().map((id) => porId.get(id)).filter((opcao): opcao is OpcaoSelecao => !!opcao);
  });

  protected readonly filtradas = computed(() => {
    const termo = normalizar(this.termo());
    const marcados = new Set(this.ids());
    return this.opcoes()
      .filter((opcao) => !marcados.has(opcao.id))
      .filter((opcao) => !termo || normalizar(opcao.nome).includes(termo) || normalizar(opcao.detalhe ?? '').includes(termo))
      .sort((a, b) => Number(!!a.bloqueada) - Number(!!b.bloqueada) || a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  protected desmarcar(id: string): void {
    this.ids.update((lista) => lista.filter((item) => item !== id));
  }

  /** Marcar um item não fecha a lista: ela só fecha ao clicar fora. */
  protected escolher(valor: string, campo: HTMLInputElement, gatilho: MatAutocompleteTrigger): void {
    const termo = this.termo().trim();
    this.termo.set('');
    campo.value = '';
    if (valor !== CRIAR) {
      this.ids.update((lista) => (lista.includes(valor) ? lista : [...lista, valor]));
      setTimeout(() => {
        campo.focus();
        gatilho.openPanel();
      });
      return;
    }
    this.dados.criar(termo).subscribe((criadas) => {
      if (!criadas.length) {
        return;
      }
      this.opcoes.update((lista) => [...lista.filter((opcao) => !criadas.some((nova) => nova.id === opcao.id)), ...criadas]);
      this.ids.update((lista) => [...lista, ...criadas.filter((nova) => !nova.bloqueada && !lista.includes(nova.id)).map((nova) => nova.id)]);
    });
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
