import { linkProposta, SELO_PROPOSTA, whatsappProposta } from './proposta';

describe('proposta por link', () => {
  it('monta o endereço público', () => {
    expect(linkProposta('abc', 'https://app.test')).toBe('https://app.test/proposta/abc');
  });

  it('manda pelo WhatsApp com DDI 55 e texto pronto', () => {
    const url = whatsappProposta('(11) 98888-7777', 'Ana Souza', 'https://app.test/proposta/abc');
    expect(url.startsWith('https://wa.me/5511988887777?text=')).toBe(true);
    const texto = decodeURIComponent(url.split('text=')[1]);
    expect(texto).toContain('Olá, Ana!');
    expect(texto).toContain('https://app.test/proposta/abc');
  });

  it('sem telefone abre o WhatsApp para escolher o contato', () => {
    expect(whatsappProposta(null, null, 'x').startsWith('https://wa.me/?text=Ol%C3%A1!')).toBe(true);
    expect(whatsappProposta('5521977776666', '', 'x').startsWith('https://wa.me/5521977776666?')).toBe(true);
  });

  it('tem selo para as cinco situações', () => {
    expect(Object.keys(SELO_PROPOSTA).sort()).toEqual(['Aberta', 'Aceita', 'Duvidas', 'NaoAberta', 'Recusada']);
    expect(SELO_PROPOSTA.Aceita.texto).toBe('Aceitou');
  });
});
