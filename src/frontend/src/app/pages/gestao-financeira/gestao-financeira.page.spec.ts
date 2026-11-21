import { ContratoFunil } from '../../core/negocio.client';
import { situacaoFinanceira } from './gestao-financeira.page';

function contrato(parcelas: { situacao: string }[], saldo: number): ContratoFunil {
  return { parcelas, saldo } as unknown as ContratoFunil;
}

describe('situacaoFinanceira (SPEC-041)', () => {
  it('contrato sem parcelas', () => {
    expect(situacaoFinanceira(contrato([], 0))).toBe('SemParcelas');
  });

  it('parcela atrasada vence sobre o saldo em aberto', () => {
    expect(situacaoFinanceira(contrato([{ situacao: 'Recebida' }, { situacao: 'Atrasada' }], 500))).toBe('Atrasados');
  });

  it('com saldo e nada atrasado, está em aberto', () => {
    expect(situacaoFinanceira(contrato([{ situacao: 'Parcial' }, { situacao: 'AReceber' }], 500))).toBe('EmAberto');
  });

  it('sem saldo, está quitado', () => {
    expect(situacaoFinanceira(contrato([{ situacao: 'Recebida' }], 0))).toBe('Quitados');
  });
});
