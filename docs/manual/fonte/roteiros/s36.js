const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  await H.go(p, EV + '/fornecedores');
  await H.shot(p, '36a-fornecedores-aba', true);
  await H.dump(p, 'main');
  await H.click(p, 'Buffet', 'main');
  await H.wait(p, 800);
  await H.dump(p, 'main mat-expansion-panel.mat-expanded');
};
