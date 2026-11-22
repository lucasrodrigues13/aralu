import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PlanilhaInstrucoesDialog } from './planilha-instrucoes.dialog';

describe('Modal da planilha de convidados (SPEC-059)', () => {
  const baixar = vi.fn(() => of(new Blob(['x'])));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanilhaInstrucoesDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { baixar } },
      ],
    });
  });

  it('explica como agrupar e o telefone e mostra o exemplo', () => {
    const fixture = TestBed.createComponent(PlanilhaInstrucoesDialog);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('mesmo nome do convite');
    expect(texto).toContain('marque Sim em um convidado, e só um');
    expect(texto).toContain('Apague essas linhas antes de importar');
    expect(texto).toContain('Mesa e custo não vão na planilha');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('table tbody tr').length).toBe(4);
  });

  it('o botão Download do modelo chama o download recebido', () => {
    const fixture = TestBed.createComponent(PlanilhaInstrucoesDialog);
    fixture.detectChanges();
    const criar = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const botao = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((item) => item.textContent?.includes('Download do modelo'))!;
    botao.click();

    expect(baixar).toHaveBeenCalled();

    expect(criar).toHaveBeenCalled();
    expect(clique).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
