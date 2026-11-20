import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

/** Mostrada quando a assistente abre, por endereço direto, uma área que não é dela (SPEC-032 §7). */
@Component({
  selector: 'app-sem-acesso',
  imports: [RouterLink, MatCardModule, MatButtonModule],
  template: `
    <mat-card class="cardWithShadow">
      <mat-card-content class="p-8! text-center">
        <p class="text-lg font-semibold mb-4">Você não tem acesso a esta área.</p>
        <a mat-flat-button routerLink="/hoje">Ir para Hoje</a>
      </mat-card-content>
    </mat-card>
  `,
})
export class SemAcessoPage {}
