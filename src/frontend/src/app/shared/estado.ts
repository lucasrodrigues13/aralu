import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Estado vazio, carregando ou de erro de uma lista ou tela. */
@Component({
  selector: 'app-estado',
  imports: [MatIconModule],
  template: `
    <div class="flex flex-col items-center gap-2 text-center py-10">
      @if (icone()) {
        <mat-icon style="font-size: 40px; width: 40px; height: 40px; line-height: 40px; color: var(--mat-sys-outline)">{{ icone() }}</mat-icon>
      }
      @if (icone() || texto()) {
        <p class="font-semibold m-0">{{ titulo() }}</p>
      } @else {
        <p class="text-muted m-0">{{ titulo() }}</p>
      }
      @if (texto()) {
        <p class="text-sm text-muted m-0">{{ texto() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class Estado {
  readonly icone = input<string>();
  readonly titulo = input.required<string>();
  readonly texto = input<string>();
}
