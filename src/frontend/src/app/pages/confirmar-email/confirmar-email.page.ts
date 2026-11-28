import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CascaAcesso } from '../../shared/casca-acesso';
import { Estado } from '../../shared/estado';

@Component({
  selector: 'app-confirmar-email',
  imports: [RouterLink, CascaAcesso, Estado],
  template: `
    <app-casca-acesso titulo="Confirmar e-mail">
      <app-estado [icone]="icone()" [titulo]="status()" />
      <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Voltar para entrar</a></p>
    </app-casca-acesso>
  `,
})
export class ConfirmarEmailPage implements OnInit {
  private readonly rota = inject(ActivatedRoute);
  private readonly conta = inject(ContaClient);
  private readonly toast = inject(ToastService);
  protected readonly status = signal('Carregando…');
  protected readonly icone = signal<string | undefined>(undefined);

  ngOnInit(): void {
    const usuarioId = this.rota.snapshot.queryParamMap.get('usuarioId');
    const token = this.rota.snapshot.queryParamMap.get('token');
    if (!usuarioId || !token) {
      const mensagem = 'O link é inválido ou expirou.';
      this.status.set(mensagem);
      this.icone.set('error_outline');
      this.toast.erro(mensagem);
      return;
    }

    this.conta.confirmar(usuarioId, token).subscribe({
      next: (resposta) => {
        this.status.set(resposta.mensagem);
        this.icone.set('check_circle');
        this.toast.sucesso(resposta.mensagem);
      },
      error: (erro: unknown) => {
        const mensagem = mensagemDeErro(erro);
        this.status.set(mensagem);
        this.icone.set('error_outline');
        this.toast.erro(mensagem);
      },
    });
  }
}
