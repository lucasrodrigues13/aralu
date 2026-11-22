import { ParcelaPagamento, refazerPerdePagamentos } from '../../core/dinheiro.client';

const parcela = (mudancas: Partial<ParcelaPagamento> = {}): ParcelaPagamento => ({
  id: 'p1',
  numero: 1,
  vencimento: '2027-01-10',
  valor: 1000,
  entrada: false,
  paga: false,
  pagoEm: null,
  comprovante: null,
  ...mudancas,
});

const comprovante = { arquivoId: 'a1', nome: 'recibo.pdf', tipoConteudo: 'application/pdf' };

describe('refazerPerdePagamentos', () => {
  it('não avisa quando nada foi pago nem comprovado', () => {
    expect(refazerPerdePagamentos({ pago: false, comprovante: null, parcelas: [] })).toBe(false);
    expect(refazerPerdePagamentos({ pago: false, comprovante: null, parcelas: [parcela(), parcela({ id: 'p2' })] })).toBe(false);
  });

  it('avisa com parcela paga ou com comprovante de parcela', () => {
    expect(refazerPerdePagamentos({ pago: false, comprovante: null, parcelas: [parcela({ paga: true, pagoEm: '2026-11-01' })] })).toBe(true);
    expect(refazerPerdePagamentos({ pago: false, comprovante: null, parcelas: [parcela({ comprovante })] })).toBe(true);
  });

  it('avisa com o pagamento inteiro pago ou comprovado', () => {
    expect(refazerPerdePagamentos({ pago: true, comprovante: null, parcelas: [] })).toBe(true);
    expect(refazerPerdePagamentos({ pago: false, comprovante, parcelas: [] })).toBe(true);
  });
});
