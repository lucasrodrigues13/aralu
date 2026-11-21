import { ParcelaContrato } from '../../core/dinheiro.client';
import { linkWhatsapp, textoCobranca } from './cobranca';

function parcela(cobranca: ParcelaContrato['cobranca']): ParcelaContrato {
  return {
    id: '1', numero: 2, vencimento: '2026-12-10', valor: 1500, entrada: false, recebido: 0, saldo: 1500,
    situacao: 'AReceber', cobranca, recebimentos: [],
  };
}

describe('textoCobranca', () => {
  it('muda o texto para lembrete, vence hoje e atrasada', () => {
    expect(textoCobranca(parcela('Lembrete'), 'Ana Souza', null)).toContain('vence em 10/12/2026');
    expect(textoCobranca(parcela('VenceHoje'), 'Ana Souza', null)).toContain('vence hoje');
    expect(textoCobranca(parcela('Atrasada'), 'Ana Souza', null)).toContain('ainda está em aberto');
  });

  it('cumprimenta pelo primeiro nome e inclui a chave Pix quando houver', () => {
    const texto = textoCobranca(parcela('Lembrete'), 'Ana Souza', 'ana@pix.com');
    expect(texto.startsWith('Olá, Ana!')).toBe(true);
    expect(texto).toContain('Chave Pix: ana@pix.com');
    expect(textoCobranca(parcela('Lembrete'), 'Ana', null)).not.toContain('Chave Pix');
  });
});

describe('linkWhatsapp', () => {
  it('monta o número com DDI e codifica o texto', () => {
    expect(linkWhatsapp('Oi você', '55', '(11) 98888-7777')).toBe('https://wa.me/5511988887777?text=Oi%20voc%C3%AA');
    expect(linkWhatsapp('Oi', '55', '')).toBe('https://wa.me/?text=Oi');
  });
});
