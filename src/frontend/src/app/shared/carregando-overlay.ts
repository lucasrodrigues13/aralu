import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CarregandoService } from '../core/carregando.service';

/**
 * Cobre a tela e bloqueia cliques enquanto um pedido demora (acima de modais e menus).
 * Os modais e menus do Material abrem na camada superior do navegador (top layer), acima de
 * qualquer z-index; por isso o overlay também é um popover, aberto por último para ficar por cima.
 */
@Component({
  selector: 'app-carregando-overlay',
  imports: [MatProgressSpinnerModule],
  template: `
    <div #overlay popover="manual" class="carregando-overlay" role="alert" aria-busy="true" aria-live="polite" aria-label="Carregando">
      @if (carregando.visivel()) {
        <mat-progress-spinner mode="indeterminate" diameter="56" />
      }
    </div>
  `,
  styles: `
    .carregando-overlay {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      align-items: center;
      justify-content: center;
      background: rgb(0 0 0 / 0.35);
      cursor: progress;
    }
    .carregando-overlay:popover-open { display: flex; }
  `,
})
export class CarregandoOverlay {
  protected readonly carregando = inject(CarregandoService);
  private readonly overlay = viewChild.required<ElementRef<HTMLElement>>('overlay');

  constructor() {
    effect(() => {
      const elemento = this.overlay().nativeElement;
      const visivel = this.carregando.visivel();
      if (typeof elemento.showPopover !== 'function') {
        return;
      }
      if (elemento.matches(':popover-open')) {
        elemento.hidePopover();
      }
      // Reabrir coloca o overlay no fim da camada superior, acima do modal aberto antes dele.
      if (visivel) {
        elemento.showPopover();
      }
    });
  }
}
