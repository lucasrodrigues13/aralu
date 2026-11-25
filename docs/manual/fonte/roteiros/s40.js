const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/fornecedores');
  await H.click(p, 'expand_more Buffet', 'main');
  await H.click(p, 'check Contratado', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.fill(p, 'Valor', '4200000', D);
  const f = await p.$$(D + ' input[type=file]');
  if (f.length) { await f[0].uploadFile(require('path').resolve('contrato-buffet.pdf')); await H.wait(p, 1500); }
  await H.dlg(p, '37a-contratar-buffet');
  await H.click(p, 'Contratar', D).catch(() => H.click(p, 'Salvar', D));
  await H.wait(p, 1800);
  // fotografia
  await H.click(p, 'add Fornecedor', 'main', 1);
  await H.wd(p);
  await H.fill(p, 'Fornecedores', 'Foto', D); await H.wait(p, 800); await H.opt(p, 'Foto Luz Fotografia');
  await H.click(p, 'Adicionar', D);
  await H.wait(p, 1500);
  await H.click(p, 'expand_more Fotografia', 'main');
  await H.click(p, 'check Contratado', 'main');
  await H.wd(p);
  await H.fill(p, 'Valor', '980000', D);
  await H.click(p, 'Contratar', D).catch(() => H.click(p, 'Salvar', D));
  await H.wait(p, 1800);
  await H.shot(p, '37b-fornecedores-contratados', true);
  const t = await H.txt(p, 'main');
  console.log(t.replace(/\n+/g, ' | ').slice(0, 2500));
};
