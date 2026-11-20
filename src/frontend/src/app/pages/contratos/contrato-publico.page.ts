import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ContratoClient, ContratoPublico } from '../../core/contrato.client';
import { imprimirContrato } from './imprimir';

/** Leitura do contrato sem login, pelo link enviado por e-mail (SPEC-030 §6.5). */
@Component({
  selector: 'app-contrato-publico',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <main class="pagina">
      @if (carregando()) {
        <p class="block text-xs text-muted">Carregando…</p>
      } @else if (contrato(); as c) {
        <mat-card class="cardWithShadow"><mat-card-content>
          <header class="topo">
            <div>
              @if (c.empresa) { <span class="block text-xs text-muted">{{ c.empresa }}</span> }
              <h1>{{ c.nome }}</h1>
              <span class="block text-xs text-muted">Link de leitura válido até {{ validade(c.expiraEm) }}.</span>
            </div>
            <button mat-stroked-button type="button" (click)="imprimir(c)"><mat-icon>print</mat-icon> Imprimir</button>
          </header>
          <div class="texto">{{ c.texto }}</div>
          <p class="block text-xs text-muted rodape">A assinatura deste contrato ainda não é feita por aqui. Fale com a sua assessoria.</p>
        </mat-card-content></mat-card>
      } @else {
        <mat-card class="cardWithShadow expirado"><mat-card-content>
          <mat-icon>link_off</mat-icon>
          <h1>Este link expirou</h1>
          <p>Peça um novo à sua assessoria.</p>
        </mat-card-content></mat-card>
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--mat-sys-background); }
    .pagina { max-width: 820px; margin: 0 auto; padding: 32px 16px; }
    .topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 16px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 4px 0; }
    .texto { white-space: pre-wrap; font-size: 15px; line-height: 1.7; }
    .rodape { margin-top: 24px; }
    .expirado { text-align: center; padding: 48px 24px; }
    .expirado mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--mat-sys-surface-container-lowest); }
  `,
})
export class ContratoPublicoPage implements OnInit {
  private readonly contratoClient = inject(ContratoClient);
  private readonly rota = inject(ActivatedRoute);
  protected readonly contrato = signal<ContratoPublico | null>(null);
  protected readonly carregando = signal(true);

  ngOnInit(): void {
    const token = this.rota.snapshot.paramMap.get('token') ?? '';
    this.contratoClient.publico(token).subscribe({
      next: (contrato) => {
        this.contrato.set(contrato);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected validade(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected imprimir(contrato: ContratoPublico): void {
    imprimirContrato(contrato.nome, contrato.texto, contrato.empresa);
  }
}
