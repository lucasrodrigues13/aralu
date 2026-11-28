import { dadosPreenchidos, resumoDosConvidados } from './convite-lista';

describe('Lista de convites recolhida (SPEC-059)', () => {
  it('o resumo conta os convidados e quantos há em cada situação', () => {
    expect(resumoDosConvidados(['Pendente', 'Confirmado', 'Pendente'])).toBe('3 convidados · 2 pendentes · 1 confirmado');
    expect(resumoDosConvidados(['Confirmado'])).toBe('1 convidado · 1 confirmado');
    expect(resumoDosConvidados(['Não comparecerá', 'Não comparecerá'])).toBe('2 convidados · 2 não comparecerão');
  });

  it('ao expandir mostra só os dados preenchidos do convidado', () => {
    expect(dadosPreenchidos({ ddi: '+55', celular: '11999990000', mesa: '3', faixa: 'Crianca', genero: null, custo: 'Meia', cpf: null, observacao: '' }))
      .toEqual(['Telefone +55 11999990000', 'Mesa 3', 'Criança', 'Custo meia']);
    expect(dadosPreenchidos({ ddi: null, celular: null })).toEqual([]);
  });
});
