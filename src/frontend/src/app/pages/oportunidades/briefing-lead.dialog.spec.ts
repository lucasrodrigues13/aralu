import type { BriefingDoLead } from '../../core/negocio.client';
import { linkBriefing, situacaoBriefing, whatsappBriefing } from './briefing-lead.dialog';

function briefing(campos: Partial<BriefingDoLead>): BriefingDoLead {
  return { modeloId: null, modeloNome: 'x', aplicadoEm: '', itens: [], token: 't', liberadoEm: '2026-11-20T10:00:00Z', respondidoEm: null, validoAte: null, concluidoEm: null, ...campos };
}

describe('situação do link do briefing', () => {
  const agora = new Date('2026-11-26T12:00:00Z');
  it('aberto dentro da validade', () => {
    expect(situacaoBriefing(briefing({ validoAte: '2026-11-27T10:00:00Z' }), agora)).toBe('aberto');
  });
  it('fechado depois da validade ou sem liberação', () => {
    expect(situacaoBriefing(briefing({ validoAte: '2026-11-25T10:00:00Z' }), agora)).toBe('fechado');
    expect(situacaoBriefing(briefing({ liberadoEm: null }), agora)).toBe('fechado');
  });
  it('concluído pelo cliente', () => {
    expect(situacaoBriefing(briefing({ concluidoEm: '2026-11-26T09:00:00Z' }), agora)).toBe('concluido');
  });
});

describe('briefing pelo cliente (SPEC-066)', () => {
  it('monta o link público do briefing', () => {
    expect(linkBriefing('abc', 'https://app.aralu.com.br')).toBe('https://app.aralu.com.br/briefing/abc');
  });

  it('abre o wa.me com o telefone do contato e o link na mensagem', () => {
    const url = whatsappBriefing('(11) 98888-7777', 'Beatriz Souza', 'https://x/briefing/abc');
    expect(url.startsWith('https://wa.me/5511988887777?text=')).toBe(true);
    const texto = decodeURIComponent(url.split('text=')[1]);
    expect(texto).toContain('Olá, Beatriz!');
    expect(texto).toContain('https://x/briefing/abc');
  });

  it('sem telefone deixa o WhatsApp escolher o contato', () => {
    expect(whatsappBriefing(null, null, 'x').startsWith('https://wa.me/?text=Ol%C3%A1!')).toBe(true);
  });
});
