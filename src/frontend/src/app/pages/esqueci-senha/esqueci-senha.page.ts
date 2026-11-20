import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { Marca } from '../../shared/marca';

@Component({
  selector: 'app-esqueci-senha',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, Marca],
  template: `
    <section class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow w-full max-w-[440px] mb-0!">
        <div class="px-6 pt-8"><app-marca [altura]="40" /></div>
        <div class="px-6 pt-6"><h3 class="text-xl font-semibold">Esqueci a senha</h3></div>
        <mat-card-content class="pt-6!">
          <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <input [attr.aria-label]="'E-mail'" matInput type="email" formControlName="email" autocomplete="username" />
            </mat-form-field>
            </div>
            <button mat-flat-button class="w-full" type="submit" [disabled]="formulario.invalid || enviando()">Enviar link</button>
          </form>
          <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Voltar ao login</a></p>
        </mat-card-content>
      </mat-card>
    </section>
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
      this.toast.erro('Informe um e-mail válido.');
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
