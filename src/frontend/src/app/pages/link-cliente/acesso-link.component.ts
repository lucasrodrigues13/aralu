import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { AcessoLink, LinkClienteClient } from '../../core/link-cliente.client';
import { mensagemDeErro } from '../../core/mensagem-erro';

/** De onde vem o código: o link do cliente (padrão) ou outro link público, como o briefing (SPEC-066). */
export interface PortaAcesso {
  acesso(token: string): Observable<AcessoLink>;
  pedirCodigo(token: string, id: string): Observable<AcessoLink>;
  confirmarCodigo(token: string, codigo: string): Observable<unknown>;
}

/**
 * Pedido do código antes de abrir o link do cliente (SPEC-063 §6 e §10): o cliente escolhe o e-mail dele
 * (mascarado), recebe um código de 6 dígitos e digita aqui.
 */
@Component({
  selector: 'app-acesso-link',
  imports: [FormsModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <mat-card class="cardWithShadow"><mat-card-content class="acesso">
      @if (acesso(); as a) {
        <mat-icon class="icone">lock</mat-icon>
        <h1>{{ a.evento }}</h1>
        @if (a.emails.length === 0) {
          <p class="text-muted">{{ semEmail() }}</p>
        } @else if (!enviadoPara()) {
          <p>Para sua segurança, enviaremos um código para o seu e-mail.</p>
          <p class="text-sm text-muted">Escolha o seu e-mail:</p>
          <div class="emails">
            @for (e of a.emails; track e.clienteId) {
              <button mat-stroked-button type="button" [disabled]="enviando()" (click)="pedir(e.clienteId, e.email)">{{ e.email }}</button>
            }
          </div>
        } @else {
          <p>Enviamos um código de 6 dígitos para <strong>{{ enviadoPara() }}</strong>. Ele vale 10 minutos.</p>
          <form class="codigo" (ngSubmit)="confirmar()">
            <mat-form-field appearance="outline">
              <mat-label>Código</mat-label>
              <input matInput [formControl]="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="Código de 6 dígitos" />
            </mat-form-field>
            <button mat-flat-button type="submit" [disabled]="codigo.invalid || enviando()">{{ rotuloAbrir() }}</button>
          </form>
          <button mat-button type="button" [disabled]="segundos() > 0 || enviando()" (click)="pedir(escolhido!, enviadoPara()!)">
            {{ segundos() > 0 ? 'Reenviar código em ' + tempo(segundos()) : 'Reenviar código' }}
          </button>
          <button mat-button type="button" (click)="trocarEmail()">Usar outro e-mail</button>
        }
        @if (erro()) { <p class="text-error text-sm" role="alert">{{ erro() }}</p> }
      } @else {
        <p class="text-xs text-muted">Carregando…</p>
      }
    </mat-card-content></mat-card>
  `,
  styles: `
    .acesso { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 24px 8px; }
    .icone { font-size: 40px; width: 40px; height: 40px; color: var(--mat-sys-primary); }
    .emails { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 320px; }
    .codigo { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; }
    .codigo mat-form-field { width: 160px; }
  `,
})
export class AcessoLinkComponent implements OnInit {
  private readonly linkCliente = inject(LinkClienteClient);
  /** Outra origem do código; sem ela, vale o link do cliente. */
  readonly porta = input<PortaAcesso | null>(null);
  /** Texto do botão que confere o código. */
  readonly rotuloAbrir = input('Abrir o link');
  /** Mensagem quando não há e-mail para enviar o código. */
  readonly semEmail = input('Fale com a organizadora do evento.');
  private get cliente(): PortaAcesso {
    return this.porta() ?? this.linkCliente;
  }
  private readonly destruir = inject(DestroyRef);
  readonly token = input.required<string>();
  /** Código certo: a sessão está no cookie e a página pode carregar. */
  readonly aberto = output<void>();
  protected readonly acesso = signal<AcessoLink | null>(null);
  protected readonly enviadoPara = signal<string | null>(null);
  protected readonly segundos = signal(0);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly codigo = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] });
  protected escolhido: string | null = null;
  private relogio: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.destruir.onDestroy(() => this.pararRelogio());
    this.cliente.acesso(this.token()).subscribe({
      next: (a) => {
        if (a.sessaoValida) {
          this.aberto.emit();
          return;
        }
        this.acesso.set(a);
        this.contar(a.aguardarSegundos);
      },
      error: (erro: unknown) => this.erro.set(mensagemDeErro(erro)),
    });
  }

  protected pedir(clienteId: string, mascarado: string): void {
    this.enviando.set(true);
    this.erro.set(null);
    this.cliente.pedirCodigo(this.token(), clienteId).subscribe({
      next: (a) => {
        this.enviando.set(false);
        this.escolhido = clienteId;
        this.enviadoPara.set(a.enviadoPara ?? mascarado);
        this.codigo.reset();
        this.contar(a.aguardarSegundos);
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(erro));
      },
    });
  }

  protected confirmar(): void {
    if (this.codigo.invalid) return;
    this.enviando.set(true);
    this.erro.set(null);
    this.cliente.confirmarCodigo(this.token(), this.codigo.value).subscribe({
      next: () => {
        this.enviando.set(false);
        this.aberto.emit();
      },
      error: (erro: unknown) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(erro));
      },
    });
  }

  protected trocarEmail(): void {
    this.enviadoPara.set(null);
    this.erro.set(null);
  }

  protected tempo(segundos: number): string {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  }

  private contar(segundos: number): void {
    this.pararRelogio();
    this.segundos.set(segundos);
    if (segundos <= 0) return;
    this.relogio = setInterval(() => {
      const resta = this.segundos() - 1;
      this.segundos.set(Math.max(0, resta));
      if (resta <= 0) this.pararRelogio();
    }, 1000);
  }

  private pararRelogio(): void {
    if (this.relogio) clearInterval(this.relogio);
    this.relogio = null;
  }
}
