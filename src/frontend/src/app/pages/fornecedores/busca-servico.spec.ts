import { ServicoConta } from '../../core/negocio.client';
import { incluirServico, marcarServico, servicoCombina } from './busca-servico';

const banda: ServicoConta = { id: '1', nome: 'Banda', padrao: false };
const fotografia: ServicoConta = { id: '2', nome: 'Fotografia', padrao: true };

describe('busca de serviço do fornecedor', () => {
  it('filtra pelo nome sem diferenciar maiúsculas e acentos', () => {
    expect(servicoCombina(fotografia, 'FOTO')).toBe(true);
    expect(servicoCombina(fotografia, 'fotógr')).toBe(true);
    expect(servicoCombina(banda, 'foto')).toBe(false);
    expect(servicoCombina(banda, '  ')).toBe(true);
  });

  it('inclui o serviço criado em ordem alfabética, sem duplicar', () => {
    const lista = incluirServico([fotografia], banda);
    expect(lista.map((s) => s.id)).toEqual(['1', '2']);
    expect(incluirServico(lista, banda)).toBe(lista);
  });

  it('marca o serviço sem perder os já marcados nem duplicar', () => {
    expect(marcarServico(['2'], '1')).toEqual(['2', '1']);
    const marcados = ['2'];
    expect(marcarServico(marcados, '2')).toBe(marcados);
  });
});
