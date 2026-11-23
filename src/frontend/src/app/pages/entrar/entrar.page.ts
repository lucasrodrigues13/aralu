import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/auth.service';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { Marca } from '../../shared/marca';

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, Marca],
  template: `
    <div class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow overflow-hidden w-full max-w-[960px] mb-0!">
        <div class="grid grid-cols-12">
          <div class="lg:col-span-6 col-span-12 flex items-stretch">
            <div class="w-full p-10 flex flex-col justify-center">
              <app-marca [altura]="44" />
              <h3 class="text-2xl font-semibold mt-8!">Entrar</h3>
              <p class="text-muted mt-1">Acesse sua conta para organizar seus eventos.</p>

              <form class="mt-8" [formGroup]="formulario" (ngSubmit)="enviar()">
                <mat-label class="text-sm font-semibold mb-2 block">E-mail</mat-label>
                <mat-form-field appearance="outline" class="w-full mb-4">
                  <input aria-label="E-mail" matInput type="email" formControlName="email" autocomplete="username" placeholder="voce@assessoria.com.br" />
                </mat-form-field>

                <mat-label class="text-sm font-semibold mb-2 block">Senha</mat-label>
                <mat-form-field appearance="outline" class="w-full mb-4">
                  <input aria-label="Senha" matInput type="password" formControlName="senha" autocomplete="current-password" />
                </mat-form-field>

                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <a routerLink="/reenviar-confirmacao" class="text-primary font-semibold no-underline text-sm">Reenviar confirmação</a>
                  <a routerLink="/esqueci-senha" class="text-primary font-semibold no-underline text-sm">Esqueci a senha</a>
                </div>
                <button mat-flat-button type="submit" class="w-full" [disabled]="formulario.invalid || enviando()">Entrar</button>
              </form>
              <span class="block font-medium text-center mt-6">
                Ainda não tem conta?
                <a routerLink="/cadastro" class="no-underline text-primary font-semibold text-sm">Criar conta</a>
              </span>
            </div>
          </div>
          <div class="lg:col-span-6 col-span-12 relative hidden lg:flex flex-col items-center justify-center gap-7 p-10 text-center painel-marca" aria-hidden="true">
            <app-marca [icone]="true" [altura]="120" />
            <h4 class="text-2xl font-semibold max-w-xs">Cada detalhe do seu evento em um só lugar</h4>
            <p class="max-w-sm opacity-75">Tarefas, convidados, contratos e pagamentos organizados, do primeiro contato ao grande dia.</p>
          </div>
        </div>
      </mat-card>
    </div>
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
      this.toast.erro('Informe e-mail e senha.');
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
