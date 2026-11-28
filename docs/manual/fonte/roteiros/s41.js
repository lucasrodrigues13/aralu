const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/fornecedores');
  await H.click(p, 'expand_more Fotografia', 'main');
  await H.wait(p, 800);
  console.log(await H.inter(p, 'main'));
  await H.click(p, 'check Contratado', 'main');
  await H.wd(p);
  await H.fill(p, 'Valor', '980000', D);
  await H.click(p, 'Contratar', D);
  await H.wait(p, 1800);
  await H.click(p, 'expand_more Buffet', 'main');
  await H.wait(p, 800);
  await H.shot(p, '37b-fornecedores-contratados', true);
  console.log(await H.inter(p, 'main'));
  const t = await H.txt(p, 'main');
  console.log(t.replace(/\n+/g, ' | ').slice(0, 2500));
};
