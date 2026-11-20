import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { Marca } from '../../shared/marca';

@Component({
  selector: 'app-redefinir-senha',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, Marca],
  template: `
    <section class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow w-full max-w-[440px] mb-0!">
        <div class="px-6 pt-8"><app-marca [altura]="40" /></div>
        <div class="px-6 pt-6"><h3 class="text-xl font-semibold">Redefinir senha</h3></div>
        <mat-card-content class="pt-6!">
          <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Nova senha</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <input [attr.aria-label]="'Nova senha'" matInput type="password" formControlName="senha" autocomplete="new-password" />
            </mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Confirme a senha</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <input [attr.aria-label]="'Confirme a senha'" matInput type="password" formControlName="confirmacao" autocomplete="new-password" />
            </mat-form-field>
            </div>
            <button mat-flat-button class="w-full" type="submit" [disabled]="formulario.invalid || enviando()">Salvar</button>
          </form>
          <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Ir para o login</a></p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
})
export class RedefinirSenhaPage {
  private readonly fb = inject(FormBuilder);
  private readonly conta = inject(ContaClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly enviando = signal(false);
  protected readonly formulario = this.fb.nonNullable.group({
    senha: ['', [Validators.required, Validators.minLength(8)]],
    confirmacao: ['', Validators.required],
  });

  protected enviar(): void {
    const usuarioId = this.rota.snapshot.queryParamMap.get('usuarioId');
    const token = this.rota.snapshot.queryParamMap.get('token');
    const { senha, confirmacao } = this.formulario.getRawValue();
    if (!usuarioId || !token) {
      this.toast.erro('O link é inválido ou expirou.');
      return;
    }

    if (senha !== confirmacao) {
      this.toast.erro('A confirmação da senha não confere.');
      return;
    }

    this.enviando.set(true);
    this.conta.redefinir(usuarioId, token, senha, confirmacao).subscribe({
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
