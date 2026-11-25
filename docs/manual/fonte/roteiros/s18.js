module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/orcamentos-funil');
  await H.click(p, 'Parcelas', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.dlg(p, '22a-parcelas-vazio');
};
