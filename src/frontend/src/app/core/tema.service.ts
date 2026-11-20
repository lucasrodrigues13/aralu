import { Injectable, signal } from '@angular/core';

const CHAVE = 'gevents-tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly escuro = signal(false);

  constructor() {
    const salvo = localStorage.getItem(CHAVE);
    const prefereEscuro = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const escuro = salvo ? salvo === 'escuro' : prefereEscuro;
    this.aplicar(escuro);
  }

  alternar(): void {
    this.aplicar(!this.escuro());
  }

  private aplicar(escuro: boolean): void {
    this.escuro.set(escuro);
    // Classes do TailwindAdmin: light-theme / dark-theme no <html>.
    document.documentElement.classList.toggle('dark-theme', escuro);
    document.documentElement.classList.toggle('light-theme', !escuro);
    localStorage.setItem(CHAVE, escuro ? 'escuro' : 'claro');
  }
}
