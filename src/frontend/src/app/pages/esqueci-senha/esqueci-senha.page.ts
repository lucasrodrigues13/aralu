import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CascaAcesso } from '../../shared/casca-acesso';

@Component({
  selector: 'app-esqueci-senha',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, CascaAcesso],
  template: `
    <app-casca-acesso titulo="Esqueci a senha" subtitulo="Enviamos um link para você criar outra.">
      <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input aria-label="E-mail" matInput type="email" formControlName="email" autocomplete="username" />
            @if (formulario.controls.email.hasError('required')) {
              <mat-error>Preencha este campo.</mat-error>
            } @else if (formulario.controls.email.hasError('email')) {
              <mat-error>Informe um e-mail válido.</mat-error>
            }
          </mat-form-field>
        </div>
        <button mat-flat-button class="w-full" type="submit" [disabled]="enviando()">Enviar link</button>
      </form>
      <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Voltar para entrar</a></p>
    </app-casca-acesso>
  `,
})
export class EsqueciSenhaPage {
  private readonly fb = inject(FormBuilder);
  private readonly conta = inject(ContaClient);
  private readonly toast = inject(ToastService);
  protected readonly enviando = signal(false);
  protected readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.conta.esqueciSenha(this.formulario.getRawValue().email).subscribe({
      next: (resposta) => {
        this.toast.sucesso(resposta.mensagem);
        this.enviando.set(false);
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.enviando.set(false);
      },
    });
  }
}
