import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CascaAcesso } from '../../shared/casca-acesso';

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule, CascaAcesso],
  template: `
    <app-casca-acesso titulo="Criar conta" subtitulo="Teste grátis de 14 dias, sem cartão.">
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
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Senha</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input aria-label="Senha" matInput type="password" formControlName="senha" autocomplete="new-password" />
            @if (formulario.controls.senha.hasError('required')) {
              <mat-error>Preencha este campo.</mat-error>
            } @else if (formulario.controls.senha.hasError('minlength')) {
              <mat-error>Use pelo menos 8 caracteres.</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Confirme a senha</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input aria-label="Confirme a senha" matInput type="password" formControlName="confirmacao" autocomplete="new-password" />
            @if (formulario.controls.confirmacao.hasError('required')) {
              <mat-error>Preencha este campo.</mat-error>
            } @else if (formulario.controls.confirmacao.hasError('diferente')) {
              <mat-error>As senhas não conferem.</mat-error>
            }
          </mat-form-field>
        </div>
        <div>
          <mat-checkbox formControlName="aceiteTermos">Li e aceito os termos de uso e a política de privacidade da Aralu.</mat-checkbox>
          @if (formulario.controls.aceiteTermos.touched && formulario.controls.aceiteTermos.invalid) {
            <p class="text-error text-sm m-0">Aceite os termos para continuar.</p>
          }
        </div>
        <button mat-flat-button class="w-full" type="submit" [disabled]="enviando()">Criar conta</button>
      </form>
      <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Já tenho conta</a></p>
    </app-casca-acesso>
  `,
})
export class CadastroPage {
  private readonly fb = inject(FormBuilder);
  private readonly conta = inject(ContaClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly enviando = signal(false);
  protected readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
    confirmacao: ['', Validators.required],
    aceiteTermos: [false, Validators.requiredTrue],
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { email, senha, confirmacao } = this.formulario.getRawValue();
    if (senha !== confirmacao) {
      const campo = this.formulario.controls.confirmacao;
      campo.setErrors({ diferente: true });
      campo.markAsTouched();
      return;
    }

    this.enviando.set(true);
    this.conta.cadastrar(email, senha, confirmacao, true).subscribe({
      next: (resposta) => {
        this.toast.sucesso(resposta.mensagem);
        void this.router.navigateByUrl('/entrar');
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.enviando.set(false);
      },
    });
  }
}
