module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  // move card via quick action
  await H.go(p, '/oportunidades');
  await H.click(p, 'more_vert', 'main', 1); await H.opt(p, 'Mover para Reunião marcada'); await H.wait(p,1200); await H.shot(p,'20-quadro-reuniao');
  await H.wait(p, 600);
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 300));
  await H.go(p, '/orcamentos-funil');
  await H.dump(p, 'main');
  await H.click(p, 'Novo orçamento', 'main');
  await H.wd(p);
  await H.dump(p, D);
};
