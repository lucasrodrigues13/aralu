import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';
import { ImportacaoConvidados, temImportacaoEmAndamento } from '../core/importacoes';
import { ImportacoesDialog } from './importacoes.dialog';

const importacao = (id: string, situacao: ImportacaoConvidados['situacao'], extra: Partial<ImportacaoConvidados> = {}): ImportacaoConvidados => ({
  id, nomeArquivo: `${id}.xlsx`, situacao, criadaEm: '2026-11-22T10:00:00Z', concluidaEm: null, convites: 0, erros: [], ...extra,
});

describe('Modal de importações (SPEC-059 §6.6)', () => {
  const fechar = vi.fn();

  function abrir(listar: () => Observable<ImportacaoConvidados[]>, enviar = vi.fn()) {
    fechar.mockClear();
    TestBed.configureTestingModule({
      imports: [ImportacoesDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { listar, enviar, baixar: vi.fn() } },
        { provide: MatDialogRef, useValue: { close: fechar } },
      ],
    });
    const fixture = TestBed.createComponent(ImportacoesDialog);
    fixture.detectChanges();
    return fixture;
  }

  it('lista as importações com a situação e abre os erros num acordeão', () => {
    const fixture = abrir(() => of([
      importacao('a', 'Importado', { convites: 3 }),
      importacao('b', 'Erro', { erros: ['Linha 2: Informe o nome do convite.', 'Linha 5: O convidado principal precisa de telefone.'] }),
    ]));
    const raiz: HTMLElement = fixture.nativeElement;

    expect([...raiz.querySelectorAll('[data-situacao]')].map((item) => item.getAttribute('data-situacao'))).toEqual(['Importado', 'Erro']);
    expect(raiz.textContent).toContain('3 convites importados');
    const acordeao = [...raiz.querySelectorAll('button')].find((item) => item.textContent?.includes('2 erros na planilha'))!;
    expect(acordeao.getAttribute('aria-expanded')).toBe('false');
    expect(raiz.textContent).not.toContain('Linha 5');

    acordeao.click();
    fixture.detectChanges();

    expect(acordeao.getAttribute('aria-expanded')).toBe('true');
    expect(raiz.textContent).toContain('Linha 2: Informe o nome do convite.');
    expect(raiz.textContent).toContain('Linha 5: O convidado principal precisa de telefone.');
  });

  it('consulta de novo enquanto há importação na fila e avisa ao fechar que alguma terminou', () => {
    vi.useFakeTimers();
    let chamada = 0;
    const listar = vi.fn(() => of(chamada++ === 0 ? [importacao('a', 'Processando')] : [importacao('a', 'Importado', { convites: 1 })]));
    const fixture = abrir(listar);
    const raiz: HTMLElement = fixture.nativeElement;
    expect(raiz.textContent).toContain('A lista está sendo verificada e em breve será confirmada.');

    vi.advanceTimersByTime(2000);
    fixture.detectChanges();

    expect(listar).toHaveBeenCalledTimes(2);
    expect(raiz.textContent).toContain('1 convite importado');
    [...raiz.querySelectorAll('button')].find((item) => item.textContent?.includes('Fechar'))!.click();
    expect(fechar).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('sabe quando ainda há importação em andamento', () => {
    expect(temImportacaoEmAndamento([importacao('a', 'Pendente')])).toBe(true);
    expect(temImportacaoEmAndamento([importacao('a', 'Erro'), importacao('b', 'Importado')])).toBe(false);
  });
});
