import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastAviso } from './toast-aviso';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('abre o aviso embaixo, à direita, com o componente que tem fechar', () => {
    const openFromComponent = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { openFromComponent } }],
    });

    TestBed.inject(ToastService).sucesso('Salvo.');

    expect(openFromComponent).toHaveBeenCalledWith(
      ToastAviso,
      expect.objectContaining({
        data: { mensagem: 'Salvo.', erro: false },
        verticalPosition: 'top',
        horizontalPosition: 'end',
        panelClass: ['gd-toast', 'gd-toast-sucesso'],
      }),
    );
  });
});
