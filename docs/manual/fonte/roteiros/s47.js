const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/contratos');
  await H.shot(p, '39a-contratos-aba', true);
  await H.dump(p, 'main');
  await H.go(p, EV + '/convidados');
  await H.shot(p, '40a-convidados-vazio', true);
  await H.dump(p, 'main');
  await H.click(p, 'Novo convite', 'main');
  await H.wd(p);
  await H.dump(p, D);
};
