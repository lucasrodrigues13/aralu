import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AssistentesClient } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { MascaraDirective } from '../../shared/mascara.directive';

/** "Minha conta": a assistente edita nome, celular, nascimento e senha (SPEC-032 §12). */
@Component({
  selector: 'app-area-usuario',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MascaraDirective, CampoDataComponent],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>{{ auth.ehAssistente() ? 'Minha conta' : 'Área do usuário' }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>{{ status() }}</p>
        @if (auth.ehAssistente()) {
          <form class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-6" [formGroup]="perfil" (ngSubmit)="salvarPerfil()">
            <div class="campo sm:col-span-2">
              <mat-label class="font-semibold mb-2 block">Nome</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" maxlength="100" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Celular</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Celular'" matInput formControlName="celular" gdMascara="celular" /></mat-form-field>
            </div>
            <app-campo-data rotulo="Nascimento" formControlName="nascimento" />
            <div class="sm:col-span-2"><button mat-flat-button type="submit" [disabled]="perfil.invalid">Salvar dados</button></div>
          </form>
          <form class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-8" [formGroup]="senha" (ngSubmit)="trocarSenha()">
            <h3 class="sm:col-span-2 text-lg font-semibold">Trocar senha</h3>
            <p class="sm:col-span-2 text-sm text-muted">Ao trocar a senha, você sai de todos os dispositivos e entra de novo com a senha nova.</p>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Senha atual</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Senha atual'" matInput type="password" formControlName="atual" autocomplete="current-password" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Nova senha</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nova senha'" matInput type="password" formControlName="nova" autocomplete="new-password" /></mat-form-field>
            </div>
            <div class="sm:col-span-2"><button mat-stroked-button type="submit" [disabled]="senha.invalid">Trocar senha</button></div>
          </form>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class AreaUsuarioPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly conta = inject(ContaClient);
  private readonly assistentes = inject(AssistentesClient);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly status = signal('Carregando…');
  protected readonly perfil = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.pattern(/\S/)]],
    celular: '',
    nascimento: this.fb.control<Date | null>(null),
  });
  protected readonly senha = this.fb.nonNullable.group({
    atual: ['', Validators.required],
    nova: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    if (this.auth.ehAssistente()) {
      this.assistentes.minhaConta().subscribe({
        next: (minha) => {
          this.status.set(`Você entrou como ${minha.email}, na conta de ${minha.empresa || 'sua assessoria'}.`);
          this.perfil.setValue({ nome: minha.nome, celular: minha.celular ?? '', nascimento: deIsoParaData(minha.nascimento) });
        },
        error: (erro: unknown) => this.status.set(mensagemDeErro(erro)),
      });
      return;
    }

    this.conta.areaUsuario().subscribe({
      next: (area) => this.status.set(`Você entrou como ${area.email}.`),
      error: (erro: unknown) => {
        const mensagem = mensagemDeErro(erro);
        this.status.set(mensagem);
        this.toast.erro(mensagem);
      },
    });
  }

  protected salvarPerfil(): void {
    const valor = this.perfil.getRawValue();
    this.assistentes
      .atualizarMinhaConta({ nome: valor.nome.trim(), celular: valor.celular.trim() || null, nascimento: deDataParaIso(valor.nascimento) })
      .subscribe({
        next: () => this.toast.sucesso('Dados atualizados.'),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
  }

  protected trocarSenha(): void {
    const { atual, nova } = this.senha.getRawValue();
    this.assistentes.trocarSenha(atual, nova).subscribe({
      next: () => {
        // A07-001: a troca encerra todas as sessões, inclusive esta.
        this.toast.sucesso('Senha alterada. Entre novamente com a nova senha.');
        this.auth.sair();
        void this.router.navigateByUrl('/entrar');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}
