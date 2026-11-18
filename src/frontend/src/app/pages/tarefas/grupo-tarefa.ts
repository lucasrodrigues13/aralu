export interface TarefaAgrupavel {
  grupoPrazo: string | null;
  situacao: string;
  prazo: string | null;
  titulo: string;
  eventoId: string;
  servicoEventoId: string | null;
  tags: string[];
  responsaveis: { papel: string }[];
}

export interface SecaoTarefas<T> {
  id: string;
  rotulo: string;
  tarefas: T[];
}

export interface FiltroTarefasLista {
  situacao: string;
  eventoId: string;
  responsavel: string;
  servicoId: string;
  tag: string;
  prazoDe: string | null;
  prazoAte: string | null;
}

const ORDEM = ['EstaSemana', 'Depois', 'SemPrazo', 'ParaConferir'] as const;

const ROTULO_GRUPO: Record<string, string> = {
  EstaSemana: 'Esta semana',
  Depois: 'Depois',
  SemPrazo: 'Sem prazo',
  ParaConferir: 'Para conferir',
  Feitas: 'Feitas',
};

export function secoesPorPrazo<T extends TarefaAgrupavel>(
  tarefas: T[],
  rotuloSituacao: (situacao: string) => string,
): SecaoTarefas<T>[] {
  const grupos = ORDEM.map((id) => ({
    id,
    rotulo: ROTULO_GRUPO[id],
    tarefas: tarefas.filter((tarefa) => tarefa.grupoPrazo === id).sort(porPrazoETitulo),
  })).filter((secao) => secao.tarefas.length > 0);

  const soltas = tarefas.filter((tarefa) => tarefa.grupoPrazo == null);
  const situacoes = [...new Set(soltas.map((tarefa) => tarefa.situacao))];
  const extras = situacoes.map((situacao) => ({
    id: `situacao-${situacao}`,
    rotulo: rotuloSituacao(situacao),
    tarefas: soltas.filter((tarefa) => tarefa.situacao === situacao).sort(porPrazoETitulo),
  }));

  const feitas = tarefas.filter((tarefa) => tarefa.grupoPrazo === 'Feitas').sort(porPrazoETitulo);
  const secaoFeitas = feitas.length > 0 ? [{ id: 'Feitas', rotulo: ROTULO_GRUPO['Feitas'], tarefas: feitas }] : [];
  return [...grupos, ...extras, ...secaoFeitas];
}

export function colunasPorDia<T extends TarefaAgrupavel>(tarefas: T[]): SecaoTarefas<T>[] {
  const dias = [...new Set(tarefas.filter((tarefa) => tarefa.prazo).map((tarefa) => tarefa.prazo!.slice(0, 10)))].sort();
  const colunas = dias.map((dia) => ({
    id: dia,
    rotulo: dia,
    tarefas: tarefas.filter((tarefa) => tarefa.prazo?.slice(0, 10) === dia).sort(porPrazoETitulo),
  }));
  const semPrazo = tarefas.filter((tarefa) => !tarefa.prazo).sort(porPrazoETitulo);
  if (semPrazo.length > 0) {
    colunas.push({ id: 'sem-prazo', rotulo: 'Sem prazo', tarefas: semPrazo });
  }
  return colunas;
}

export function filtrarTarefas<T extends TarefaAgrupavel>(tarefas: T[], filtro: FiltroTarefasLista): T[] {
  const tag = filtro.tag.trim().toLocaleLowerCase('pt');
  return tarefas.filter((tarefa) => {
    if (filtro.situacao && tarefa.situacao !== filtro.situacao) return false;
    if (filtro.eventoId && tarefa.eventoId !== filtro.eventoId) return false;
    if (filtro.responsavel && !tarefa.responsaveis.some((item) => item.papel === filtro.responsavel)) return false;
    if (filtro.servicoId && tarefa.servicoEventoId !== filtro.servicoId) return false;
    if (tag && !tarefa.tags.some((item) => item.toLocaleLowerCase('pt').includes(tag))) return false;
    const dia = tarefa.prazo?.slice(0, 10) ?? null;
    if (filtro.prazoDe && (!dia || dia < filtro.prazoDe)) return false;
    if (filtro.prazoAte && (!dia || dia > filtro.prazoAte)) return false;
    return true;
  });
}

export function ordenarPorPrazo<T extends TarefaAgrupavel>(tarefas: T[]): T[] {
  return [...tarefas].sort(porPrazoETitulo);
}

function porPrazoETitulo(a: TarefaAgrupavel, b: TarefaAgrupavel): number {
  const prazoA = a.prazo?.slice(0, 10) ?? '';
  const prazoB = b.prazo?.slice(0, 10) ?? '';
  if (prazoA && prazoB && prazoA !== prazoB) return prazoA < prazoB ? -1 : 1;
  if (prazoA && !prazoB) return -1;
  if (!prazoA && prazoB) return 1;
  return a.titulo.localeCompare(b.titulo, 'pt');
}
