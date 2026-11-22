import { cardsPorSituacao, conviteDoFormulario } from './convidados.page';

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

describe('Convite da organizadora no formulário único (SPEC-059)', () => {
  it('leva observação e exceção e põe o convidado principal primeiro', () => {
    const pessoa = (id: string, principal: boolean, celular: string | null) => ({
      id, nome: id, ddi: celular ? '+55' : null, celular, situacao: 'Pendente', situacaoTela: 'Pendente', situacaoIcone: '',
      mesa: null, genero: null, faixa: null, custo: null, cpf: null, observacao: null, principal,
    });
    const formulario = conviteDoFormulario({
      id: 'c', eventoId: 'e', nome: 'Família', observacao: 'Pedido da noiva', telefone: '+55 11999990000', token: 't',
      acessada: false, respondida: false, email: null, excecaoPrazoRsvp: true,
      convidados: [pessoa('Caio', false, null), pessoa('Lia', true, '11999990000')],
    });
    expect(formulario.convidados.map((item) => item.id)).toEqual(['Lia', 'Caio']);
    expect(formulario).toMatchObject({ observacao: 'Pedido da noiva', excecaoPrazoRsvp: true });
  });
});
