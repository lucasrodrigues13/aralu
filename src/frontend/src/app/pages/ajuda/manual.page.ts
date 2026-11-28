import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Manual de uso: mostra o HTML de public/manual (mesma fonte do PDF em docs/manual). */
@Component({
  selector: 'app-manual',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Manual de uso</h1>
        <p class="text-muted text-sm">Um passo a passo da Aralu, do primeiro acesso ao pós-evento.</p>
      </div>
      <a mat-stroked-button href="/manual/index.html" target="_blank" rel="noopener">
        <mat-icon>open_in_new</mat-icon> Abrir em nova aba
      </a>
    </div>
    <iframe class="manual" src="/manual/index.html" title="Manual de uso da Aralu"></iframe>
  `,
  styles: `
    .manual { display: block; width: 100%; height: calc(100dvh - 200px); min-height: 480px; border: 1px solid var(--mat-sys-outline-variant, #ddd); border-radius: 12px; background: #fff; }
  `,
})
export class ManualPage {}
