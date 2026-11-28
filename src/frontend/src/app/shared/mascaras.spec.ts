import { aplicarDinheiro, aplicarHora, aplicarMascara, dinheiroParaNumero, horaParaApi, limparDocumento, numeroParaDinheiro } from './mascaras';

describe('aplicarMascara', () => {
  it('formata CPF', () => {
    expect(aplicarMascara('52998224725', 'cpf')).toBe('529.982.247-25');
  });

  it('formata CNPJ numérico e alfanumérico, só número nos 2 últimos', () => {
    expect(aplicarMascara('11222333000181', 'cnpj')).toBe('11.222.333/0001-81');
    expect(aplicarMascara('12abc34501de35', 'cnpj')).toBe('12.ABC.345/01DE-35');
    expect(aplicarMascara('12ABC34501DEXY', 'cnpj')).toBe('12.ABC.345/01DE');
  });

  it('documento começa como CPF e vira CNPJ com letra ou mais de 11 caracteres', () => {
    expect(aplicarMascara('52998224725', 'documento')).toBe('529.982.247-25');
    expect(aplicarMascara('529982247250', 'documento')).toBe('52.998.224/7250');
    expect(aplicarMascara('12ABC', 'documento')).toBe('12.ABC');
    expect(aplicarMascara('12.abc.345/01de-35', 'documento')).toBe('12.ABC.345/01DE-35');
  });

  it('limpa o documento para guardar sem máscara', () => {
    expect(limparDocumento('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(limparDocumento('529.982.247-25')).toBe('52998224725');
  });

  it('formata celular', () => {
    expect(aplicarMascara('11987654321', 'celular')).toBe('(11) 98765-4321');
  });

  it('formata telefone fixo', () => {
    expect(aplicarMascara('1133334444', 'telefone')).toBe('(11) 3333-4444');
  });

  it('formata dinheiro com vírgula e duas casas', () => {
    expect(aplicarDinheiro('1')).toBe('0,01');
    expect(aplicarDinheiro('123456')).toBe('1.234,56');
    expect(numeroParaDinheiro(150000)).toBe('150.000,00');
    expect(dinheiroParaNumero('150.000,00')).toBe(150000);
    expect(dinheiroParaNumero('')).toBeNull();
  });

  it('formata agência e conta com dígito verificador', () => {
    expect(aplicarMascara('1234', 'agencia')).toBe('1234');
    expect(aplicarMascara('12345', 'agencia')).toBe('1234-5');
    expect(aplicarMascara('12345678', 'conta')).toBe('12345678');
    expect(aplicarMascara('123456789', 'conta')).toBe('12345678-9');
    expect(aplicarMascara('1234567890123', 'conta')).toBe('123456789012-3');
    expect(aplicarMascara('12345-6', 'conta')).toBe('12345-6');
  });

  it('formata chave Pix de telefone e aleatória', () => {
    expect(aplicarMascara('11987654321', 'pixTelefone')).toBe('+55 (11) 98765-4321');
    expect(aplicarMascara('+5511987654321', 'pixTelefone')).toBe('+55 (11) 98765-4321');
    expect(aplicarMascara('123e4567e12b12d1a456426655440000', 'pixAleatoria')).toBe('123e4567-e12b-12d1-a456-426655440000');
  });

  it('formata hora em 24h', () => {
    expect(aplicarHora('1830')).toBe('18:30');
    expect(aplicarHora('9')).toBe('09');
    expect(aplicarHora('930')).toBe('09:30');
    expect(horaParaApi('18:30')).toBe('18:30:00');
    expect(horaParaApi('18:3')).toBeNull();
  });
});
