import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { API_BASE_URL } from '../../core/api-base-url';
import { GD_DATE_FORMATS, GdDateAdapter } from '../../shared/gd-date-adapter';
import { PerfilPage } from './perfil.page';

const perfilVazio = {
  email: 'ana@aralu.test',
  nomeEmpresa: 'Assessoria Ana',
  responsavel: 'Ana Lima',
  documento: '',
  celular: '',
  nascimento: null,
  pais: null,
  cep: null,
  endereco: '',
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  estado: null,
  fotoId: null,
  chavePix: null,
};

describe('PerfilPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: API_BASE_URL, useValue: 'http://api.teste' },
        { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
        { provide: DateAdapter, useClass: GdDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: GD_DATE_FORMATS },
      ],
    }).compileComponents();
  });

  function montar(corpo: object): HTMLElement {
    const fixture = TestBed.createComponent(PerfilPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const perfil = http.expectOne('http://api.teste/api/v1/perfil');
    perfil.flush(corpo);
    const fotoId = (corpo as { fotoId: string | null }).fotoId;
    if (fotoId) {
      http.expectOne(`http://api.teste/api/v1/arquivos/${fotoId}`).flush(new Blob(['x'], { type: 'image/png' }));
    }
    fixture.detectChanges();
    http.verify();
    return fixture.nativeElement as HTMLElement;
  }

  it('sem foto mostra só Enviar foto', () => {
    const raiz = montar(perfilVazio);

    expect([...raiz.querySelectorAll('mat-card-title')].map((t) => t.textContent).join(' ')).toContain('Editar Ana Lima');
    expect(raiz.textContent).toContain('Enviar foto');
    expect(raiz.textContent).not.toContain('Remover');
  });

  it('mostra o endereço estruturado e o CEP preenche os campos', () => {
    const raiz = montar({ ...perfilVazio, cep: '01001-000', endereco: 'Praça da Sé', numero: '10', cidade: 'São Paulo', estado: 'SP' });

    const valor = (rotulo: string) => (raiz.querySelector(`input[aria-label="${rotulo}"]`) as HTMLInputElement).value;
    expect(valor('CEP')).toBe('01001-000');
    expect(valor('Endereço')).toBe('Praça da Sé');
    expect(valor('Número')).toBe('10');
    expect(valor('Cidade')).toBe('São Paulo');
    expect(raiz.querySelector('textarea')).toBeNull();
  });

  it('com foto mostra Alterar e Remover', () => {
    const raiz = montar({ ...perfilVazio, fotoId: '11111111-1111-1111-1111-111111111111' });

    expect(raiz.textContent).toContain('Alterar');
    expect(raiz.textContent).toContain('Remover');
    expect(raiz.textContent).not.toContain('Enviar foto');
  });
});
