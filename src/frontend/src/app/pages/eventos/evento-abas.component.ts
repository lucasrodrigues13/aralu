import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

/** Seções do evento: voltar para a lista e abas de navegação (mat-tab-nav-bar) dentro de um cartão. */
@Component({
  selector: 'app-evento-abas',
  host: { class: 'block' },
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatCardModule, MatIconModule, MatTabsModule],
  template: `
    <mat-card class="cardWithShadow overflow-hidden">
      <div class="flex items-center gap-1 pl-2">
        <a mat-icon-button routerLink="/eventos" aria-label="Voltar para eventos"><mat-icon>arrow_back</mat-icon></a>
        <nav mat-tab-nav-bar [tabPanel]="painel" class="flex-1 min-w-0" aria-label="Seções do evento">
          @for (aba of abas; track aba.rotulo) {
            <a
              mat-tab-link
              [routerLink]="aba.rota ? ['/eventos', eventoId(), aba.rota] : ['/eventos', eventoId()]"
              routerLinkActive
              #ativo="routerLinkActive"
              [routerLinkActiveOptions]="{ exact: !aba.rota }"
              [active]="ativo.isActive"
            >
              {{ aba.rotulo }}
            </a>
          }
        </nav>
      </div>
      <mat-tab-nav-panel #painel />
    </mat-card>
  `,
})
export class EventoAbasComponent {
  readonly eventoId = input.required<string>();
  protected readonly abas = [
    { rotulo: 'Resumo', rota: '' },
    { rotulo: 'Tarefas', rota: 'tarefas' },
    { rotulo: 'Convidados', rota: 'convidados' },
    { rotulo: 'Fornecedores', rota: 'fornecedores' },
    { rotulo: 'Dinheiro', rota: 'dinheiro' },
    { rotulo: 'Contratos', rota: 'contratos' },
  ];
}
