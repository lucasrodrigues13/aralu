import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AssistentesClient } from '../core/assistentes.client';
import { AuthService } from '../core/auth.service';
import { ContaClient } from '../core/conta.client';
import { CascaComponent } from './casca.component';

function montar(estreita: boolean, assistente = false, financeiro = true): ComponentFixture<CascaComponent> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          email: () => 'pessoa@aralu.test',
          ehAdmin: () => false,
          ehAssistente: () => assistente,
          podeVerFinanceiro: () => financeiro,
          permissoes: signal(null),
          sair: () => undefined,
        },
      },
      { provide: ContaClient, useValue: { sair: () => of(undefined), areaUsuario: () => of({ email: 'pessoa@aralu.test', papeis: [] }) } },
      { provide: AssistentesClient, useValue: { minhaConta: () => of({ empresa: 'Aralu Eventos' }) } },
      {
        provide: BreakpointObserver,
        useValue: { observe: () => of({ matches: estreita, breakpoints: {} }) },
      },
    ],
  });

  const fixture = TestBed.createComponent(CascaComponent);
  fixture.detectChanges();
  return fixture;
}

describe('CascaComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('esconde da assistente Perfil, Contratos da conta, Assistentes e o financeiro sem permissão (SPEC-032 §8)', () => {
    const texto = (montar(false, true, false).nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Eventos');
    expect(texto).not.toContain('Perfil');
    expect(texto).not.toContain('Assistentes');
    expect(texto).not.toContain('Pagamentos');
    expect(texto).toContain('Assistente de Aralu Eventos');
  });

  it('mostra Perfil, Assistentes e Pagamentos para a dona', () => {
    const texto = (montar(false).nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Perfil');
    expect(texto).toContain('Assistentes');
    expect(texto).toContain('Pagamentos');
  });

  it('em tela estreita deixa o menu fechado e oferece abrir e fechar', () => {
    const fixture = montar(true);
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('[aria-label="Abrir menu"]')).toBeTruthy();
    expect(raiz.querySelector('mat-sidenav')?.classList.contains('mat-drawer-opened')).toBe(false);

    (raiz.querySelector('[aria-label="Abrir menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('[aria-label="Fechar menu"]')).toBeTruthy();
    expect(raiz.querySelector('mat-sidenav')?.classList.contains('mat-drawer-opened')).toBe(true);

    (raiz.querySelector('[aria-label="Fechar menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('mat-sidenav')?.classList.contains('mat-drawer-opened')).toBe(false);
  });

  it('em tela larga mantém o menu aberto ao lado', () => {
    const raiz = montar(false).nativeElement as HTMLElement;

    expect(raiz.querySelector('[aria-label="Abrir menu"]')).toBeNull();
    expect(raiz.querySelector('[aria-label="Fechar menu"]')).toBeNull();
    expect(raiz.querySelector('mat-sidenav')?.classList.contains('mat-drawer-opened')).toBe(true);
  });

  it('ordena os grupos com Modelos por último e põe os modelos do funil em Modelos (SPEC-034)', () => {
    const raiz = montar(false).nativeElement as HTMLElement;
    const grupos = Array.from(raiz.querySelectorAll('.nav-caption')).map((e) => e.textContent?.trim());
    expect(grupos).toEqual(['Principal', 'Gestão de eventos', 'Agenda', 'Funil de vendas', 'Modelos']);

    const itensDe = (rotulo: string) => {
      const itens: string[] = [];
      let atual = Array.from(raiz.querySelectorAll('.nav-caption')).find((e) => e.textContent?.trim() === rotulo)?.nextElementSibling;
      while (atual && !atual.classList.contains('nav-caption')) {
        itens.push(atual.textContent?.trim() ?? '');
        atual = atual.nextElementSibling;
      }
      return itens;
    };
    expect(itensDe('Modelos').some((t) => t.includes('Modelos de serviços'))).toBe(true);
    expect(itensDe('Modelos').some((t) => t.includes('Modelo de orçamento'))).toBe(true);
    expect(itensDe('Funil de vendas').some((t) => t.includes('Modelos de serviços') || t.includes('Modelo de orçamento'))).toBe(false);
    expect(itensDe('Funil de vendas').some((t) => t.includes('Modelos de contrato'))).toBe(true);
  });

  it('em tela larga não mostra Novo evento na barra superior', () => {
    const raiz = montar(false).nativeElement as HTMLElement;
    const topo = raiz.querySelector('.topbar');

    expect(topo?.textContent).not.toContain('Novo evento');
    expect(raiz.querySelector('.barra-inferior [aria-label="Novo evento"]')).toBeTruthy();
  });
});
