module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  const tarefas = [['Reunião de apresentação com Beatriz e Gustavo', 'Reunião', '27/11/2026', 'Levar portfólio e exemplos de cronograma.'], ['Ligar para confirmar a reunião', 'Ligação', '26/11/2026', 'Confirmar endereço do escritório.']];
  for (const [t, tipo, prazo, obs] of tarefas) {
    await H.go(p, '/tarefas-funil');
    await H.click(p, 'Adicionar tarefa', 'main');
    await H.wd(p);
    await H.fill(p, 'Título', t, D);
    await H.select(p, 'Oportunidade', 'Casamento Beatriz e Gustavo', D);
    await H.select(p, 'Tipo', tipo, D);
    await H.fill(p, 'Prazo', prazo, D);
    const ta = await p.$(D + ' textarea');
    await ta.click(); await p.keyboard.type(obs);
    if (tipo === 'Reunião') await H.dlg(p, '19a-tarefa-funil-form');
    await H.click(p, 'Salvar', D);
    await H.wait(p, 1200);
  }
  await H.shot(p, '19b-tarefas-funil-lista');
  await H.dump(p, 'main');
  // move card via quick action
  await H.go(p, '/oportunidades');
  await H.click(p, 'Reunião marcada', 'main .mat-mdc-card, main', 0);
  await H.wait(p, 600);
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 300));
  await H.go(p, '/orcamentos-funil');
  await H.dump(p, 'main');
  await H.click(p, 'Novo orçamento', 'main');
  await H.wd(p);
  await H.dump(p, D);
};
