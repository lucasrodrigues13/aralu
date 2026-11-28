import { Component, OnDestroy, inject, input } from '@angular/core';
import { TemaService } from '../core/tema.service';

/** Casca única das telas públicas: sempre no tema claro. */
@Component({
  selector: 'app-pagina-publica',
  host: { class: 'bg-light' },
  styles: `
    :host { display: block; min-height: 100vh; }
    main { margin: 0 auto; padding: 24px 16px 48px; display: grid; gap: 12px; align-content: start; }
    header { border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0; overflow-wrap: anywhere; }
  `,
  template: `
    <main [style.max-width.px]="estreita() ? 480 : 720">
      @if (titulo()) {
        <header>
          @if (empresa()) {
            <span class="block text-sm font-semibold text-primary">{{ empresa() }}</span>
          }
          <h1>{{ titulo() }}</h1>
          @if (subtitulo()) {
            <span class="block text-sm text-muted">{{ subtitulo() }}</span>
          }
        </header>
      }
      <ng-content />
    </main>
  `,
})
export class PaginaPublica implements OnDestroy {
  readonly empresa = input<string | null>();
  readonly titulo = input<string>();
  readonly subtitulo = input<string>();
  readonly estreita = input(false);

  private readonly tema = inject(TemaService);

  constructor() {
    this.tema.fixarClaro();
  }

  ngOnDestroy(): void {
    this.tema.restaurar();
  }
}
