import { ServicoConta } from '../../core/negocio.client';

export const NOVO_SERVICO = '__novo-servico__';

export function normalizarBusca(valor: string): string {
  return valor.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function servicoCombina(servico: ServicoConta, termo: string): boolean {
  const busca = normalizarBusca(termo);
  return !busca || normalizarBusca(servico.nome).includes(busca);
}

export function incluirServico(lista: ServicoConta[], servico: ServicoConta): ServicoConta[] {
  if (lista.some((item) => item.id === servico.id)) {
    return lista;
  }
  return [...lista, servico].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
}

/** Nomes da lista separada por vírgula: sem espaços nas pontas, sem vazios e sem repetidos (ignorando maiúsculas). */
export function nomesDaLista(texto: string): string[] {
  const vistos = new Set<string>();
  return texto
    .split(',')
    .map((nome) => nome.trim().replace(/\s+/g, ' '))
    .filter((nome) => {
      const chave = nome.toLowerCase();
      if (!nome || vistos.has(chave)) {
        return false;
      }
      vistos.add(chave);
      return true;
    });
}

export function marcarServico(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id];
}

/** Nomes vindos do texto de um arquivo .txt/.csv: aceita vírgula, ponto e vírgula ou quebra de linha, e tira aspas. */
export function nomesDoTexto(texto: string): string[] {
  return nomesDaLista(texto.replace(/^﻿/, '').replace(/["']/g, '').replace(/[;\r\n]+/g, ','));
}
