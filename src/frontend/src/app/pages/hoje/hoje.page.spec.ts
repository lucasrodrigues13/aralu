import { fraseHoje } from './hoje.page';

describe('fraseHoje', () => {
  it('fala de tarefas e trata zero e um', () => {
    expect(fraseHoje(0)).toBe('Nada pede você hoje');
    expect(fraseHoje(1)).toBe('1 tarefa pede você hoje');
    expect(fraseHoje(5)).toBe('5 tarefas pedem você hoje');
  });
});
