const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/dinheiro');
  await H.shot(p, '38a-financeiro-aba', true);
  await H.dump(p, 'main');
  await H.click(p, 'Buffet', 'main').catch(() => {});
  await H.wait(p, 800);
  console.log(await H.inter(p, 'main'));
};
