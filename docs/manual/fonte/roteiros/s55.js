module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/leads-rsvp');
  await H.shot(p, '46a-oportunidades-rsvp');
  await H.dump(p, 'main');
  await H.go(p, '/assistentes');
  await H.dump(p, 'main');
  await H.click(p, 'Convidar assistente', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.esc(p);
  await H.go(p, '/tarefas');
  await H.shot(p, '47a-tarefas-geral', true);
  await H.dump(p, 'main');
  await H.go(p, '/agenda');
  await H.shot(p, '48a-agenda');
  await H.dump(p, 'main');
};
