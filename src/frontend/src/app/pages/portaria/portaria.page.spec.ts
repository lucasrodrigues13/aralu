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
  it('mostra os totais e a lista de convites confirmados', () => {
    const { tela } = montar({ ler: () => of(leitura) });
    expect(tela.textContent).toContain('Casamento');
    expect(tela.textContent).toContain('Família Silva');
    expect(tela.textContent).toContain('Marido');
    expect(tela.textContent).not.toContain('Tio');
    expect(tela.querySelector('[data-teste="escanear"]')).not.toBeNull();
  });

  it('link inválido mostra o aviso de indisponível', () => {
    const { tela } = montar({ ler: () => throwError(() => new Error('404')) });
    expect(tela.textContent).toContain('não está mais disponível');
  });

  it('abre o convite, marca só quem entrou e envia a lista', () => {
    const marcar = vi.fn(() => of({ ...silva, convidados: silva.convidados.map((p) => (p.id === 'p2' ? { ...p, compareceuEm: '2026-11-21T20:00:00Z' } : p)) }));
    const { fixture, tela } = montar({ ler: () => of(leitura), marcar });
    const pagina = fixture.componentInstance as unknown as { abrir(c: ConvitePortaria): void; alternar(id: string, marcado: boolean): void };

    pagina.abrir(silva);
    pagina.alternar('p1', false);
    fixture.detectChanges();
    expect(tela.querySelector('[data-teste="convite-portaria"]')).not.toBeNull();

    (tela.querySelector('[data-teste="confirmar-entrada"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(marcar).toHaveBeenCalledWith('t', 'c1', ['p2']);
    expect(tela.querySelector('[data-teste="convite-portaria"]')).toBeNull();
    expect(tela.textContent).toContain('Entrou às');
  });
});
