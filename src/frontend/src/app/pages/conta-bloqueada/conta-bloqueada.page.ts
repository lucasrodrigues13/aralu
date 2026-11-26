import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { AssinaturaClient } from '../../core/assinatura.client';
import { AuthService } from '../../core/auth.service';

/** Tela de conta bloqueada (SPEC-062 §7 e §13): mensagem diferente para Dono e Membro. Nenhum dado é apagado. */
@Component({
  selector: 'app-conta-bloqueada',
  imports: [MatCardModule, MatButtonModule, RouterLink],
  template: `
    <mat-card class="cardWithShadow max-w-xl mx-auto mt-10">
      <mat-card-content class="p-8 text-center">
        <h1 class="text-2xl font-semibold mb-3">{{ titulo() }}</h1>
        @if (auth.ehAssistente()) {
          <p class="text-muted mb-6">A conta da assessoria está bloqueada. Fale com o responsável pela conta.</p>
        } @else {
          <p class="text-muted mb-6">Seus dados estão guardados. Assine para voltar a usar a plataforma. Os links dos seus clientes continuam funcionando.</p>
          <a mat-flat-button routerLink="/configuracoes/assinatura">Assinar</a>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class ContaBloqueadaPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly assinatura = inject(AssinaturaClient);
  private readonly router = inject(Router);
  protected readonly titulo = signal('Sua conta está bloqueada');

  ngOnInit(): void {
    this.assinatura.situacao().subscribe({
      next: (situacao) => {
        if (!situacao || situacao.liberada) {
          void this.router.navigate(['/hoje']);
          return;
        }

        this.titulo.set(situacao.situacao === 'Expirada' ? 'Seu teste acabou' : 'Sua conta está bloqueada');
      },
      error: () => undefined,
    });
  }
}
