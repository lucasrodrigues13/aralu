import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CarregandoService } from '../core/carregando.service';

/** Cobre a tela e bloqueia cliques enquanto um pedido demora (acima de modais e menus). */
@Component({
  selector: 'app-carregando-overlay',
  imports: [MatProgressSpinnerModule],
  template: `
    @if (carregando.visivel()) {
      <div class="carregando-overlay" role="alert" aria-busy="true" aria-live="polite" aria-label="Carregando">
        <mat-progress-spinner mode="indeterminate" diameter="56" />
      </div>
    }
  `,
  styles: `
    .carregando-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgb(0 0 0 / 0.35);
      cursor: progress;
    }
  `,
})
export class CarregandoOverlay {
  protected readonly carregando = inject(CarregandoService);
}
