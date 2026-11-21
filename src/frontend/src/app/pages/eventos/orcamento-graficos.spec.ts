import { BudgetEvento } from '../../core/negocio.client';
import { montarBarrasPorServico, montarGraficoOrcamento } from './orcamento-graficos';

function dados(parcial: Partial<BudgetEvento>): BudgetEvento {
  return { budget: 0, estimado: 0, contratado: 0, provaReal: 0, custoPorConvidado: null, servicos: [], ...parcial };
}

describe('orcamento-graficos', () => {
  it('dentro do orçamento: mostra o restante', () => {
    const g = montarGraficoOrcamento(dados({ budget: 1000, contratado: 300, estimado: 200 }));
    expect(g.excesso).toBe(0);
    expect(g.vazio).toBe(false);
    expect(g.fatias.map((f) => f.chave)).toEqual(['contratado', 'estimado', 'restante']);
    expect(g.fatias.map((f) => f.largura)).toEqual([30, 20, 50]);
    expect(g.fatias[2].percentualDoOrcamento).toBe(50);
  });

  it('acima do orçamento: mostra o excesso e a barra não passa de 100%', () => {
    const g = montarGraficoOrcamento(dados({ budget: 1000, contratado: 900, estimado: 300 }));
    expect(g.excesso).toBe(200);
    expect(g.fatias.map((f) => f.chave)).toEqual(['contratado', 'estimado', 'excesso']);
    expect(g.fatias[0].largura + g.fatias[1].largura).toBeCloseTo(100);
  });

  it('sem orçamento: sem restante nem percentual', () => {
    const g = montarGraficoOrcamento(dados({ budget: 0, contratado: 100, estimado: 100 }));
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
