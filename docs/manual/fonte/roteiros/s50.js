const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV);
  await H.click(p, 'Mais', 'main');
  await H.opt(p, 'Link do cliente');
  await H.wd(p);
  const link = await p.$eval(D + ' input', (i) => i.value);
  console.log('LINK', link);
  const tg = await p.$$(D + ' mat-slide-toggle button');
  for (const t of tg) { await t.click(); await H.wait(p, 900); }
  await H.dlg(p, '41b-link-cliente-liberado');
  await H.click(p, 'Fechar', D);
  const ctx = await p.browser().createBrowserContext();
  const a = await ctx.newPage();
  await a.setViewport({ width: 1366, height: 850 });
  await a.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await H.go(a, link.replace('http://localhost:8080', ''));
  await H.shot(a, '42a-area-cliente', true);
  await H.dump(a, 'body');
  await H.click(a, 'Novo convite').catch((e) => console.log(e.message));
  await H.wait(a, 1200);
  await H.dump(a, (await a.$(D)) ? D : 'body');
  await ctx.close();
};
