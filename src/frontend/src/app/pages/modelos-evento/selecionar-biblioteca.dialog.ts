import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FecharModal } from '../../shared/fechar-modal';

export interface ItemBiblioteca {
  id: string;
  nome: string;
}

export interface SelecionarBibliotecaDados {
  /** Plural em minúsculas, usado nos textos ("briefings"). */
  titulo: string;
  itens: ItemBiblioteca[];
  /** Ids já vinculados; ficam desabilitados. */
  jaVinculados: string[];
}

/** Escolhe vários modelos da biblioteca de uma vez, no mesmo padrão do modal de serviços. */
@Component({
  selector: 'app-selecionar-biblioteca',
  imports: [FecharModal, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Adicionar {{ dados.titulo }} <app-fechar-modal /></h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Marque os modelos que devem acompanhar este modelo de evento.</p>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-icon matIconPrefix>search</mat-icon>
        <input matInput aria-label="Buscar" placeholder="Buscar" [value]="busca()" (input)="buscar($event)" />
      </mat-form-field>

      @if (dados.itens.length === 0) {
        <p class="text-muted text-sm">Nenhum modelo cadastrado ainda em {{ dados.titulo }}.</p>
      } @else {
        <div class="flex items-center justify-between mb-2">
          <button mat-button type="button" (click)="marcarVisiveis()">Marcar todos os visíveis</button>
          <span class="text-sm text-muted">{{ marcados().size }} selecionado(s)</span>
        </div>
        <ul class="lista divide-y divide-border">
          @for (item of visiveis(); track item.id) {
            <li class="py-2">
              <mat-checkbox [checked]="marcados().has(item.id)" [disabled]="jaVinculado(item)" (change)="alternar(item, $event.checked)">
                {{ item.nome }}
                @if (jaVinculado(item)) { <span class="text-xs text-muted"> · já vinculado</span> }
              </mat-checkbox>
            </li>
          } @empty {
            <li class="py-4 text-sm text-muted">Nada encontrado.</li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="marcados().size === 0" (click)="ref.close(escolhidos())">
        Adicionar{{ marcados().size ? ' (' + marcados().size + ')' : '' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `.lista { list-style: none; padding: 0; margin: 0; }`,
})
export class SelecionarBibliotecaDialog {
  protected readonly dados = inject<SelecionarBibliotecaDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<SelecionarBibliotecaDialog, string[]>);
  protected readonly busca = signal('');
  protected readonly marcados = signal<ReadonlySet<string>>(new Set());
  private readonly existentes = new Set(this.dados.jaVinculados);

  protected readonly visiveis = computed(() => {
    const termo = normalizar(this.busca());
    return [...this.dados.itens]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .filter((item) => !termo || normalizar(item.nome).includes(termo));
  });

  protected readonly escolhidos = computed(() => [...this.marcados()]);

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected jaVinculado(item: ItemBiblioteca): boolean {
    return this.existentes.has(item.id);
  }

  protected alternar(item: ItemBiblioteca, marcado: boolean): void {
    this.marcados.update((atual) => {
      const novo = new Set(atual);
      if (marcado) {
        novo.add(item.id);
      } else {
        novo.delete(item.id);
      }
      return novo;
    });
  }

  protected marcarVisiveis(): void {
    this.marcados.update((atual) => {
      const novo = new Set(atual);
      for (const item of this.visiveis()) {
        if (!this.jaVinculado(item)) {
          novo.add(item.id);
        }
      }
      return novo;
    });
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
