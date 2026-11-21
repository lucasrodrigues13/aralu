import { enderecoDoLinkCasal } from './casal.client';

describe('enderecoDoLinkCasal', () => {
  it('monta o endereço público do casal com o código', () => {
    expect(enderecoDoLinkCasal('https://aralu.exemplo', 'abc-DEF_123')).toBe('https://aralu.exemplo/casal/abc-DEF_123');
  });
});
