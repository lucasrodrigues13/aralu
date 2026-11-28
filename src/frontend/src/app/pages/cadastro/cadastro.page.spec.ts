import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../core/api-base-url';
import { CadastroPage } from './cadastro.page';

describe('CadastroPage', () => {
  function preencher(raiz: HTMLElement, email: string, senha: string, confirmacao: string): void {
    const campoEmail = raiz.querySelector('input[type="email"]') as HTMLInputElement;
    const senhas = raiz.querySelectorAll('input[type="password"]');
    campoEmail.value = email;
    campoEmail.dispatchEvent(new Event('input'));
    (senhas[0] as HTMLInputElement).value = senha;
    senhas[0].dispatchEvent(new Event('input'));
    (senhas[1] as HTMLInputElement).value = confirmacao;
    senhas[1].dispatchEvent(new Event('input'));
    // Aceite dos termos (SPEC-062 §6 A1).
    (raiz.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: 'http://api.teste' },
      ],
    }).compileComponents();
  });

  it('vai para o login depois de criar a conta', () => {
    const fixture = TestBed.createComponent(CadastroPage);
    fixture.detectChanges();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    preencher(fixture.nativeElement, 'pessoa@aralu.test', 'ceu-de-junho-42', 'ceu-de-junho-42');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    const http = TestBed.inject(HttpTestingController);
    const pedido = http.expectOne('http://api.teste/api/v1/conta/cadastro');
    pedido.flush({ mensagem: 'Conta criada. Enviamos um link para confirmar o e-mail.', confirmacaoEnviada: true });

    expect(navegar).toHaveBeenCalledWith('/entrar');
    http.verify();
  });

  it('liga as palavras do aceite aos termos de uso e à política de privacidade', () => {
    const fixture = TestBed.createComponent(CadastroPage);
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('mat-checkbox a') as NodeListOf<HTMLAnchorElement>);
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['termos de uso', '/termos-de-uso'],
      ['política de privacidade', '/politica-de-privacidade'],
    ]);
  });

  it('permanece no cadastro quando a conta não é criada', () => {
    const fixture = TestBed.createComponent(CadastroPage);
    fixture.detectChanges();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    preencher(fixture.nativeElement, 'pessoa@aralu.test', 'ceu-de-junho-42', 'ceu-de-junho-42');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    const http = TestBed.inject(HttpTestingController);
    const pedido = http.expectOne('http://api.teste/api/v1/conta/cadastro');
    pedido.flush({ codigo: 'duplicado', mensagem: 'Já existe conta para este e-mail.' }, { status: 409, statusText: 'Conflict' });

    expect(navegar).not.toHaveBeenCalled();
    http.verify();
  });
});
