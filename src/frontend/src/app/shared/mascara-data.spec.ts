import { mascararDataBr } from './data';

describe('mascararDataBr', () => {
  it('insere as barras enquanto digita', () => {
    expect(mascararDataBr('2')).toBe('2');
    expect(mascararDataBr('251')).toBe('25/1');
    expect(mascararDataBr('2512')).toBe('25/12');
    expect(mascararDataBr('25122026')).toBe('25/12/2026');
  });

  it('ignora letras, barras digitadas e excesso', () => {
    expect(mascararDataBr('25/12/2026')).toBe('25/12/2026');
    expect(mascararDataBr('25a1220269')).toBe('25/12/2026');
  });
});
