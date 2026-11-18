import { exibirPrazo, prazoDeDias, prazoParaDias } from './prazo-modelo';

describe('prazo-modelo', () => {
  it('converte unidades para dias', () => {
    expect(prazoParaDias(2, 'meses')).toBe(60);
    expect(prazoParaDias(6, 'semanas')).toBe(42);
    expect(prazoParaDias(10, 'dias')).toBe(10);
    expect(prazoParaDias(null, 'noDia')).toBe(0);
    expect(prazoParaDias(null, 'semPrazo')).toBeNull();
  });

  it('exibe o prazo legível', () => {
    expect(exibirPrazo(null)).toBe('Sem prazo');
    expect(exibirPrazo(0)).toBe('No dia do evento');
    expect(exibirPrazo(1)).toBe('1 dia antes');
    expect(exibirPrazo(7)).toBe('1 semana antes');
    expect(exibirPrazo(10)).toBe('10 dias antes');
    expect(exibirPrazo(30)).toBe('1 mês antes');
    expect(exibirPrazo(42)).toBe('6 semanas antes');
    expect(exibirPrazo(180)).toBe('6 meses antes');
  });

  it('decompõe dias na unidade do formulário', () => {
    expect(prazoDeDias(null)).toEqual({ quantidade: null, unidade: 'semPrazo' });
    expect(prazoDeDias(0)).toEqual({ quantidade: null, unidade: 'noDia' });
    expect(prazoDeDias(42)).toEqual({ quantidade: 6, unidade: 'semanas' });
    expect(prazoDeDias(180)).toEqual({ quantidade: 6, unidade: 'meses' });
    expect(prazoDeDias(10)).toEqual({ quantidade: 10, unidade: 'dias' });
  });
});
