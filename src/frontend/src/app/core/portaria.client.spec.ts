import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PortariaClient, PREFIXO_QR_ENTRADA } from './portaria.client';

describe('PortariaClient (SPEC-058)', () => {
  let portaria: PortariaClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    portaria = TestBed.inject(PortariaClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());


  it('lê a lista pelo link da pessoa da equipe', () => {
    portaria.ler('abc').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/equipe/abc/portaria'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('abre o convite do QR escapando o texto lido', () => {
    portaria.lerPeloQr('abc', `${PREFIXO_QR_ENTRADA}xyz`).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/equipe/abc/portaria/qr/entrada%3Axyz'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('marca quem compareceu no convite', () => {
    portaria.marcar('abc', 'c1', ['p1', 'p2'], ['p3']).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/equipe/abc/portaria/convites/c1/comparecimento'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ compareceram: ['p1', 'p2'], desfazer: ['p3'] });
    req.flush({});
  });
});
