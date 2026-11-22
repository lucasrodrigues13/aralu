import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CasalClient, enderecoDoLinkCasal } from './casal.client';

describe('enderecoDoLinkCasal', () => {
  it('monta o endereço público do casal com o código', () => {
    expect(enderecoDoLinkCasal('https://aralu.exemplo', 'abc-DEF_123')).toBe('https://aralu.exemplo/casal/abc-DEF_123');
  });
});

describe('CasalClient: convites (SPEC-052)', () => {
  let casal: CasalClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    casal = TestBed.inject(CasalClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const pedido = { nome: 'Família Souza', email: null, excecaoPrazoRsvp: false, convidados: [{ id: null, nome: 'Maria Souza', ddi: '+55', celular: '11999990000' }] };

  it('cria o convite pelo código do link', () => {
    casal.criarConvite('abc', pedido).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/casal/abc/convites'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(pedido);
    req.flush({});
  });

  it('edita o convite pelo código do link', () => {
    casal.atualizarConvite('abc', 'c1', pedido).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/casal/abc/convites/c1'));
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('a organizadora liga as duas marcações juntas', () => {
    casal.liberar('e1', { financeiroLiberado: false, convidadosLiberado: true }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/eventos/e1/link-casal'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ financeiroLiberado: false, convidadosLiberado: true });
    req.flush({});
  });
});
