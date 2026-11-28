import { nomesDosNoivos } from './noivos-do-evento';

describe('nomesDosNoivos', () => {
  const evento = { primeiroNome: 'Ana & Bruno', segundoNome: null, nomeDoEvento: 'Ana & Bruno' };

  it('preenche noiva e noivo pelo papel do cliente', () => {
    const clientes = [{ nome: 'Bruno Lima', papel: 'Noivo' }, { nome: 'Ana Souza', papel: 'Noiva' }];
    expect(nomesDosNoivos(clientes, evento)).toEqual({ noiva: 'Ana Souza', noivo: 'Bruno Lima' });
  });

  it('preenche só o papel que existe e não usa o nome do evento', () => {
    expect(nomesDosNoivos([{ nome: 'Bruno Lima', papel: 'Noivo' }], evento)).toEqual({ noiva: '', noivo: 'Bruno Lima' });
  });

  it('ignora clientes de outros papéis', () => {
    expect(nomesDosNoivos([{ nome: 'Marta', papel: 'Mae' }], evento)).toEqual({ noiva: '', noivo: '' });
  });

  it('mantém o nome gravado quando não é o nome do evento', () => {
    const gravados = { primeiroNome: 'Ana', segundoNome: 'Bruno', nomeDoEvento: 'Ana & Bruno' };
    expect(nomesDosNoivos([], gravados)).toEqual({ noiva: 'Ana', noivo: 'Bruno' });
  });
});
