import { NomeAssistente } from '../core/assistentes.client';
import { PAPEIS_RESPONSAVEL_TAREFA } from '../core/negocio.client';

/** Responsável como o back-end devolve: papel + referência (a assistente é "Assistente" + id). */
export interface ResponsavelItem {
  papel: string;
  referenciaId?: string | null;
}

export interface OpcaoResponsavel {
  valor: string;
  rotulo: string;
}

/** Chave usada nos seletores: "Organizer", "Casal" ou "Assistente:<id>". */
export function chaveResponsavel(item: ResponsavelItem): string {
  return item.papel === 'Assistente' && item.referenciaId ? `Assistente:${item.referenciaId}` : item.papel;
}

/** Volta da chave do seletor para o pedido da API. */
export function pedidoResponsavel(chave: string): { papel: string; referenciaId?: string } {
  const [papel, referencia] = chave.split(':');
  return referencia ? { papel, referenciaId: referencia } : { papel };
}

/** Opções do seletor: a dona, o casal e as assistentes ativas (mais as removidas que já estão na tarefa). */
export function opcoesResponsavel(
  assistentes: NomeAssistente[],
  rotuloDona: string,
  incluirRemovidas: string[] = [],
): OpcaoResponsavel[] {
  return [
    ...PAPEIS_RESPONSAVEL_TAREFA.map((papel) => ({ valor: papel.valor, rotulo: papel.valor === 'Organizer' ? rotuloDona : papel.rotulo })),
    ...assistentes
      .filter((item) => !item.removida || incluirRemovidas.includes(`Assistente:${item.id}`))
      .map((item) => ({ valor: `Assistente:${item.id}`, rotulo: item.removida ? `${item.nome} (removida)` : item.nome })),
  ];
}

export function rotuloResponsavel(item: ResponsavelItem, opcoes: OpcaoResponsavel[]): string {
  const chave = chaveResponsavel(item);
  return opcoes.find((opcao) => opcao.valor === chave)?.rotulo ?? (item.papel === 'Assistente' ? 'Assistente' : item.papel);
}
