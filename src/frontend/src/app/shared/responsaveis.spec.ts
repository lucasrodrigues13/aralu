import { chaveResponsavel, opcoesResponsavel, pedidoResponsavel, rotuloResponsavel, trocarResponsavelRemovido } from './responsaveis';

describe('responsáveis da tarefa (SPEC-032)', () => {
  const nomes = [
    { id: 'a1', nome: 'Ana', removida: false },
    { id: 'b2', nome: 'Bia', removida: true },
  ];

  it('usa o id da assistente na chave e volta para o pedido da API', () => {
    expect(chaveResponsavel({ papel: 'Assistente', referenciaId: 'a1' })).toBe('Assistente:a1');
    expect(chaveResponsavel({ papel: 'Organizer', referenciaId: 'conta' })).toBe('Organizer');
    expect(pedidoResponsavel('Assistente:a1')).toEqual({ papel: 'Assistente', referenciaId: 'a1' });
    expect(pedidoResponsavel('Casal')).toEqual({ papel: 'Casal' });
  });

  it('lista a dona, o casal e só as assistentes ativas', () => {
    const opcoes = opcoesResponsavel(nomes, 'Eu');
    expect(opcoes.map((item) => item.valor)).toEqual(['Organizer', 'Casal', 'Assistente:a1']);
    expect(opcoes[0].rotulo).toBe('Eu');
  });

  it('mantém a assistente removida só quando ela já está na tarefa, com o selo', () => {
    const opcoes = opcoesResponsavel(nomes, 'Dona da conta', ['Assistente:b2']);
    expect(opcoes.find((item) => item.valor === 'Assistente:b2')?.rotulo).toBe('Bia (removida)');
    expect(rotuloResponsavel({ papel: 'Assistente', referenciaId: 'b2' }, opcoes)).toBe('Bia (removida)');
  });
});

describe('trocarResponsavelRemovido', () => {
  it('tira a removida, mantém as demais e acrescenta a escolhida sem repetir', () => {
    const atuais = [{ papel: 'Organizer' }, { papel: 'Assistente', referenciaId: 'a1' }];
    expect(trocarResponsavelRemovido(atuais, ['a1'], 'Assistente:a2')).toEqual([
      { papel: 'Organizer' },
      { papel: 'Assistente', referenciaId: 'a2' },
    ]);
    expect(trocarResponsavelRemovido(atuais, ['a1'], 'Organizer')).toEqual([{ papel: 'Organizer' }]);
  });
});
