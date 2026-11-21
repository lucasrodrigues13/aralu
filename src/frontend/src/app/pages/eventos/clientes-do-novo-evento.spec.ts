import { Cliente } from '../../core/negocio.client';
import { clientesParaNovoEvento, vinculoDoCliente } from './clientes-do-novo-evento';

function cliente(nome: string, eventos: string[] = []): Cliente {
  return { id: nome, nome, eventos: eventos.map((e) => ({ id: e, nome: e })) } as Cliente;
}

describe('clientesParaNovoEvento', () => {
  const lista = [cliente('Ana'), cliente('Bruno', ['Casamento Lia']), cliente('Érica')];

  it('sem busca mostra só clientes sem vínculo', () => {
    expect(clientesParaNovoEvento(lista, '').map((c) => c.nome)).toEqual(['Ana', 'Érica']);
    expect(clientesParaNovoEvento(lista, '  ').map((c) => c.nome)).toEqual(['Ana', 'Érica']);
  });

  it('com busca pelo nome inclui cliente já vinculado', () => {
    expect(clientesParaNovoEvento(lista, 'bru').map((c) => c.nome)).toEqual(['Bruno']);
  });

  it('busca ignora acento e caixa', () => {
    expect(clientesParaNovoEvento(lista, 'erica').map((c) => c.nome)).toEqual(['Érica']);
  });

  it('respeita o limite', () => {
    const muitos = Array.from({ length: 12 }, (_, i) => cliente(`C${i}`));
    expect(clientesParaNovoEvento(muitos, '')).toHaveLength(8);
  });

  it('mostra o evento do vínculo', () => {
    expect(vinculoDoCliente(cliente('Bruno', ['Casamento Lia']))).toBe('Casamento Lia');
    expect(vinculoDoCliente(cliente('Ana'))).toBe('');
  });
});
