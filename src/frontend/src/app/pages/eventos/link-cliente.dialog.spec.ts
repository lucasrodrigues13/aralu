import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { LinkClienteClient } from '../../core/link-cliente.client';
import { ToastService } from '../../core/toast.service';
import { LinkClienteDialog } from './link-cliente.dialog';

describe('modal Link do cliente', () => {
  const token = 'Zx9-abc_123';
  const linkCompleto = `${location.origin}/cliente/${token}`;
  const clipboardOriginal = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  let toast: { sucesso: ReturnType<typeof vi.fn>; erro: ReturnType<typeof vi.fn> };

  function abrir() {
    toast = { sucesso: vi.fn(), erro: vi.fn() };
    TestBed.configureTestingModule({
      imports: [LinkClienteDialog],
      providers: [
        { provide: LinkClienteClient, useValue: { link: () => of({ ativo: true, token, financeiroLiberado: false, convidadosLiberado: false }) } },
        { provide: ToastService, useValue: toast },
        { provide: MatDialog, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { eventoId: 'e1' } },
      ],
    });
    const fixture = TestBed.createComponent(LinkClienteDialog);
    fixture.detectChanges();
    return fixture;
  }

  function trocarClipboard(valor: unknown) {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: valor });
  }

  function botaoCopiar(elemento: HTMLElement): HTMLButtonElement {
    return [...elemento.querySelectorAll('button')].find((b) => b.textContent?.includes('Copiar'))!;
  }

  afterEach(() => {
    if (clipboardOriginal) Object.defineProperty(navigator, 'clipboard', clipboardOriginal);
    else delete (navigator as { clipboard?: unknown }).clipboard;
    vi.restoreAllMocks();
  });

  it('mostra o nome neutro e o link completo no campo', () => {
    const elemento: HTMLElement = abrir().nativeElement;

    expect(elemento.querySelector('h2')?.textContent).toContain('Link do cliente');
    expect(elemento.textContent?.toLowerCase()).not.toContain('casal');
    expect(elemento.querySelector<HTMLInputElement>('input.endereco')?.value).toBe(linkCompleto);
  });

  it('copia o link completo, com o caminho, pela área de transferência', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    trocarClipboard({ writeText });
    const elemento: HTMLElement = abrir().nativeElement;

    botaoCopiar(elemento).click();
    await vi.waitFor(() => expect(toast.sucesso).toHaveBeenCalledWith('Link copiado.'));

    expect(writeText).toHaveBeenCalledWith(linkCompleto);
  });

  it('em http, sem navigator.clipboard, copia o link completo pela seleção', async () => {
    trocarClipboard(undefined);
    let copiado = '';
    const execCommand = vi.fn(() => {
      // Lê o que está selecionado no campo escondido na hora do copy.
      const campo = document.querySelector<HTMLTextAreaElement>('body > textarea');
      copiado = campo ? campo.value.substring(campo.selectionStart, campo.selectionEnd) : '';
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const elemento: HTMLElement = abrir().nativeElement;

    botaoCopiar(elemento).click();
    await vi.waitFor(() => expect(toast.sucesso).toHaveBeenCalledWith('Link copiado.'));

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copiado).toBe(linkCompleto);
  });

  it('avisa e mostra o link quando não consegue copiar', async () => {
    trocarClipboard(undefined);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    const elemento: HTMLElement = abrir().nativeElement;

    botaoCopiar(elemento).click();
    await vi.waitFor(() => expect(toast.erro).toHaveBeenCalled());

    expect(toast.erro).toHaveBeenCalledWith(`Não foi possível copiar. Link: ${linkCompleto}`);
    expect(toast.sucesso).not.toHaveBeenCalled();
  });
});
