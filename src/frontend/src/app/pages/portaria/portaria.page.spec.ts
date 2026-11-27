import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConvitePortaria, PortariaClient, PortariaLeitura } from '../../core/portaria.client';
import { ToastService } from '../../core/toast.service';
import { PortariaPage } from './portaria.page';

const silva: ConvitePortaria = {
  id: 'c1',
  nome: 'Família Silva',
  convidados: [
    { id: 'p1', nome: 'Marido', situacao: 'Confirmado', confirmado: true, compareceuEm: null },
    { id: 'p2', nome: 'Esposa', situacao: 'Confirmado', confirmado: true, compareceuEm: null },
    { id: 'p3', nome: 'Tio', situacao: 'Não comparecerá', confirmado: false, compareceuEm: null },
  ],
};
const leitura: PortariaLeitura = { evento: 'Casamento', data: null, confirmados: 2, compareceram: 0, convites: [silva] };

function montar(cliente: Partial<PortariaClient>) {
  TestBed.configureTestingModule({
    providers: [
      { provide: PortariaClient, useValue: cliente },
      { provide: ToastService, useValue: { erro: () => undefined, sucesso: () => undefined } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ token: 't' }) } } },
    ],
  });
  const fixture = TestBed.createComponent(PortariaPage);
  fixture.detectChanges();
  return { fixture, tela: fixture.nativeElement as HTMLElement };
}

describe('PortariaPage (SPEC-058)', () => {
  it('mostra os totais e os convites recolhidos, com o status de cada um', () => {
    const { tela } = montar({ ler: () => of(leitura) });
    expect(tela.textContent).toContain('Casamento');
    expect(tela.textContent).toContain('Família Silva');
    expect(tela.textContent).toContain('Pendente');
    expect(tela.textContent).not.toContain('Marido');
    expect(tela.querySelector('[data-teste="confirmar-entrada"]')).toBeNull();
    expect(tela.querySelector('[data-teste="escanear"]')).not.toBeNull();
  });

  it('expandir todos abre os convites e mostra os convidados; recolher todos fecha', () => {
    const { fixture, tela } = montar({ ler: () => of(leitura) });
    const alternarTodos = tela.querySelector('[data-teste="alternar-todos"]') as HTMLButtonElement;

    alternarTodos.click();
    fixture.detectChanges();
    expect(tela.textContent).toContain('Marido');
    expect(tela.textContent).toContain('Não comparecerá');
    expect((tela.querySelector('[data-teste="confirmar-entrada"]') as HTMLButtonElement).disabled).toBe(true);

    alternarTodos.click();
    fixture.detectChanges();
    expect(tela.textContent).not.toContain('Marido');
  });

  it('link inválido mostra o aviso de indisponível', () => {
    const { tela } = montar({ ler: () => throwError(() => new Error('404')) });
    expect(tela.textContent).toContain('não está mais disponível');
  });

  it('expande o convite, marca quem entrou e envia só o que mudou', () => {
    const comEsposa = { ...silva, convidados: silva.convidados.map((p) => (p.id === 'p2' ? { ...p, compareceuEm: '2026-11-21T20:00:00Z' } : p)) };
    const marcar = vi.fn(() => of(comEsposa));
    const { fixture, tela } = montar({ ler: () => of(leitura), marcar });
    const pagina = fixture.componentInstance as unknown as { alternar(p: ConvitePortaria['convidados'][number], marcado: boolean): void };

    (tela.querySelector('[data-teste="alternar-convite"]') as HTMLButtonElement).click();
    pagina.alternar(silva.convidados[1], true);
    fixture.detectChanges();
    (tela.querySelector('[data-teste="confirmar-entrada"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(marcar).toHaveBeenCalledWith('t', 'c1', ['p2'], []);
    expect(tela.textContent).toContain('Parcial');
    expect(tela.textContent).toContain('1 de 2 confirmados entraram');
    expect(tela.querySelector('[data-teste="confirmar-entrada"]')).toBeNull();
  });

  it('desmarcar quem já entrou avisa e envia a entrada a desfazer', () => {
    const comEsposa = { ...silva, convidados: silva.convidados.map((p) => (p.id === 'p2' ? { ...p, compareceuEm: '2026-11-21T20:00:00Z' } : p)) };
    const marcar = vi.fn(() => of(silva));
    const { fixture, tela } = montar({ ler: () => of({ ...leitura, compareceram: 1, convites: [comEsposa] }), marcar });
    const pagina = fixture.componentInstance as unknown as { alternar(p: ConvitePortaria['convidados'][number], marcado: boolean): void };

    (tela.querySelector('[data-teste="alternar-convite"]') as HTMLButtonElement).click();
    pagina.alternar(comEsposa.convidados[1], false);
    fixture.detectChanges();
    expect(tela.textContent).toContain('1 entrada será desfeita');

    (tela.querySelector('[data-teste="confirmar-entrada"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(marcar).toHaveBeenCalledWith('t', 'c1', [], ['p2']);
    expect(tela.textContent).toContain('Pendente');
  });

  it('QR lido abre o convite na lista com quem falta entrar já marcado', () => {
    const { fixture, tela } = montar({ ler: () => of(leitura), lerPeloQr: () => of(silva) });
    const pagina = fixture.componentInstance as unknown as { abrirPeloQr(texto: string): void };

    pagina.abrirPeloQr('entrada:xyz');
    fixture.detectChanges();

    expect(tela.textContent).toContain('Marido');
    expect((tela.querySelector('[data-teste="confirmar-entrada"]') as HTMLButtonElement).disabled).toBe(false);
  });
});
