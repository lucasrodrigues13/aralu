import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Cabeçalho das listas em acordeon: botão Expandir todos / Recolher todos e, à direita,
 * a contagem (conteúdo projetado). A lista logo abaixo usa a classe "com-cabecalho".
 */
@Component({
  selector: 'app-expandir-todos',
  imports: [MatIconModule],
  template: `
    <button type="button" class="alternar-todos" data-teste="alternar-todos" (click)="alternar.emit()">
      <mat-icon>{{ abertos() ? 'unfold_less' : 'unfold_more' }}</mat-icon> {{ abertos() ? 'Recolher todos' : 'Expandir todos' }}
    </button>
    <span class="text-sm text-muted"><ng-content /></span>
  `,
  styles: `
    :host { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 12px 4px 4px; border: 1px solid rgba(128,128,128,.25); border-bottom: 0; border-radius: 8px 8px 0 0; background: rgba(128,128,128,.08); }
    .alternar-todos { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 0; background: none; color: inherit; font: inherit; font-size: .875rem; cursor: pointer; border-radius: 6px; }
    .alternar-todos mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .alternar-todos:hover { background: rgba(128,128,128,.12); }
    .alternar-todos:focus-visible { outline: 2px solid var(--mat-sys-primary); }
  `,
})
export class ExpandirTodosComponent {
  /** Todos os itens visíveis estão abertos. */
  readonly abertos = input.required<boolean>();
  readonly alternar = output<void>();
}
