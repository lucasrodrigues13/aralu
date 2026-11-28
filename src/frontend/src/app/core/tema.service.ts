import { Injectable, signal } from '@angular/core';

const CHAVE = 'aralu-tema';

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

  /** Força o tema claro (telas públicas) sem gravar a preferência. */
  fixarClaro(): void {
    document.documentElement.classList.add('light-theme');
    document.documentElement.classList.remove('dark-theme');
  }

  /** Reaplica o tema conforme a preferência atual. */
  restaurar(): void {
    const escuro = this.escuro();
    document.documentElement.classList.toggle('dark-theme', escuro);
    document.documentElement.classList.toggle('light-theme', !escuro);
  }

  private aplicar(escuro: boolean): void {
    this.escuro.set(escuro);
    // Classes do TailwindAdmin: light-theme / dark-theme no <html>.
    document.documentElement.classList.toggle('dark-theme', escuro);
    document.documentElement.classList.toggle('light-theme', !escuro);
    localStorage.setItem(CHAVE, escuro ? 'escuro' : 'claro');
  }
}
