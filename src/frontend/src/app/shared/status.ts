/**
 * Etiqueta de situação no desenho do TailwindAdmin (exemplo de tabela do template):
 * fundo claro da cor + texto na cor, cantos de 7px, 12px semibold.
 */
const BASE = 'inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap';

export const STATUS = {
  sucesso: `${BASE} bg-light-success text-success`,
  alerta: `${BASE} bg-light-warning text-warning`,
  erro: `${BASE} bg-light-error text-error`,
  info: `${BASE} bg-light-info text-info`,
  primario: `${BASE} bg-light-primary text-primary`,
  neutro: `${BASE} bg-light text-muted`,
} as const;
