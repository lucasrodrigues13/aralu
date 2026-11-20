import { chaveResponsavel } from '../../shared/responsaveis';
export interface TarefaAgrupavel {
  grupoPrazo: string | null;
  situacao: string;
  prazo: string | null;
  titulo: string;
  eventoId: string;
  servicoEventoId: string | null;
  tags: string[];
  responsaveis: { papel: string; referenciaId?: string | null }[];
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
    if (filtro.responsavel && !tarefa.responsaveis.some((item) => chaveResponsavel(item) === filtro.responsavel)) return false;
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

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** Meses completos entre o prazo e o evento (prazo + N meses ainda não passa do evento). */
function mesesCompletos(prazo: string, evento: string): number {
  const [a1, m1, d1] = prazo.split('-').map(Number);
  const [a2, m2, d2] = evento.split('-').map(Number);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d1 > d2) meses--;
  return meses;
}

/** Grupo da tarefa pela distância do prazo até o evento (SPEC-003 §6.2). Ordem maior = mais longe do evento. */
export function grupoAteEvento(prazo: string | null, dataEvento: string | null): { id: string; rotulo: string; ordem: number } {
  if (!prazo) return { id: 'sem-prazo', rotulo: 'Sem prazo', ordem: -1_000_000 };
  const dia = prazo.slice(0, 10);
  if (!dataEvento) {
    const [ano, mes] = dia.split('-').map(Number);
    return { id: `mes-${dia.slice(0, 7)}`, rotulo: `${MESES[mes - 1]} de ${ano}`, ordem: -(ano * 12 + mes) };
  }
  const evento = dataEvento.slice(0, 10);
  const dias = diasEntre(dia, evento);
  if (dias < 0) return { id: 'depois', rotulo: 'Depois do evento', ordem: -1 };
  if (dias === 0) return { id: 'no-dia', rotulo: 'No dia do evento', ordem: 0 };
  const meses = mesesCompletos(dia, evento);
  if (meses >= 1) return { id: `meses-${meses}`, rotulo: `${plural(meses, 'mês', 'meses')} antes`, ordem: 3000 + meses };
  if (dias >= 7) {
    const semanas = Math.floor(dias / 7);
    return { id: `semanas-${semanas}`, rotulo: `${plural(semanas, 'semana', 'semanas')} antes`, ordem: 2000 + semanas };
  }
  return { id: `dias-${dias}`, rotulo: `${plural(dias, 'dia', 'dias')} antes`, ordem: 1000 + dias };
}

/** Seções da aba Tarefas do evento: do mais longe para o mais perto do evento, "Sem prazo" no fim. */
export function secoesAteEvento<T extends TarefaAgrupavel>(tarefas: T[], dataEvento: string | null): SecaoTarefas<T>[] {
  const grupos = new Map<string, { rotulo: string; ordem: number; tarefas: T[] }>();
  for (const tarefa of tarefas) {
    const grupo = grupoAteEvento(tarefa.prazo, dataEvento);
    const atual = grupos.get(grupo.id) ?? { rotulo: grupo.rotulo, ordem: grupo.ordem, tarefas: [] };
    atual.tarefas.push(tarefa);
    grupos.set(grupo.id, atual);
  }
  return [...grupos.entries()]
    .sort(([, a], [, b]) => b.ordem - a.ordem)
    .map(([id, grupo]) => ({ id, rotulo: grupo.rotulo, tarefas: grupo.tarefas.sort(porPrazoETitulo) }));
}
