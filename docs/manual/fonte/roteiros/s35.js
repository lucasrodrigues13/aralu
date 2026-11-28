const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV);
  await H.click(p, 'Nova tarefa', 'main');
  await H.wd(p);
  await H.fill(p, 'Título', 'Escolher vestido da noiva', D);
  await H.fill(p, 'Descrição', 'Visitar 3 ateliês com a Beatriz e a mãe dela.', D);
  await H.fill(p, 'Prazo', '20/11/2026', D);
  await H.select(p, 'Prioridade', 'Alta', D);
  await H.fill(p, 'Grupo', 'Noiva', D);
  for (const t of ['Ateliê Maria Bonita', 'Ateliê Seda Pura', 'Ateliê Véu de Noiva']) {
    await H.click(p, 'Adicionar item', D);
    const ins = await p.$$(D + ' input[placeholder="Descreva o item"]');
    const last = ins[ins.length - 1];
    await last.click(); await p.keyboard.type(t);
  }
  await H.dlg(p, '35a-nova-tarefa-checklist');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1800);
  console.log('dlg?', !!(await p.$(D)), (await H.txt(p, D)).slice(-300));
  await H.shot(p, '35b-resumo-atrasada', true);
};
