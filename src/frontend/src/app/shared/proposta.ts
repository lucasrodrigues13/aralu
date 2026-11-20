import type { SituacaoProposta } from '../core/negocio.client';
import { STATUS } from './status';

/** Selo da proposta no cartão e na lista de orçamentos (SPEC-031 §6.6, item 6). */
export const SELO_PROPOSTA: Record<SituacaoProposta, { texto: string; classe: string; icone: string }> = {
  NaoAberta: { texto: 'Proposta não aberta', classe: STATUS.neutro, icone: 'mark_email_unread' },
  Aberta: { texto: 'Proposta aberta', classe: STATUS.info, icone: 'drafts' },
  Aceita: { texto: 'Aceitou', classe: STATUS.sucesso, icone: 'thumb_up' },
  Duvidas: { texto: 'Com dúvidas', classe: STATUS.alerta, icone: 'help' },
  Recusada: { texto: 'Recusou', classe: STATUS.erro, icone: 'thumb_down' },
};

/** Endereço público da proposta. */
export function linkProposta(token: string, origem: string = location.origin): string {
  return `${origem}/proposta/${token}`;
}

/**
 * wa.me com o texto pronto. Telefone sem DDI ganha o 55; sem telefone,
 * o WhatsApp abre para escolher o contato.
 */
export function whatsappProposta(telefone: string | null | undefined, nomeContato: string | null | undefined, link: string): string {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  const destino = digitos.length >= 10 ? (digitos.length <= 11 ? '55' + digitos : digitos) : '';
  const saudacao = nomeContato?.trim() ? `Olá, ${nomeContato.trim().split(/\s+/)[0]}!` : 'Olá!';
  const texto = `${saudacao} Segue a sua proposta: ${link}\nÉ só abrir e responder por lá.`;
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}
