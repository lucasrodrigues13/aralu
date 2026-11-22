import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { API_BASE_URL } from '../../core/api-base-url';
import { PlanilhaInstrucoesDialog } from './planilha-instrucoes.dialog';

describe('Modal da planilha de convidados (SPEC-059)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanilhaInstrucoesDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: 'http://api.teste' },
        { provide: MAT_DIALOG_DATA, useValue: 'e1' },
      ],
    });
  });

  it('explica como agrupar e o telefone e mostra o exemplo', () => {
    const fixture = TestBed.createComponent(PlanilhaInstrucoesDialog);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('mesmo nome do convite');
    expect(texto).toContain('o primeiro convidado de cada convite precisa de DDI e telefone');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('table tbody tr').length).toBe(4);
  });

  it('o botão Download do modelo baixa a planilha do evento', () => {
    const fixture = TestBed.createComponent(PlanilhaInstrucoesDialog);
    fixture.detectChanges();
    const criar = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const botao = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((item) => item.textContent?.includes('Download do modelo'))!;
    botao.click();
    const req = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/api/v1/eventos/e1/convites/planilha'));
    req.flush(new Blob(['x']));

    expect(criar).toHaveBeenCalled();
    expect(clique).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
