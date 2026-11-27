import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AssistentesClient } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CascaAcesso } from '../../shared/casca-acesso';
import { Estado } from '../../shared/estado';

/** Aceite do convite para a equipe (SPEC-062 §13): cria a senha pelo link do convite. */
@Component({
  selector: 'app-convite-assistente',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, CascaAcesso, Estado],
  template: `
    <app-casca-acesso titulo="Criar sua senha">
      @if (pronto()) {
        <app-estado icone="check_circle" titulo="Senha criada">
          <a mat-flat-button routerLink="/entrar">Entrar</a>
        </app-estado>
      } @else {
        <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
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
          <button mat-flat-button class="w-full" type="submit" [disabled]="enviando()">Criar senha</button>
        </form>
      }
      <p class="text-center mt-6"><a class="text-primary font-semibold no-underline" routerLink="/entrar">Voltar para entrar</a></p>
    </app-casca-acesso>
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
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const usuarioId = this.rota.snapshot.queryParamMap.get('usuarioId');
    const token = this.rota.snapshot.queryParamMap.get('token');
    const { senha, confirmacao } = this.formulario.getRawValue();
    if (!usuarioId || !token) {
      this.toast.erro('Este convite expirou. Peça um novo ao responsável pela conta.');
      return;
    }

    if (senha !== confirmacao) {
      const campo = this.formulario.controls.confirmacao;
      campo.setErrors({ diferente: true });
      campo.markAsTouched();
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
