import { APARENCIA_ESTAGIO, diasDesde, textoDias } from './oportunidades.page';
import { ESTAGIOS_FUNIL } from '../../core/negocio.client';

describe('Quadro de oportunidades', () => {
  it('conta os dias desde a entrada no estágio', () => {
    const agora = new Date('2026-11-20T12:00:00Z');
    expect(diasDesde('2026-11-20T08:00:00Z', agora)).toBe(0);
    expect(diasDesde('2026-11-19T11:00:00Z', agora)).toBe(1);
    expect(diasDesde('2026-11-10T12:00:00Z', agora)).toBe(10);
    expect(diasDesde('2026-11-21T12:00:00Z', agora)).toBe(0);
  });

  it('escreve os dias por extenso', () => {
    expect(textoDias(0)).toBe('hoje');
    expect(textoDias(1)).toBe('há 1 dia');
    expect(textoDias(5)).toBe('há 5 dias');
  });

  it('tem cor e ícone para cada estágio', () => {
    for (const estagio of ESTAGIOS_FUNIL) {
      expect(APARENCIA_ESTAGIO[estagio]).toBeTruthy();
    }
  });
});
