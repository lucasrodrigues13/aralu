import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { Estado } from '../../shared/estado';

const TITULOS: Record<string, string> = {
  pagamentos: 'Pagamentos',
  anexos: 'Anexos',
  equipe: 'Equipe escalada',
  aniversarios: 'Aniversários',
};

@Component({
  selector: 'app-em-breve',
  imports: [MatCardModule, Estado],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">{{ titulo }}</mat-card-title>
        <mat-card-subtitle>Módulo em construção</mat-card-subtitle>
      </div>
    </div>
      <mat-card-content class="border-t border-border">
      <app-estado titulo="Em breve" texto="Módulo em construção." />
    </mat-card-content>
    </mat-card>
  `,
})
export class EmBrevePage {
  private readonly rota = inject(ActivatedRoute);
  protected readonly titulo =
    TITULOS[this.rota.snapshot.routeConfig?.path ?? ''] ?? 'Módulo';
}
