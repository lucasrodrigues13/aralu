import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { RsvpPage } from './rsvp.page';

function montar(pagina: { convite: string; convidados: { id: string; nome: string; situacao: string }[]; expirado: boolean; prazo: string | null }) {
  TestBed.configureTestingModule({
    providers: [
      { provide: NegocioClient, useValue: { abrirRsvp: () => of(pagina) } },
      { provide: ToastService, useValue: { erro: () => undefined, sucesso: () => undefined } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 't' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(RsvpPage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RsvpPage com prazo (SPEC-054)', () => {
  it('mostra que o convite expirou, sem formulário', () => {
    const tela = montar({ convite: 'Família Souza', convidados: [], expirado: true, prazo: '2026-12-10' });
    expect(tela.querySelector('[data-teste="convite-expirado"]')?.textContent).toContain('expirou');
    expect(tela.querySelector('form button[type="submit"]')).toBeNull();
    expect(tela.textContent).toContain('Família Souza');
  });

  it('dentro do prazo mostra os convidados e o botão Enviar', () => {
    const tela = montar({ convite: 'Família', convidados: [{ id: 'a', nome: 'Lia', situacao: 'Pendente' }], expirado: false, prazo: null });
    expect(tela.querySelector('[data-teste="convite-expirado"]')).toBeNull();
    expect(tela.textContent).toContain('Lia');
    expect(tela.querySelector('button[type="submit"]')).not.toBeNull();
  });
});
