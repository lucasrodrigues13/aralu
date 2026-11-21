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

export function marcarServico(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id];
}
