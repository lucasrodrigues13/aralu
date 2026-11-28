import { BudgetEvento } from '../../core/negocio.client';

export interface FatiaOrcamento {
  chave: 'contratado' | 'estimado' | 'restante' | 'excesso';
  rotulo: string;
  valor: number;
  /** Largura da fatia na barra, de 0 a 100. */
  largura: number;
  /** Percentual sobre o orçamento do evento; nulo quando não há orçamento. */
  percentualDoOrcamento: number | null;
}

export interface GraficoOrcamento {
  fatias: FatiaOrcamento[];
  semOrcamento: boolean;
  vazio: boolean;
  /** Quanto contratado + estimado passa do orçamento (0 quando não passa). */
  excesso: number;
}

export interface FatiaServico {
  id: string;
  nome: string;
  /** Contratado quando houver; senão o estimado. */
  valor: number;
  contratado: boolean;
  percentual: number;
  cor: string;
}

export interface RoscaServicos {
  fatias: FatiaServico[];
  total: number;
  /** Valor de background (conic-gradient) do círculo. */
  fundo: string;
}

const CORES_SERVICO = ['#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f'];
const COR_OUTROS = '#9e9e9e';
const MAX_FATIAS = 5;

const positivo = (valor: number): number => (valor > 0 ? valor : 0);

/**
 * Barra empilhada Contratado / Estimado / Restante do orçamento (SPEC-047 §6 e §8).
 * Serviço contratado entra só pelo valor contratado; o estimado dele não soma de novo.
 */
export function montarGraficoOrcamento(dados: BudgetEvento): GraficoOrcamento {
  const orcamento = positivo(dados.budget);
  const contratado = positivo(dados.contratado);
  const estimado = dados.servicos
    .filter((servico) => positivo(servico.contratado) === 0)
    .reduce((soma, servico) => soma + positivo(servico.estimado), 0);
  const usado = contratado + estimado;
  const semOrcamento = orcamento === 0;
  const excesso = !semOrcamento && usado > orcamento ? usado - orcamento : 0;
  const restante = !semOrcamento && usado < orcamento ? orcamento - usado : 0;
  const base = Math.max(orcamento, usado);
  const largura = (valor: number): number => (base > 0 ? (valor / base) * 100 : 0);
  const percentual = (valor: number): number | null => (semOrcamento ? null : (valor / orcamento) * 100);
  // Acima do orçamento, contratado e estimado só ocupam a barra até o limite; o que passa vira a fatia de excesso.
  const limite = excesso > 0 ? orcamento : usado;
  const contratadoNaBarra = Math.min(contratado, limite);
  const estimadoNaBarra = Math.min(estimado, limite - contratadoNaBarra);

  const fatias: FatiaOrcamento[] = [
    { chave: 'contratado', rotulo: 'Contratado', valor: contratado, largura: largura(contratadoNaBarra), percentualDoOrcamento: percentual(contratado) },
    { chave: 'estimado', rotulo: 'Estimado (a contratar)', valor: estimado, largura: largura(estimadoNaBarra), percentualDoOrcamento: percentual(estimado) },
  ];
  if (!semOrcamento) {
    fatias.push(excesso > 0
      ? { chave: 'excesso', rotulo: 'Acima do orçamento', valor: excesso, largura: largura(excesso), percentualDoOrcamento: percentual(excesso) }
      : { chave: 'restante', rotulo: 'Restante do orçamento', valor: restante, largura: largura(restante), percentualDoOrcamento: percentual(restante) });
  }
  return { fatias, semOrcamento, vazio: usado === 0, excesso };
}

/**
 * Rosca por serviço: cada serviço vale o contratado ou, sem contrato, o estimado.
 * Os cinco maiores aparecem; o resto vira "Outros".
 */
export function montarRoscaPorServico(dados: BudgetEvento): RoscaServicos {
  const itens = dados.servicos
    .map((s) => {
      const contratado = positivo(s.contratado) > 0;
      return { id: s.id, nome: s.nome, contratado, valor: contratado ? positivo(s.contratado) : positivo(s.estimado) };
    })
    .filter((s) => s.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const principais = itens.length > MAX_FATIAS + 1 ? itens.slice(0, MAX_FATIAS) : itens;
  const resto = itens.slice(principais.length);
  const total = itens.reduce((t, s) => t + s.valor, 0);
  const percentual = (valor: number): number => (total > 0 ? (valor / total) * 100 : 0);
  const fatias: FatiaServico[] = principais.map((s, i) => ({ ...s, percentual: percentual(s.valor), cor: CORES_SERVICO[i % CORES_SERVICO.length] }));
  if (resto.length > 0) {
    const valor = resto.reduce((t, s) => t + s.valor, 0);
    fatias.push({ id: 'outros', nome: `Outros (${resto.length})`, contratado: false, valor, percentual: percentual(valor), cor: COR_OUTROS });
  }
  let acumulado = 0;
  const partes = fatias.map((f) => {
    const inicio = acumulado;
    acumulado += f.percentual;
    return `${f.cor} ${inicio}% ${acumulado}%`;
  });
  return { fatias, total, fundo: partes.length > 0 ? `conic-gradient(${partes.join(', ')})` : 'rgba(128,128,128,.18)' };
}
