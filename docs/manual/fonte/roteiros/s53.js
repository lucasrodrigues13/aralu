const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  const ctx = await p.browser().createBrowserContext();
  const a = await ctx.newPage();
  await a.setViewport({ width: 420, height: 900, isMobile: true });
  await a.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await H.go(a, '/rsvp/adec65168a5f4ebebd9437c30111ae89');
  const r = await a.$$('mat-radio-button input');
  await r[0].click(); await r[2].click(); await r[5].click();
  await (await a.$('mat-checkbox input')).click();
  await H.shot(a, '43a-rsvp', true);
  await H.click(a, 'Enviar');
  await H.wait(a, 2000);
  await H.shot(a, '43b-rsvp-confirmado', true);
  console.log(await H.txt(a));
  // portaria
  await H.go(p, EV);
  await H.click(p, 'Mais', 'main');
  await H.opt(p, 'Link da portaria');
  await H.wd(p);
  await H.dump(p, D);
  await H.click(p, 'Gerar link', D).catch((e) => console.log(e.message));
  await H.wait(p, 1500);
  const link = await p.$eval(D + ' input', (i) => i.value).catch(() => '');
  console.log('PORTARIA', link);
  await H.dlg(p, '44a-link-portaria');
  await H.esc(p);
  if (link) {
    await H.go(a, link.replace('http://localhost:8080', ''));
    await H.shot(a, '44b-portaria', true);
    await H.dump(a, 'body');
    await H.click(a, 'Família Monteiro').catch((e) => console.log(e.message));
    await H.wait(a, 1000);
    await H.shot(a, '44c-portaria-convite', true);
    await H.dump(a, 'body');
    await H.click(a, 'Confirmar presença').catch((e) => console.log(e.message));
    await H.wait(a, 1500);
    await H.shot(a, '44d-portaria-entrou', true);
    console.log(await H.txt(a));
  }
  await ctx.close();
};
