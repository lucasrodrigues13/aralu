module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/eventos');
  await H.shot(p, '31a-eventos-vazio');
  await H.dump(p, 'main');
  await H.click(p, 'Novo evento', 'main');
  await H.wd(p);
  await H.dump(p, D);
};
