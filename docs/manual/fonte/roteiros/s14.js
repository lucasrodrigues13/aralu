module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/oportunidades');
  await H.click(p, 'more_vert', 'main', 1);
  await H.opt(p, 'Briefing');
  await H.wd(p);
  const resp = ['15 de maio de 2027, sábado à tarde', 'Cerca de 180 pessoas', 'Clássico, ao ar livre, tons de verde e branco', 'Até R$ 150.000 no total', 'Pista de dança animada e doces finos'];
  const tas = await p.$$(D + ' textarea');
  for (let i = 0; i < tas.length; i++) { await tas[i].click(); await p.keyboard.type(resp[i]); }
  await H.dlg(p, '18b-briefing-respondido');
  await H.click(p, 'Salvar respostas', D);
  await H.wait(p, 1200);
  // tarefa do funil
  await H.go(p, '/tarefas-funil');
  await H.click(p, 'Adicionar tarefa', 'main');
  await H.wd(p);
  await H.dump(p, D);
};
