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

export interface BarraServico {
  id: string;
  nome: string;
  estimado: number;
  contratado: number;
  larguraEstimado: number;
  larguraContratado: number;
}

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

/** Barras Estimado e Contratado por serviço, na mesma escala. */
export function montarBarrasPorServico(dados: BudgetEvento): BarraServico[] {
  const maximo = Math.max(0, ...dados.servicos.flatMap((s) => [positivo(s.estimado), positivo(s.contratado)]));
  const largura = (valor: number): number => (maximo > 0 ? (positivo(valor) / maximo) * 100 : 0);
  return dados.servicos.map((s) => ({
    id: s.id,
    nome: s.nome,
    estimado: s.estimado,
    contratado: s.contratado,
    larguraEstimado: largura(s.estimado),
    larguraContratado: largura(s.contratado),
  }));
}
