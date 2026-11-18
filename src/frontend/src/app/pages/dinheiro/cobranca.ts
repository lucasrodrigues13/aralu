import { ParcelaCasal } from '../../core/dinheiro.client';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function data(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Texto do "Cobrar" (SPEC-029 §6.2): muda se é lembrete, se vence hoje ou se atrasou. */
export function textoCobranca(parcela: ParcelaCasal, nome: string, chavePix: string | null): string {
  const quem = nome.trim() ? `Olá, ${nome.trim().split(/\s+/)[0]}!` : 'Olá!';
  const qual = parcela.entrada ? 'a entrada' : `a parcela ${parcela.numero}`;
  const valor = moeda.format(parcela.saldo > 0 ? parcela.saldo : parcela.valor);
  let corpo: string;
  switch (parcela.cobranca) {
    case 'VenceHoje':
      corpo = `Passando para avisar que ${qual}, de ${valor}, vence hoje (${data(parcela.vencimento)}).`;
      break;
    case 'Atrasada':
      corpo = `Notamos que ${qual}, de ${valor}, com vencimento em ${data(parcela.vencimento)}, ainda está em aberto.`;
      break;
    default:
      corpo = `Passando para lembrar que ${qual}, de ${valor}, vence em ${data(parcela.vencimento)}.`;
  }
  const pix = chavePix?.trim() ? `\n\nChave Pix: ${chavePix.trim()}` : '';
  return `${quem} ${corpo}${pix}\n\nQualquer dúvida, estou à disposição.`;
}

/** Link do WhatsApp com o texto. Sem telefone, abre o WhatsApp para escolher o contato. */
export function linkWhatsapp(texto: string, ddi: string | null, celular: string | null): string {
  const numero = `${(ddi ?? '55').replace(/\D/g, '')}${(celular ?? '').replace(/\D/g, '')}`;
  const destino = (celular ?? '').replace(/\D/g, '').length >= 8 ? numero : '';
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}
