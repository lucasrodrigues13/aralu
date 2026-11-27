import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Estado } from '../../shared/estado';

/** Mostrada quando a assistente abre, por endereço direto, uma área que não é dela (SPEC-032 §7). */
@Component({
  selector: 'app-sem-acesso',
  imports: [RouterLink, MatCardModule, MatButtonModule, Estado],
  template: `
    <mat-card class="cardWithShadow">
      <mat-card-content>
        <app-estado icone="lock" titulo="Você não tem acesso a esta área.">
          <a mat-flat-button routerLink="/hoje">Ir para Hoje</a>
        </app-estado>
      </mat-card-content>
    </mat-card>
  `,
})
export class SemAcessoPage {}
