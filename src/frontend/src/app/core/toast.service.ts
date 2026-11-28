import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastAviso } from './toast-aviso';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snack = inject(MatSnackBar);

  sucesso(mensagem: string): void {
    this.abrir(mensagem, 'toast-sucesso', 4000);
  }

  erro(mensagem: string): void {
    this.abrir(mensagem, 'toast-erro', 6000);
  }

  private abrir(mensagem: string, estilo: string, duration: number): void {
    const texto = mensagem.trim();
    if (!texto) {
      return;
    }

    this.snack.openFromComponent(ToastAviso, {
      data: { mensagem: texto, erro: estilo === 'toast-erro' },
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['aralu-toast', estilo],
    });
  }
}
