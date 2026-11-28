import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth.service';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CascaAcesso } from '../../shared/casca-acesso';

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, CascaAcesso],
  template: `
    <app-casca-acesso titulo="Entrar" subtitulo="Acesse sua conta para organizar seus eventos.">
      <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input aria-label="E-mail" matInput type="email" formControlName="email" autocomplete="username" placeholder="voce@assessoria.com.br" />
            @if (formulario.controls.email.hasError('required')) {
              <mat-error>Preencha este campo.</mat-error>
            } @else if (formulario.controls.email.hasError('email')) {
              <mat-error>Informe um e-mail válido.</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Senha</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input aria-label="Senha" matInput type="password" formControlName="senha" autocomplete="current-password" />
            @if (formulario.controls.senha.hasError('required')) {
              <mat-error>Preencha este campo.</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <a routerLink="/reenviar-confirmacao" class="text-primary font-semibold no-underline text-sm">Reenviar confirmação</a>
          <a routerLink="/esqueci-senha" class="text-primary font-semibold no-underline text-sm">Esqueci a senha</a>
        </div>
        <button mat-flat-button type="submit" class="w-full" [disabled]="enviando()">Entrar</button>
      </form>
      <span class="block font-medium text-center mt-6">
        Ainda não tem conta?
        <a routerLink="/cadastro" class="no-underline text-primary font-semibold text-sm">Criar conta</a>
      </span>
    </app-casca-acesso>
  `,
})
export class EntrarPage {
  private readonly fb = inject(FormBuilder);
  private readonly conta = inject(ContaClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly rota = inject(ActivatedRoute);

  constructor() {
    const aviso = this.rota.snapshot.queryParamMap.get('aviso');
    if (aviso === 'acesso-removido') {
      this.toast.erro('Seu acesso foi removido.');
    } else if (aviso === 'sessao-encerrada') {
      this.toast.erro('Sua sessão foi encerrada. Entre novamente.');
    } else if (aviso === 'sessao-expirada') {
      this.toast.erro('Sua sessão expirou. Entre novamente.');
    }
  }

  protected readonly enviando = signal(false);
  protected readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const { email, senha } = this.formulario.getRawValue();
    this.conta.entrar(email, senha).subscribe({
      next: (sessao) => {
        this.auth.guardar(sessao);
        this.toast.sucesso('Login realizado.');
        const destino = sessao.papeis.includes('Admin') ? '/admin' : '/hoje';
        void this.router.navigateByUrl(destino);
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.enviando.set(false);
      },
    });
  }
}
