import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CascaAcesso } from '../../shared/casca-acesso';

@Component({
  selector: 'app-redefinir-senha',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, CascaAcesso],
  template: `
    <app-casca-acesso titulo="Redefinir senha" subtitulo="Crie uma senha nova.">
      <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nova senha</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input aria-label="Nova senha" matInput type="password" formControlName="senha" autocomplete="new-password" />
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
        <button mat-flat-button class="w-full" type="submit" [disabled]="enviando()">Salvar senha</button>
      </form>
      <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Voltar para entrar</a></p>
    </app-casca-acesso>
  `,
})
export class RedefinirSenhaPage {
  private readonly fb = inject(FormBuilder);
  private readonly conta = inject(ContaClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly roteador = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly enviando = signal(false);
  protected readonly formulario = this.fb.nonNullable.group({
    senha: ['', [Validators.required, Validators.minLength(8)]],
    confirmacao: ['', Validators.required],
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const usuarioId = this.rota.snapshot.queryParamMap.get('usuarioId');
    const token = this.rota.snapshot.queryParamMap.get('token');
    const { senha, confirmacao } = this.formulario.getRawValue();
    if (!usuarioId || !token) {
      this.toast.erro('O link é inválido ou expirou.');
      return;
    }

    if (senha !== confirmacao) {
      const campo = this.formulario.controls.confirmacao;
      campo.setErrors({ diferente: true });
      campo.markAsTouched();
      return;
    }

    this.enviando.set(true);
    this.conta.redefinir(usuarioId, token, senha, confirmacao).subscribe({
      next: (resposta) => {
        this.toast.sucesso(resposta.mensagem);
        this.enviando.set(false);
        void this.roteador.navigateByUrl('/entrar');
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.enviando.set(false);
      },
    });
  }
}
