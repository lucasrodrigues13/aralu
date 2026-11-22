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
      return exemplo === undefined ? `<mark class="desconhecida">${marca}</mark>` : `<mark>${escapar(exemplo)}</mark>`;
    })
    .replace(/\n/g, '<br>');
}

/** Tags {{...}} do texto que não existem na lista (SPEC-055): ficam sem troca no contrato; sem repetição. */
export function tagsDesconhecidas(texto: string, campos: CampoMesclagem[]): string[] {
  const conhecidas = new Set(campos.map((campo) => campo.marca));
  const achadas = new Set<string>();
  for (const [, nome] of texto.matchAll(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g)) {
    if (!conhecidas.has(nome.toLowerCase())) {
      achadas.add(nome.toLowerCase());
    }
  }
  return [...achadas];
}

/** Filtra as tags do seletor pela busca (marca, o que representa ou fonte), sem acento nem caixa (SPEC-053). */
export function filtrarCampos(campos: CampoMesclagem[], busca: string): CampoMesclagem[] {
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const termo = normalizar(busca.trim());
  if (!termo) {
    return campos;
  }
  return campos.filter((campo) => normalizar(`${campo.marca} ${campo.rotulo} ${campo.fonte}`).includes(termo));
}

/** Insere a marca no cursor do textarea e devolve o texto novo e a posição do cursor. */
export function inserirMarca(texto: string, inicio: number, fim: number, marca: string): { texto: string; cursor: number } {
  const trecho = `{{${marca}}}`;
  return { texto: texto.slice(0, inicio) + trecho + texto.slice(fim), cursor: inicio + trecho.length };
}
