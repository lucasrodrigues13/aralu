import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { itensDaPessoa } from '../pages/eventos/equipe-evento.dialog';
import { EquipeEventoClient, linkEquipe, whatsappEquipe } from './equipe-evento.client';

describe('Equipe do evento (SPEC-067)', () => {
  it('monta o link público da pessoa', () => {
    expect(linkEquipe('abc_DEF', 'https://aralu.exemplo')).toBe('https://aralu.exemplo/equipe/abc_DEF');
  });

  it('abre o WhatsApp no número com DDI e avisa do código', () => {
    const url = whatsappEquipe({ nome: 'Carlos Silva', telefone: '(11) 98888-7777' }, 'Casamento', 'https://x/equipe/t');
    expect(url.startsWith('https://wa.me/5511988887777?text=')).toBe(true);
    const texto = decodeURIComponent(url.split('text=')[1]);
    expect(texto).toContain('Olá, Carlos!');
    expect(texto).toContain('código');
  });

  it('sem telefone, deixa a pessoa escolher o contato', () => {
    expect(whatsappEquipe({ nome: 'Ana', telefone: null }, 'Festa', 'l').startsWith('https://wa.me/?text=')).toBe(true);
  });

  it('resume o que a pessoa recebe', () => {
    expect(itensDaPessoa({ recebePortaria: true, recebeRoteiro: true, recebeCronograma: false })).toBe('Portaria, Roteiro');
  });

  describe('cliente', () => {
    let cliente: EquipeEventoClient;
    let http: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
      cliente = TestBed.inject(EquipeEventoClient);
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('libera e encerra o link da pessoa', () => {
      cliente.liberar('e1', 'p1').subscribe();
      const liberar = http.expectOne((r) => r.url.endsWith('/api/v1/eventos/e1/equipe/p1/liberacao'));
      expect(liberar.request.method).toBe('POST');
      liberar.flush({});

      cliente.encerrar('e1', 'p1').subscribe();
      const encerrar = http.expectOne((r) => r.url.endsWith('/api/v1/eventos/e1/equipe/p1/liberacao'));
      expect(encerrar.request.method).toBe('DELETE');
      encerrar.flush({});
    });

    it('pede o código sem escolher e-mail', () => {
      cliente.pedirCodigo('tok').subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/equipe/tok/acesso/codigo'));
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });
});
