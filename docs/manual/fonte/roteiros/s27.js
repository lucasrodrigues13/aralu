module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/oportunidades');
  await H.click(p, 'Virar cliente', 'main');
  await H.wd(p);
  const el = (await p.$$(D + ' mat-select'))[0];
  await el.click();
  await H.wait(p, 600);
  console.log('PAPEIS', await p.evaluate(() => [...document.querySelectorAll('mat-option')].map((o) => o.innerText).join(' | ')));
  await H.opt(p, 'Noiv').catch(() => H.esc(p));
  await H.dlg(p, '30a-virar-cliente');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1500);
  console.log('dialog?', !!(await p.$(D)), await H.txt(p, D));
  await H.shot(p, '30b-quadro-contratado');
  await H.go(p, '/clientes');
  await H.shot(p, '30c-clientes');
  await H.dump(p, 'main');
};
