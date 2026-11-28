import { ItemChecklistTarefa } from '../../core/negocio.client';
import { itemAtrasado } from './checklist-tarefa';

function item(parcial: Partial<ItemChecklistTarefa>): ItemChecklistTarefa {
  return { id: '1', texto: 'x', feito: false, cancelado: false, prazo: null, responsavel: null, prazoRelativo: null, ...parcial } as ItemChecklistTarefa;
}

describe('itemAtrasado', () => {
  const hoje = new Date(2027, 4, 10);

  it('destaca item aberto com prazo vencido', () => {
    expect(itemAtrasado(item({ prazo: '2027-05-09' }), hoje)).toBe(true);
  });

  it('não destaca o prazo de hoje, o futuro nem o item sem prazo', () => {
    expect(itemAtrasado(item({ prazo: '2027-05-10' }), hoje)).toBe(false);
    expect(itemAtrasado(item({ prazo: '2027-05-11' }), hoje)).toBe(false);
    expect(itemAtrasado(item({}), hoje)).toBe(false);
  });

  it('feito ou cancelado perde o destaque', () => {
    expect(itemAtrasado(item({ prazo: '2027-05-01', feito: true }), hoje)).toBe(false);
    expect(itemAtrasado(item({ prazo: '2027-05-01', cancelado: true }), hoje)).toBe(false);
  });
});
