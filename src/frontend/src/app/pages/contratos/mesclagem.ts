import { CampoMesclagem } from '../../core/contrato.client';

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * "Ver como fica" (SPEC-030 v3 §6.1): troca cada {{marca}} conhecida pelo exemplo, destacado em <mark>.
 * O texto é escapado antes, então só o <mark> e o <br> entram como HTML.
 */
export function previaDestacada(texto: string, campos: CampoMesclagem[]): string {
  const exemplos = new Map(campos.map((campo) => [campo.marca, campo.exemplo]));
  return escapar(texto)
    .replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (marca, nome: string) => {
      const exemplo = exemplos.get(nome.toLowerCase());
      return exemplo === undefined ? marca : `<mark>${escapar(exemplo)}</mark>`;
    })
    .replace(/\n/g, '<br>');
}

/** Insere a marca no cursor do textarea e devolve o texto novo e a posição do cursor. */
export function inserirMarca(texto: string, inicio: number, fim: number, marca: string): { texto: string; cursor: number } {
  const trecho = `{{${marca}}}`;
  return { texto: texto.slice(0, inicio) + trecho + texto.slice(fim), cursor: inicio + trecho.length };
}
