import { ContratoFunil } from '../../core/negocio.client';
import { filtroDaUrl, parcelasACobrar, parcelasAtrasadas, parcelasDoMes, situacaoFinanceira } from './gestao-financeira.page';

function comParcelas(nome: string, parcelas: { id: string; vencimento: string; saldo: number; situacao: string }[]): ContratoFunil {
  return { oportunidadeNome: nome, parcelas } as unknown as ContratoFunil;
}

describe('parcelas do mês e atrasadas (SPEC-044)', () => {
  const contratos = [
    comParcelas('Ana', [
      { id: 'a1', vencimento: '2026-11-25', saldo: 100, situacao: 'AReceber' },
      { id: 'a2', vencimento: '2026-12-05', saldo: 200, situacao: 'AReceber' },
      { id: 'a3', vencimento: '2026-11-10', saldo: 50, situacao: 'Atrasada' },
      { id: 'a4', vencimento: '2026-11-28', saldo: 0, situacao: 'Recebida' },
    ]),
    comParcelas('Bia', [{ id: 'b1', vencimento: '2026-09-01', saldo: 300, situacao: 'Atrasada' }]),
  ];

  it('do mês: só com saldo, no mês e ainda não atrasada', () => {
    expect(parcelasDoMes(contratos, '2026-11-21').map((item) => item.parcela.id)).toEqual(['a1']);
  });

  it('atrasadas: de qualquer mês, da mais antiga para a mais nova', () => {
    expect(parcelasAtrasadas(contratos).map((item) => item.parcela.id)).toEqual(['b1', 'a3']);
  });

  it('a cobrar: atrasadas e as que vencem em até 7 dias, com saldo, pela data', () => {
    expect(parcelasACobrar(contratos, '2026-11-21').map((item) => item.parcela.id)).toEqual(['b1', 'a3', 'a1']);
    // A semana atravessa o mês: 28/11 + 7 = 05/12.
    expect(parcelasACobrar(contratos, '2026-11-28').map((item) => item.parcela.id)).toEqual(['b1', 'a3', 'a1', 'a2']);
  });
});

describe('filtro da Gestão Financeira pela URL', () => {
  it('aceita o filtro sem diferenciar maiúsculas', () => {
    expect(filtroDaUrl('cobrancas')).toBe('Cobrancas');
    expect(filtroDaUrl('ATRASADOS')).toBe('Atrasados');
  });

  it('valor ausente ou desconhecido mostra todos', () => {
    expect(filtroDaUrl(null)).toBe('');
    expect(filtroDaUrl('qualquer')).toBe('');
  });
});

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
