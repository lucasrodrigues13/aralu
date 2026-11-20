import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { Marca } from '../../shared/marca';

@Component({
  selector: 'app-confirmar-email',
  imports: [RouterLink, MatCardModule, Marca],
  template: `
    <section class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow w-full max-w-[440px] mb-0!">
        <div class="px-6 pt-8"><app-marca [altura]="40" /></div>
        <div class="px-6 pt-6"><h3 class="text-xl font-semibold">Confirmar e-mail</h3></div>
        <mat-card-content class="pt-6!">
          <p role="status">{{ status() }}</p>
          <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Ir para o login</a></p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
})
export class ConfirmarEmailPage implements OnInit {
  private readonly rota = inject(ActivatedRoute);
  private readonly conta = inject(ContaClient);
  private readonly toast = inject(ToastService);
  protected readonly status = signal('Confirmando o e-mail...');

  ngOnInit(): void {
    const usuarioId = this.rota.snapshot.queryParamMap.get('usuarioId');
    const token = this.rota.snapshot.queryParamMap.get('token');
    if (!usuarioId || !token) {
      const mensagem = 'O link é inválido ou expirou.';
      this.status.set(mensagem);
      this.toast.erro(mensagem);
      return;
    }

    this.conta.confirmar(usuarioId, token).subscribe({
      next: (resposta) => {
        this.status.set(resposta.mensagem);
        this.toast.sucesso(resposta.mensagem);
      },
      error: (erro: unknown) => {
        const mensagem = mensagemDeErro(erro);
        this.status.set(mensagem);
        this.toast.erro(mensagem);
      },
    });
  }
}
