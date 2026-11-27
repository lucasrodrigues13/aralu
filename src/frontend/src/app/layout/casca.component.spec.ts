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
          pode: (modulo: string) => (modulo === 'Financeiro' ? financeiro : true),
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

  it('esconde da assistente Perfil, Contratos da conta, Grupos de acesso e o financeiro sem permissão (SPEC-032 §8)', () => {
    const texto = (montar(false, true, false).nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Eventos');
    expect(texto).not.toContain('Perfil');
    expect(texto).not.toContain('Grupos de acesso');
    expect(texto).not.toContain('Gestão Financeira');
    expect(texto).toContain('Assistente de Aralu Eventos');
  });

  it('mostra Perfil, Equipe, Grupos de acesso e Gestão Financeira para a dona, e esta no grupo Principal (SPEC-041)', () => {
    const texto = (montar(false).nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Perfil');
    expect(texto).toContain('Grupos de acesso');
    expect(texto).toContain('Gestão Financeira');
    expect(texto).not.toContain('Pagamentos');
    expect(texto.indexOf('Principal')).toBeLessThan(texto.indexOf('Gestão Financeira'));
    expect(texto.indexOf('Gestão Financeira')).toBeLessThan(texto.indexOf('Gestão de Eventos'));
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

  it('ordena os grupos com Modelos e Configurações no fim e põe os modelos do funil em Modelos (SPEC-034)', () => {
    const raiz = montar(false).nativeElement as HTMLElement;
    const grupos = Array.from(raiz.querySelectorAll('.nav-caption .rotulo-grupo')).map((e) => e.textContent?.trim());
    expect(grupos).toEqual(['Principal', 'Gestão de Eventos', 'Agenda', 'Funil de Vendas', 'Modelos', 'Configurações']);

    const itensDe = (rotulo: string) => {
      const itens: string[] = [];
      let atual = Array.from(raiz.querySelectorAll('.nav-caption')).find((e) => e.querySelector('.rotulo-grupo')?.textContent?.trim() === rotulo)?.nextElementSibling;
      while (atual && !atual.classList.contains('nav-caption')) {
        itens.push(atual.textContent?.trim() ?? '');
        atual = atual.nextElementSibling;
      }
      return itens;
    };
    expect(itensDe('Modelos').some((t) => t.includes('Modelos de Serviços'))).toBe(true);
    expect(itensDe('Modelos').some((t) => t.includes('Modelo de Orçamento'))).toBe(true);
    expect(itensDe('Funil de Vendas').some((t) => t.includes('Modelos de Serviços') || t.includes('Modelo de Orçamento'))).toBe(false);
    expect(itensDe('Funil de Vendas').some((t) => t.includes('Modelos de contrato'))).toBe(false);
  });

  it('recolhe grupos e lembra o estado no localStorage ao montar de novo', () => {
    localStorage.removeItem('aralu.menu.gruposFechados');
    const fixture = montar(false);
    const raiz = fixture.nativeElement as HTMLElement;
    const botao = (rotulo: string) =>
      Array.from(raiz.querySelectorAll<HTMLButtonElement>('button.nav-caption')).find((b) => b.textContent?.includes(rotulo))!;

    expect(raiz.textContent).toContain('Minha Agenda');
    botao('Agenda').click();
    fixture.detectChanges();
    expect(raiz.textContent).not.toContain('Minha Agenda');
    expect(botao('Agenda').getAttribute('aria-expanded')).toBe('false');

    TestBed.resetTestingModule();
    const novo = montar(false).nativeElement as HTMLElement;
    expect(novo.textContent).not.toContain('Minha Agenda');
    expect(novo.textContent).toContain('Hoje');

    localStorage.removeItem('aralu.menu.gruposFechados');
  });

  it('em tela larga não mostra Novo evento na barra superior', () => {
    const raiz = montar(false).nativeElement as HTMLElement;
    const topo = raiz.querySelector('.topbar');

    expect(topo?.textContent).not.toContain('Novo evento');
    expect(raiz.querySelector('.barra-inferior [aria-label="Novo evento"]')).toBeTruthy();
  });
});
