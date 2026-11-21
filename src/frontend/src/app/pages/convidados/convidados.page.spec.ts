import { cardsPorSituacao } from './convidados.page';

describe('Cards por situação dos convidados', () => {
  it('mostra sempre os três cards, com 0 quando a situação não tem convidados', () => {
    const cards = cardsPorSituacao([{ rotulo: 'Pendente', quantidade: 2 }, { rotulo: 'Confirmado', quantidade: 1 }]);
    expect(cards.map((c) => [c.titulo, c.quantidade])).toEqual([
      ['Pendentes', 2],
      ['Confirmados', 1],
      ['Não confirmados', 0],
    ]);
  });

  it('Não confirmados conta quem não comparecerá e filtra por essa situação', () => {
    const cards = cardsPorSituacao([{ rotulo: 'Não comparecerá', quantidade: 3 }]);
    expect(cards[2]).toMatchObject({ valor: 'NaoComparecera', quantidade: 3 });
    expect(cards[0].quantidade).toBe(0);
  });

  it('sem lista carregada todos os cards ficam em 0', () => {
    expect(cardsPorSituacao([]).every((c) => c.quantidade === 0)).toBe(true);
  });
});
