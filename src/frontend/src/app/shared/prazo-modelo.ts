/**
 * Prazo relativo à data do evento (SPEC-012 v3 §8.1): dias, negativo = antes, 0 = no dia, positivo = depois.
 * Mês = 30 dias; semana = 7.
 */

export type TipoPrazo = 'semPrazo' | 'relativo' | 'dataExata';
export type UnidadePrazo = 'dias' | 'semanas' | 'meses' | 'noDia';
export type SentidoPrazo = 'antes' | 'depois';

export const TIPOS_PRAZO: { valor: TipoPrazo; rotulo: string }[] = [
  { valor: 'semPrazo', rotulo: 'Sem prazo' },
  { valor: 'relativo', rotulo: 'Relativo ao evento' },
  { valor: 'dataExata', rotulo: 'Data exata' },
];

export const UNIDADES_PRAZO: { valor: UnidadePrazo; rotulo: string }[] = [
  { valor: 'dias', rotulo: 'dias' },
  { valor: 'semanas', rotulo: 'semanas' },
  { valor: 'meses', rotulo: 'meses' },
  { valor: 'noDia', rotulo: 'No dia do evento' },
];

export const SENTIDOS_PRAZO: { valor: SentidoPrazo; rotulo: string }[] = [
  { valor: 'antes', rotulo: 'antes' },
  { valor: 'depois', rotulo: 'depois' },
];

/** Quantidade, unidade e sentido do formulário para o deslocamento em dias. */
export function relativoParaDias(quantidade: number | string | null, unidade: UnidadePrazo, sentido: SentidoPrazo): number | null {
  if (unidade === 'noDia') {
    return 0;
  }
  const qtd = quantidade === '' || quantidade == null ? null : Number(quantidade);
  if (qtd == null || Number.isNaN(qtd)) {
    return null;
  }
  const dias = unidade === 'meses' ? qtd * 30 : unidade === 'semanas' ? qtd * 7 : qtd;
  return sentido === 'depois' ? dias : -dias;
}

/** Decompõe o deslocamento para o formulário (meses → semanas → dias). */
export function diasParaRelativo(dias: number | null | undefined): { quantidade: number | null; unidade: UnidadePrazo; sentido: SentidoPrazo } {
  if (dias == null || dias === 0) {
    return { quantidade: null, unidade: dias === 0 ? 'noDia' : 'semanas', sentido: 'antes' };
  }
  const sentido: SentidoPrazo = dias < 0 ? 'antes' : 'depois';
  const absoluto = Math.abs(dias);
  if (absoluto % 30 === 0) {
    return { quantidade: absoluto / 30, unidade: 'meses', sentido };
  }
  if (absoluto % 7 === 0) {
    return { quantidade: absoluto / 7, unidade: 'semanas', sentido };
  }
  return { quantidade: absoluto, unidade: 'dias', sentido };
}

/** "6 semanas antes", "2 semanas depois", "No dia do evento", "Sem prazo". */
export function exibirPrazoRelativo(dias: number | null | undefined): string {
  if (dias == null) {
    return 'Sem prazo';
  }
  if (dias === 0) {
    return 'No dia do evento';
  }
  const sentido = dias < 0 ? 'antes' : 'depois';
  const absoluto = Math.abs(dias);
  if (absoluto % 30 === 0) {
    const meses = absoluto / 30;
    return meses === 1 ? `1 mês ${sentido}` : `${meses} meses ${sentido}`;
  }
  if (absoluto % 7 === 0) {
    const semanas = absoluto / 7;
    return semanas === 1 ? `1 semana ${sentido}` : `${semanas} semanas ${sentido}`;
  }
  return absoluto === 1 ? `1 dia ${sentido}` : `${absoluto} dias ${sentido}`;
}

/** Data do evento + deslocamento, em ISO (aaaa-mm-dd). Nulo sem data do evento. */
export function prazoEfetivo(dataEvento: string | null | undefined, dias: number | null | undefined): string | null {
  if (!dataEvento || dias == null) {
    return null;
  }
  const [ano, mes, dia] = dataEvento.slice(0, 10).split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return data.toISOString().slice(0, 10);
}

/** Ordem do prazo relativo na lista: mais distantes antes do evento primeiro, depois no dia, depois "depois", sem prazo no fim. */
export function ordemPrazoRelativo(dias: number | null | undefined): number {
  return dias == null ? Number.MAX_SAFE_INTEGER : dias;
}

export const LIMITE_RELATIVO = 999;
