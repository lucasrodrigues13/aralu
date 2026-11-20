import { acaoRapida, diasDesde, iconeEstagio, situacaoRetorno, textoDias, textoOrigem, textoRetorno } from './oportunidades.page';
import { montarPedidoEstagios, nomeRepetido } from './estagios-funil.dialog';
import { EstagioFunil } from '../../core/negocio.client';

const estagio = (id: string, nome: string, tipo: EstagioFunil['tipo'], ordem: number): EstagioFunil => ({
  id, nome, tipo, ordem, cor: 'info', quantidade: 0,
});

const FUNIL: EstagioFunil[] = [
  estagio('a', 'Contato inicial', 'Aberto', 0),
  estagio('b', 'Reunião', 'Aberto', 1),
  estagio('c', 'Orçamento enviado', 'Aberto', 2),
  estagio('d', 'Contratado', 'Contratado', 3),
  estagio('e', 'Descartado', 'Descartado', 4),
];

describe('Quadro de oportunidades', () => {
  it('conta os dias desde a entrada no estágio', () => {
    const agora = new Date('2026-11-20T12:00:00Z');
    expect(diasDesde('2026-11-20T08:00:00Z', agora)).toBe(0);
    expect(diasDesde('2026-11-19T11:00:00Z', agora)).toBe(1);
    expect(diasDesde('2026-11-10T12:00:00Z', agora)).toBe(10);
    expect(diasDesde('2026-11-21T12:00:00Z', agora)).toBe(0);
  });

  it('escreve os dias por extenso', () => {
    expect(textoDias(0)).toBe('hoje');
    expect(textoDias(1)).toBe('há 1 dia');
    expect(textoDias(5)).toBe('há 5 dias');
  });

  it('dá ícone aos estágios fixos e aos abertos', () => {
    expect(iconeEstagio(FUNIL[0], 0)).toBe('forum');
    expect(iconeEstagio(FUNIL[1], 1)).toBe('flag');
    expect(iconeEstagio(FUNIL[2], 2)).toBe('request_quote');
    expect(iconeEstagio(FUNIL[3], 3)).toBe('handshake');
    expect(iconeEstagio(FUNIL[4], 4)).toBe('block');
  });

  it('ação rápida avança até o último aberto e então vira cliente', () => {
    expect(acaoRapida(FUNIL, 'a')).toEqual({ tipo: 'avancar', destino: FUNIL[1] });
    expect(acaoRapida(FUNIL, 'b')).toEqual({ tipo: 'avancar', destino: FUNIL[2] });
    expect(acaoRapida(FUNIL, 'c')).toEqual({ tipo: 'cliente' });
    expect(acaoRapida(FUNIL, 'd')).toEqual({ tipo: 'cliente' });
    expect(acaoRapida(FUNIL, 'e')).toBeNull();
    expect(acaoRapida(FUNIL, 'inexistente')).toBeNull();
  });
});

describe('Gerenciar estágios', () => {
  it('acha nome repetido sem diferenciar maiúsculas', () => {
    expect(nomeRepetido(['Contato', 'Reunião', 'Contratado'])).toBeNull();
    expect(nomeRepetido(['Contato', ' contato '])).toBe('contato');
    expect(nomeRepetido(['Reunião', 'Contratado', 'CONTRATADO'])).toBe('CONTRATADO');
  });

  it('monta o pedido com nomes limpos e as exclusões', () => {
    const pedido = montarPedidoEstagios(
      [{ id: 'a', nome: ' Primeiro contato ', cor: 'info' }, { id: null, nome: 'Reunião', cor: 'primary' }],
      'success',
      'error',
      [{ id: 'c', destinoId: 'a' }],
    );
    expect(pedido).toEqual({
      abertos: [{ id: 'a', nome: 'Primeiro contato', cor: 'info' }, { id: null, nome: 'Reunião', cor: 'primary' }],
      corContratado: 'success',
      corDescartado: 'error',
      exclusoes: [{ id: 'c', destinoId: 'a' }],
    });
  });
});

describe('Retorno e origem do lead', () => {
  const agora = new Date(2026, 10, 20, 15, 0); // sex, 20/11/2026

  it('classifica o retorno pela data local', () => {
    expect(situacaoRetorno('2026-11-19', agora)).toBe('atrasado');
    expect(situacaoRetorno('2026-11-20', agora)).toBe('hoje');
    expect(situacaoRetorno('2026-11-21', agora)).toBe('futuro');
  });

  it('escreve o retorno com dia da semana e hora', () => {
    expect(textoRetorno('2026-11-20', null)).toBe('sex, 20/11');
    expect(textoRetorno('2026-11-22', '14:30:00')).toBe('dom, 22/11 às 14:30');
  });

  it('mostra o texto livre quando a origem é Outro', () => {
    expect(textoOrigem('Outro', 'TikTok')).toBe('TikTok');
    expect(textoOrigem('Instagram', null)).toBe('Instagram');
    expect(textoOrigem(null, null)).toBeNull();
  });
});
