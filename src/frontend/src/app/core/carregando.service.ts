import { Injectable, signal } from '@angular/core';

/** Atraso antes de mostrar o overlay: pedidos rápidos não piscam a tela. */
export const ATRASO_CARREGANDO_MS = 400;

/** Conta os pedidos em andamento e liga o overlay só quando a espera passa do atraso. */
@Injectable({ providedIn: 'root' })
export class CarregandoService {
  readonly visivel = signal(false);
  private pendentes = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  iniciar(): void {
    this.pendentes++;
    if (this.pendentes === 1 && this.temporizador === null) {
      this.temporizador = setTimeout(() => {
        this.temporizador = null;
        if (this.pendentes > 0) {
          this.visivel.set(true);
        }
      }, ATRASO_CARREGANDO_MS);
    }
  }

  concluir(): void {
    this.pendentes = Math.max(0, this.pendentes - 1);
    if (this.pendentes === 0) {
      if (this.temporizador !== null) {
        clearTimeout(this.temporizador);
        this.temporizador = null;
      }

      this.visivel.set(false);
    }
  }
}
