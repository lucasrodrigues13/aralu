import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Marca } from './marca';

/** Cartão largo com painel da marca, usado em todas as telas de acesso. */
@Component({
  selector: 'app-casca-acesso',
  imports: [MatCardModule, Marca],
  template: `
    <div class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow overflow-hidden w-full max-w-[960px] mb-0!">
        <div class="grid grid-cols-12">
          <div class="lg:col-span-6 col-span-12 flex items-stretch">
            <div class="w-full p-10 flex flex-col justify-center">
              <app-marca [altura]="44" />
              <h3 class="text-2xl font-semibold mt-8!">{{ titulo() }}</h3>
              @if (subtitulo()) {
                <p class="text-muted mt-1">{{ subtitulo() }}</p>
              }
              <div class="mt-8">
                <ng-content />
              </div>
            </div>
          </div>
          <div class="lg:col-span-6 col-span-12 relative hidden lg:flex flex-col items-center justify-center gap-7 p-10 text-center painel-marca" aria-hidden="true">
            <app-marca [icone]="true" [altura]="120" />
            <h4 class="text-2xl font-semibold max-w-xs">Cada detalhe do seu evento em um só lugar</h4>
            <p class="max-w-sm opacity-75">Tarefas, convidados, contratos e pagamentos organizados, do primeiro contato ao grande dia.</p>
          </div>
        </div>
      </mat-card>
    </div>
  `,
})
export class CascaAcesso {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
}
