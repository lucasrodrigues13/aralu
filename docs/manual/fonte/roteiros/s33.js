const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV);
  await H.click(p, 'edit Editar', 'main');
  await H.wd(p);
  await H.fill(p, 'Nome do noivo', 'Gustavo Ramos', D);
  await H.fill(p, 'Orçamento', '15000000', D);
  await H.fill(p, 'URL do site', 'https://beatrizegustavo.casar.test', D);
  await H.fill(p, 'Tags', 'jardim', D); await p.keyboard.press('Tab');
  await H.click(p, 'Salvar na agenda', D);
  await H.dlg(p, '34a-editar-evento');
  await H.click(p, 'Detalhes', D);
  await H.fill(p, 'Padrinhos', 'Ana Monteiro, Pedro Ramos, Júlia Costa, Rafael Lima', D);
  await H.fill(p, 'Damas e pajens', 'Sofia (5 anos) e Miguel (6 anos)', D);
  await H.dlg(p, '34b-editar-evento-detalhes');
  await H.click(p, 'Salvar evento', D);
  await H.wait(p, 1800);
  // nova tarefa com checklist
  await H.click(p, 'Nova tarefa', 'main');
  await H.wd(p);
  await H.fill(p, 'Título', 'Escolher vestido da noiva', D);
  await H.fill(p, 'Descrição', 'Visitar 3 ateliês com a Beatriz e a mãe dela.', D);
  await H.fill(p, 'Prazo', '20/11/2026', D);
  await H.select(p, 'Prioridade', 'Alta', D);
  await H.fill(p, 'Grupo', 'Noiva', D);
  for (const [i, t] of ['Ateliê Maria Bonita', 'Ateliê Seda Pura', 'Ateliê Véu de Noiva'].entries()) {
    await H.click(p, 'Adicionar item', D);
    const ins = await p.$$(D + ' input');
    const last = ins[ins.length - 1];
    await last.click(); await p.keyboard.type(t);
  }
  await H.dlg(p, '35a-nova-tarefa-checklist');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1800);
  await H.shot(p, '35b-resumo-atrasada', true);
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 2500));
};
