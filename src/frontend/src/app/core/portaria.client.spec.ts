import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { enderecoDoLinkPortaria, PortariaClient, PREFIXO_QR_ENTRADA } from './portaria.client';

describe('enderecoDoLinkPortaria', () => {
  it('monta o endereço público da portaria com o código', () => {
    expect(enderecoDoLinkPortaria('https://aralu.exemplo', 'abc-DEF_123')).toBe('https://aralu.exemplo/portaria/abc-DEF_123');
  });
});

describe('PortariaClient (SPEC-058)', () => {
  let portaria: PortariaClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    portaria = TestBed.inject(PortariaClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gera e desativa o link do evento', () => {
    portaria.gerar('e1').subscribe();
    const gerar = http.expectOne((r) => r.url.endsWith('/api/v1/eventos/e1/link-portaria'));
    expect(gerar.request.method).toBe('POST');
    gerar.flush({ ativo: true, token: 't' });

    portaria.desativar('e1').subscribe();
    const desativar = http.expectOne((r) => r.url.endsWith('/api/v1/eventos/e1/link-portaria'));
    expect(desativar.request.method).toBe('DELETE');
    desativar.flush({ ativo: false, token: null });
  });

  it('lê a lista pelo código do link', () => {
    portaria.ler('abc').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/portaria/abc'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('abre o convite do QR escapando o texto lido', () => {
    portaria.lerPeloQr('abc', `${PREFIXO_QR_ENTRADA}xyz`).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/portaria/abc/qr/entrada%3Axyz'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('marca quem compareceu no convite', () => {
    portaria.marcar('abc', 'c1', ['p1', 'p2']).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/portaria/abc/convites/c1/comparecimento'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ compareceram: ['p1', 'p2'] });
    req.flush({});
  });
});
