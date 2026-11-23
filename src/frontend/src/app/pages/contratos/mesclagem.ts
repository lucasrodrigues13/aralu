import { CampoMesclagem } from '../../core/contrato.client';
import { ehHtml } from '../../shared/editor-rico';

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * "Ver como fica" (SPEC-030 v3 §6.1): troca cada {{marca}} conhecida pelo exemplo, destacado em <mark>.
 * Texto antigo (sem HTML) é escapado antes e ganha <br>; HTML do editor entra como está
 * (o [innerHTML] do Angular ainda sanitiza) e só os exemplos são escapados.
 */
export function previaDestacada(texto: string, campos: CampoMesclagem[]): string {
  const exemplos = new Map(campos.map((campo) => [campo.marca, campo.exemplo]));
  const html = ehHtml(texto);
  const base = html ? texto : escapar(texto);
  const trocado = base.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (marca, nome: string) => {
    const exemplo = exemplos.get(nome.toLowerCase());
    return exemplo === undefined ? `<mark class="desconhecida">${marca}</mark>` : `<mark>${escapar(exemplo)}</mark>`;
  });
  return html ? trocado : trocado.replace(/\n/g, '<br>');
}

/** Texto do contrato já gerado para exibir/imprimir. HTML do editor entra como está; texto antigo é escapado, com quebra de linha. */
export function textoEmHtml(texto: string): string {
  return ehHtml(texto) ? texto : escapar(texto).replace(/\n/g, '<br>');
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
