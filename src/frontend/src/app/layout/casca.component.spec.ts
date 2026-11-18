import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ContaClient } from '../core/conta.client';
import { CascaComponent } from './casca.component';

function montar(estreita: boolean): ComponentFixture<CascaComponent> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: { email: () => 'pessoa@gevents.test', ehAdmin: () => false, sair: () => undefined },
      },
      { provide: ContaClient, useValue: { sair: () => of(undefined) } },
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

  it('em tela larga não mostra Novo evento na barra superior', () => {
    const raiz = montar(false).nativeElement as HTMLElement;
    const topo = raiz.querySelector('.gd-topo');

    expect(topo?.textContent).not.toContain('Novo evento');
    expect(raiz.querySelector('.gd-barra-inferior [aria-label="Novo evento"]')).toBeTruthy();
  });
});
