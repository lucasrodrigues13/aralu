import { EventoServico } from '../../core/negocio.client';
import { montarContratosDoEvento } from './contratos-do-evento';

function servico(parcial: Partial<EventoServico>): EventoServico {
  return {
    id: 's', nome: 'Buffet', contratado: true, valorEstimado: null, valorContratado: 100, ocultoParaClient: false, ordem: 0,
    servicoContaId: null, parcelas: [], subitens: [], fornecedores: [], contratoAssinado: null, ...parcial,
  };
}

describe('contratos-do-evento', () => {
  it('lista só serviços com contrato enviado, com o fornecedor contratado, por serviço', () => {
    const lista = montarContratosDoEvento([
      servico({ id: '1', nome: 'Música', contratoAssinado: { arquivoId: 'a1', nome: 'm.pdf', tipoConteudo: 'application/pdf' },
        fornecedores: [{ id: 'v', fornecedorId: 'f', fornecedor: 'DJ Léo', etapa: 'Contratado', valorOrcamento: null, observacoes: null }] }),
      servico({ id: '2', nome: 'Buffet' }),
      servico({ id: '3', nome: 'Bolo', contratoAssinado: { arquivoId: 'a3', nome: 'b.png', tipoConteudo: 'image/png' },
        fornecedores: [{ id: 'v', fornecedorId: 'f', fornecedor: 'Doce Lar', etapa: 'Orcamento', valorOrcamento: null, observacoes: null }] }),
    ]);
    expect(lista.map((c) => c.servico)).toEqual(['Bolo', 'Música']);
    expect(lista[0].fornecedores).toEqual([]);
    expect(lista[1].fornecedores).toEqual(['DJ Léo']);
    expect(lista[1].arquivoId).toBe('a1');
  });

  it('sem contratos: lista vazia', () => {
    expect(montarContratosDoEvento([servico({})])).toEqual([]);
  });
});
