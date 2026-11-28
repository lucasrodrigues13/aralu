import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LinkClienteClient, enderecoDoLinkCliente } from './link-cliente.client';

describe('enderecoDoLinkCliente', () => {
  it('monta o endereço público do cliente com o código', () => {
    expect(enderecoDoLinkCliente('https://aralu.exemplo', 'abc-DEF_123')).toBe('https://aralu.exemplo/cliente/abc-DEF_123');
  });
});

describe('LinkClienteClient: convites (SPEC-052)', () => {
  let cliente: LinkClienteClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    cliente = TestBed.inject(LinkClienteClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const pedido = { nome: 'Família Souza', email: null, excecaoPrazoRsvp: false, convidados: [{ id: null, nome: 'Maria Souza', ddi: '+55', celular: '11999990000', genero: null, faixa: null, principal: true }] };

  it('cria o convite pelo código do link', () => {
    cliente.criarConvite('abc', pedido).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/cliente/abc/convites'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(pedido);
    req.flush({});
  });

  it('edita o convite pelo código do link', () => {
    cliente.atualizarConvite('abc', 'c1', pedido).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/publico/cliente/abc/convites/c1'));
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('as ferramentas da aba Convidados usam o código do link (SPEC-059)', () => {
    cliente.definirPrazoRsvp('abc', '2099-01-01').subscribe();
    cliente.definirEnvioConvites('abc', null).subscribe();
    cliente.presencas('abc').subscribe();
    cliente.planilha('abc').subscribe();
    cliente.importar('abc', new File(['x'], 'convidados.xlsx')).subscribe();

    const prazo = http.expectOne((r) => r.url.endsWith('/api/v1/publico/cliente/abc/prazo-rsvp'));
    expect([prazo.request.method, prazo.request.body]).toEqual(['PUT', { prazo: '2099-01-01' }]);
    expect(http.expectOne((r) => r.url.endsWith('/abc/envio-convites')).request.body).toEqual({ data: null });
    expect(http.expectOne((r) => r.url.endsWith('/abc/presencas')).request.method).toBe('GET');
    expect(http.expectOne((r) => r.url.endsWith('/abc/convites/planilha')).request.responseType).toBe('blob');
    const importar = http.expectOne((r) => r.url.endsWith('/abc/convites/importar'));
    expect((importar.request.body as FormData).get('arquivo')).toBeInstanceOf(File);
  });

  it('a organizadora liga as duas marcações juntas', () => {
    cliente.liberar('e1', { financeiroLiberado: false, convidadosLiberado: true }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/v1/eventos/e1/link-cliente'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ financeiroLiberado: false, convidadosLiberado: true });
    req.flush({});
  });
});
