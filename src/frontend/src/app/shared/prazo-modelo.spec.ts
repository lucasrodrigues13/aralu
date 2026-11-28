import { diasParaRelativo, exibirPrazoRelativo, ordemPrazoRelativo, prazoEfetivo, relativoParaDias } from './prazo-modelo';

describe('prazo-modelo', () => {
  it('converte quantidade, unidade e sentido em deslocamento', () => {
    expect(relativoParaDias(2, 'meses', 'antes')).toBe(-60);
    expect(relativoParaDias(6, 'semanas', 'antes')).toBe(-42);
    expect(relativoParaDias('2', 'semanas', 'depois')).toBe(14);
    expect(relativoParaDias(null, 'noDia', 'antes')).toBe(0);
    expect(relativoParaDias(null, 'dias', 'antes')).toBeNull();
  });

  it('exibe o prazo relativo', () => {
    expect(exibirPrazoRelativo(null)).toBe('Sem prazo');
    expect(exibirPrazoRelativo(0)).toBe('No dia do evento');
    expect(exibirPrazoRelativo(-1)).toBe('1 dia antes');
    expect(exibirPrazoRelativo(-42)).toBe('6 semanas antes');
    expect(exibirPrazoRelativo(-180)).toBe('6 meses antes');
    expect(exibirPrazoRelativo(14)).toBe('2 semanas depois');
    expect(exibirPrazoRelativo(30)).toBe('1 mês depois');
  });

  it('decompõe o deslocamento para o formulário', () => {
    expect(diasParaRelativo(0)).toEqual({ quantidade: null, unidade: 'noDia', sentido: 'antes' });
    expect(diasParaRelativo(-42)).toEqual({ quantidade: 6, unidade: 'semanas', sentido: 'antes' });
    expect(diasParaRelativo(-180)).toEqual({ quantidade: 6, unidade: 'meses', sentido: 'antes' });
    expect(diasParaRelativo(10)).toEqual({ quantidade: 10, unidade: 'dias', sentido: 'depois' });
  });

  it('calcula o prazo efetivo pela data do evento', () => {
    expect(prazoEfetivo('2027-06-20', -42)).toBe('2027-05-09');
    expect(prazoEfetivo('2027-06-20', 14)).toBe('2027-07-04');
    expect(prazoEfetivo(null, -42)).toBeNull();
  });

  it('ordena antes, no dia, depois e sem prazo', () => {
    const ordem = [null, 14, -42, 0].sort((a, b) => ordemPrazoRelativo(a) - ordemPrazoRelativo(b));
    expect(ordem).toEqual([-42, 0, 14, null]);
  });
});
