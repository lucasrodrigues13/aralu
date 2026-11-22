import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../core/auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Seções do evento: voltar para a lista e abas de navegação (mat-tab-nav-bar) dentro de um cartão. */
@Component({
  selector: 'app-evento-abas',
  host: { class: 'block' },
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatCardModule, MatIconModule, MatTabsModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow overflow-hidden">
      <div class="flex items-center gap-1 pl-2">
        <a mat-icon-button routerLink="/eventos" aria-label="Voltar para eventos" matTooltip="Voltar para eventos"><mat-icon>arrow_back</mat-icon></a>
        <nav mat-tab-nav-bar [tabPanel]="painel" class="flex-1 min-w-0" aria-label="Seções do evento">
          @for (aba of abasVisiveis(); track aba.rotulo) {
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
  private readonly auth = inject(AuthService);
  protected readonly abasVisiveis = computed(() => {
    this.auth.permissoes();
    return this.abas.filter((aba) => !aba.financeiro || this.auth.podeVerFinanceiro());
  });
  private readonly abas = [
    { rotulo: 'Resumo', rota: '' },
    { rotulo: 'Convidados', rota: 'convidados' },
    { rotulo: 'Fornecedores', rota: 'fornecedores' },
    { rotulo: 'Contratos', rota: 'contratos' },
    { rotulo: 'Dinheiro', rota: 'dinheiro', financeiro: true },
  ];
}
