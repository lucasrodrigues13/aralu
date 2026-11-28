import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TemaService } from '../core/tema.service';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Alterna claro/escuro. Fixo no canto nas telas públicas; dentro da barra superior na casca. */
@Component({
  selector: 'app-tema',
  host: { '[class.tema-fixo]': 'fixo()' },
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      type="button"
      (click)="tema.alternar()"
      [attr.aria-label]="tema.escuro() ? 'Usar modo claro' : 'Usar modo escuro'"
      [matTooltip]="tema.escuro() ? 'Usar modo claro' : 'Usar modo escuro'"
    >
      <mat-icon>{{ tema.escuro() ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class TemaBotao {
  readonly fixo = input(true);
  protected readonly tema = inject(TemaService);
}
