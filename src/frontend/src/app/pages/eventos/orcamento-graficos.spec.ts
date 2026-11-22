import { BudgetEvento } from '../../core/negocio.client';
import { montarBarrasPorServico, montarGraficoOrcamento } from './orcamento-graficos';

function dados(parcial: Partial<BudgetEvento>): BudgetEvento {
  return { budget: 0, estimado: 0, contratado: 0, provaReal: 0, custoPorConvidado: null, servicos: [], ...parcial };
}

/** Um serviço contratado e outro só estimado, com os totais como o backend devolve. */
function comServicos(budget: number, contratado: number, estimadoAContratar: number): BudgetEvento {
  return dados({
    budget,
    contratado,
    estimado: estimadoAContratar,
    servicos: [
      { id: 'c', nome: 'Contratado', estimado: 0, contratado },
      { id: 'e', nome: 'A contratar', estimado: estimadoAContratar, contratado: 0 },
    ],
  });
}

describe('orcamento-graficos', () => {
  it('dentro do orçamento: mostra o restante', () => {
    const g = montarGraficoOrcamento(comServicos(1000, 300, 200));
    expect(g.excesso).toBe(0);
    expect(g.vazio).toBe(false);
    expect(g.fatias.map((f) => f.chave)).toEqual(['contratado', 'estimado', 'restante']);
    expect(g.fatias.map((f) => f.largura)).toEqual([30, 20, 50]);
    expect(g.fatias[2].percentualDoOrcamento).toBe(50);
  });

  it('acima do orçamento: mostra o excesso e a barra não passa de 100%', () => {
    const g = montarGraficoOrcamento(comServicos(1000, 900, 300));
    expect(g.excesso).toBe(200);
    expect(g.fatias.map((f) => f.chave)).toEqual(['contratado', 'estimado', 'excesso']);
    // Base 1200: contratado 900 (75%), estimado só até o limite 100 (8,33%), excesso 200 (16,67%) em alerta.
    expect(g.fatias[0].largura).toBeCloseTo(75);
    expect(g.fatias[1].largura).toBeCloseTo(100 / 12);
    expect(g.fatias[2].largura).toBeCloseTo(200 / 12);
    expect(g.fatias.reduce((soma, f) => soma + f.largura, 0)).toBeCloseTo(100);
    expect(g.fatias[1].valor).toBe(300);
  });

  it('contratado sozinho acima do orçamento: estimado some da barra e o excesso aparece', () => {
    const g = montarGraficoOrcamento(comServicos(1000, 1500, 500));
    expect(g.excesso).toBe(1000);
    expect(g.fatias.map((f) => f.largura)).toEqual([50, 0, 50]);
  });

  it('serviço contratado não soma o estimado dele de novo', () => {
    // Buffet estimado 15.500 e contratado 150.000; Foto estimada 1.600 e contratada 2.000.
    const g = montarGraficoOrcamento(dados({
      budget: 150000,
      contratado: 152000,
      estimado: 17100,
      servicos: [
        { id: 'b', nome: 'Buffet', estimado: 15500, contratado: 150000 },
        { id: 'f', nome: 'Fotografia', estimado: 1600, contratado: 2000 },
      ],
    }));
    expect(g.excesso).toBe(2000);
    expect(g.fatias[1].valor).toBe(0);
  });

  it('sem orçamento: sem restante nem percentual', () => {
    const g = montarGraficoOrcamento(comServicos(0, 100, 100));
    expect(g.semOrcamento).toBe(true);
    expect(g.fatias.map((f) => f.chave)).toEqual(['contratado', 'estimado']);
    expect(g.fatias.every((f) => f.percentualDoOrcamento === null)).toBe(true);
    expect(g.fatias[0].largura).toBe(50);
  });

  it('tudo zerado: vazio e sem divisão por zero', () => {
    const g = montarGraficoOrcamento(dados({}));
    expect(g.vazio).toBe(true);
    expect(g.fatias.every((f) => f.largura === 0)).toBe(true);
  });

  it('por serviço: mesma escala para estimado e contratado', () => {
    const barras = montarBarrasPorServico(dados({
      servicos: [
        { id: 'a', nome: 'Buffet', estimado: 1000, contratado: 500 },
        { id: 'b', nome: 'Foto', estimado: 250, contratado: 0 },
      ],
    }));
    expect(barras[0].larguraEstimado).toBe(100);
    expect(barras[0].larguraContratado).toBe(50);
    expect(barras[1].larguraEstimado).toBe(25);
    expect(barras[1].larguraContratado).toBe(0);
  });

  it('por serviço zerado não divide por zero', () => {
    const barras = montarBarrasPorServico(dados({ servicos: [{ id: 'a', nome: 'X', estimado: 0, contratado: 0 }] }));
    expect(barras[0].larguraEstimado).toBe(0);
  });
});
