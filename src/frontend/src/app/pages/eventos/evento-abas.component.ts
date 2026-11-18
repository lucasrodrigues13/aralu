import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-evento-abas',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="gd-abas" aria-label="Seções do evento">
      <a [routerLink]="['/eventos', eventoId()]" routerLinkActive="ativa" [routerLinkActiveOptions]="{ exact: true }">Resumo</a>
      <a [routerLink]="['/eventos', eventoId(), 'tarefas']" routerLinkActive="ativa">Tarefas</a>
      <a [routerLink]="['/eventos', eventoId(), 'convidados']" routerLinkActive="ativa">Convidados</a>
      <a [routerLink]="['/eventos', eventoId(), 'fornecedores']" routerLinkActive="ativa">Fornecedores</a>
      <a [routerLink]="['/eventos', eventoId(), 'dinheiro']" routerLinkActive="ativa">Dinheiro</a>
    </nav>
  `,
  styles: `
    :host { display: block; margin-bottom: 16px; }
    nav { width: fit-content; max-width: 100%; flex-wrap: wrap; }
  `,
})
export class EventoAbasComponent {
  readonly eventoId = input.required<string>();
}
