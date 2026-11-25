module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/eventos');
  await H.click(p, 'Novo evento', 'main');
  await H.wd(p);
  await H.click(p, 'Casamento', D);
  await H.wait(p, 700);
  await H.dump(p, D);
};
