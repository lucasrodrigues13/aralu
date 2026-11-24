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

/** Chave usada nos seletores: "Organizer", "Cliente", "Assistente" (o papel: todas) ou "Assistente:<id>". */
export function chaveResponsavel(item: ResponsavelItem): string {
  return item.papel === 'Assistente' && item.referenciaId ? `Assistente:${item.referenciaId}` : item.papel;
}

/** Volta da chave do seletor para o pedido da API. */
export function pedidoResponsavel(chave: string): { papel: string; referenciaId?: string } {
  const [papel, referencia] = chave.split(':');
  return referencia ? { papel, referenciaId: referencia } : { papel };
}

/** Opções do seletor: os papéis (Organizador, Assistente, Cliente) e as assistentes ativas pelo nome (mais as removidas que já estão na tarefa). */
export function opcoesResponsavel(
  assistentes: NomeAssistente[],
  rotuloDona: string,
  incluirRemovidas: string[] = [],
): OpcaoResponsavel[] {
  return [
    ...PAPEIS_RESPONSAVEL_TAREFA.map((papel) => ({
      valor: papel.valor,
      rotulo: papel.valor === 'Organizer' ? `Organizador (${rotuloDona.toLowerCase()})` : papel.rotulo,
    })),
    ...assistentes
      .filter((item) => !item.removida || incluirRemovidas.includes(`Assistente:${item.id}`))
      .map((item) => ({ valor: `Assistente:${item.id}`, rotulo: item.removida ? `${item.nome} (removida)` : item.nome })),
  ];
}

/**
 * Equipe da conta para o responsável da oportunidade: a dona (id da conta) e as assistentes (id delas).
 * `incluir` mantém valores já gravados que não estão mais na lista (assistente removida ou texto antigo).
 */
export function opcoesEquipe(
  contaId: string | null,
  assistentes: NomeAssistente[],
  rotuloDona: string,
  incluir: string[] = [],
): OpcaoResponsavel[] {
  const base: OpcaoResponsavel[] = [
    ...(contaId ? [{ valor: contaId, rotulo: rotuloDona }] : []),
    ...assistentes
      .filter((item) => !item.removida || incluir.includes(item.id))
      .map((item) => ({ valor: item.id, rotulo: item.removida ? `${item.nome} (removida)` : item.nome })),
  ];
  const extras = incluir
    .filter((valor) => valor && !base.some((opcao) => opcao.valor === valor))
    .map((valor) => ({ valor, rotulo: valor }));
  return [...base, ...extras];
}

export function rotuloResponsavel(item: ResponsavelItem, opcoes: OpcaoResponsavel[]): string {
  const chave = chaveResponsavel(item);
  return opcoes.find((opcao) => opcao.valor === chave)?.rotulo ?? (item.papel === 'Assistente' ? 'Assistente' : item.papel);
}

/**
 * Pedido de responsáveis depois de trocar a assistente removida: mantém os demais, tira as removidas
 * e acrescenta o escolhido (se ainda não estiver na lista). SPEC-032 §18, passo 2.
 */
export function trocarResponsavelRemovido(
  atuais: ResponsavelItem[],
  removidas: string[],
  novaChave: string,
): { papel: string; referenciaId?: string }[] {
  const restantes = atuais.filter((item) => !(item.papel === 'Assistente' && item.referenciaId && removidas.includes(item.referenciaId)));
  const chaves = restantes.map(chaveResponsavel);
  const pedido = restantes.map((item) => pedidoResponsavel(chaveResponsavel(item)));
  if (!chaves.includes(novaChave)) pedido.push(pedidoResponsavel(novaChave));
  return pedido;
}
