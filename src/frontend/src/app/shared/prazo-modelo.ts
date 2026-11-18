/** Converte e exibe o prazo da tarefa do modelo (SPEC-012 §8.1). Mês = 30 dias; semana = 7. */

export type UnidadePrazo = 'dias' | 'semanas' | 'meses' | 'noDia' | 'semPrazo';

export const UNIDADES_PRAZO: { valor: UnidadePrazo; rotulo: string }[] = [
  { valor: 'dias', rotulo: 'dias antes' },
  { valor: 'semanas', rotulo: 'semanas antes' },
  { valor: 'meses', rotulo: 'meses antes' },
  { valor: 'noDia', rotulo: 'No dia do evento' },
  { valor: 'semPrazo', rotulo: 'Sem prazo' },
];

export function prazoParaDias(quantidade: number | null, unidade: UnidadePrazo): number | null {
  if (unidade === 'semPrazo') {
    return null;
  }
  if (unidade === 'noDia') {
    return 0;
  }
  if (quantidade == null || Number.isNaN(quantidade)) {
    return null;
  }
  if (unidade === 'semanas') {
    return quantidade * 7;
  }
  if (unidade === 'meses') {
    return quantidade * 30;
  }
  return quantidade;
}

export function exibirPrazo(diasAntes: number | null | undefined): string {
  if (diasAntes == null) {
    return 'Sem prazo';
  }
  if (diasAntes === 0) {
    return 'No dia do evento';
  }
  if (diasAntes % 30 === 0) {
    const meses = diasAntes / 30;
    return meses === 1 ? '1 mês antes' : `${meses} meses antes`;
  }
  if (diasAntes % 7 === 0) {
    const semanas = diasAntes / 7;
    return semanas === 1 ? '1 semana antes' : `${semanas} semanas antes`;
  }
  return diasAntes === 1 ? '1 dia antes' : `${diasAntes} dias antes`;
}

export function prazoDeDias(diasAntes: number | null | undefined): { quantidade: number | null; unidade: UnidadePrazo } {
  if (diasAntes == null) {
    return { quantidade: null, unidade: 'semPrazo' };
  }
  if (diasAntes === 0) {
    return { quantidade: null, unidade: 'noDia' };
  }
  if (diasAntes % 30 === 0) {
    return { quantidade: diasAntes / 30, unidade: 'meses' };
  }
  if (diasAntes % 7 === 0) {
    return { quantidade: diasAntes / 7, unidade: 'semanas' };
  }
  return { quantidade: diasAntes, unidade: 'dias' };
}
