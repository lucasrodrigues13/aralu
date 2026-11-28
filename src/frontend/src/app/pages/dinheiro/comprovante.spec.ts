import { validarComprovante } from '../../core/dinheiro.client';

describe('validarComprovante', () => {
  it('aceita JPG, JPEG, PNG e PDF de até 5 MB', () => {
    expect(validarComprovante({ name: 'Recibo.PDF', size: 1000 })).toBeNull();
    expect(validarComprovante({ name: 'foto.jpeg', size: 5 * 1024 * 1024 })).toBeNull();
    expect(validarComprovante({ name: 'foto.png', size: 10 })).toBeNull();
  });

  it('recusa outro tipo e arquivo acima de 5 MB', () => {
    expect(validarComprovante({ name: 'planilha.xlsx', size: 10 })).toContain('JPG');
    expect(validarComprovante({ name: 'foto.jpg', size: 5 * 1024 * 1024 + 1 })).toContain('5 MB');
  });
});
