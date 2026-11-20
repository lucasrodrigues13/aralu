import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AssistentesClient } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { Marca } from '../../shared/marca';

/** Primeiro acesso da assistente: cria a senha pelo link do convite (SPEC-032 §6.2). */
@Component({
  selector: 'app-convite-assistente',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, Marca],
  template: `
    <section class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow w-full max-w-[440px] mb-0!">
        <div class="px-6 pt-8"><app-marca [altura]="40" /></div>
        <div class="px-6 pt-6"><h3 class="text-xl font-semibold">Criar sua senha</h3></div>
        <mat-card-content class="pt-6!">
          @if (pronto()) {
            <p class="mb-6">Senha criada. Agora é só entrar.</p>
            <a mat-flat-button class="w-full" routerLink="/entrar">Entrar</a>
          } @else {
            <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Senha</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Senha'" matInput type="password" formControlName="senha" autocomplete="new-password" />
                </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Confirme a senha</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Confirme a senha'" matInput type="password" formControlName="confirmacao" autocomplete="new-password" />
                </mat-form-field>
              </div>
              <button mat-flat-button class="w-full" type="submit" [disabled]="formulario.invalid || enviando()">Criar senha</button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
})
export class ConviteAssistentePage {
  private readonly fb = inject(FormBuilder);
  private readonly cliente = inject(AssistentesClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly enviando = signal(false);
  protected readonly pronto = signal(false);
  protected readonly formulario = this.fb.nonNullable.group({
    senha: ['', [Validators.required, Validators.minLength(8)]],
    confirmacao: ['', Validators.required],
  });

  protected enviar(): void {
    const usuarioId = this.rota.snapshot.queryParamMap.get('usuarioId');
    const token = this.rota.snapshot.queryParamMap.get('token');
    const { senha, confirmacao } = this.formulario.getRawValue();
    if (!usuarioId || !token) {
      this.toast.erro('Este convite venceu. Peça um novo à dona da conta.');
      return;
    }

    if (senha !== confirmacao) {
      this.toast.erro('A confirmação da senha não confere.');
      return;
    }

    this.enviando.set(true);
    this.cliente.aceitarConvite(usuarioId, token, senha, confirmacao).subscribe({
      next: () => {
        this.enviando.set(false);
        this.pronto.set(true);
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.enviando.set(false);
      },
    });
  }
}
