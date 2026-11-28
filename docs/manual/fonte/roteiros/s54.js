const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const ctx = await p.browser().createBrowserContext();
  const a = await ctx.newPage();
  await a.setViewport({ width: 420, height: 900, isMobile: true });
  await a.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await H.go(a, '/portaria/gtQcU_IU_l8VjpVNqFdoVWwStEGlm9tRTZUrQCTNZzc');
  await H.click(a, 'Abrir');
  await H.wait(a, 1200);
  await H.shot(a, '44c-portaria-convite', true);
  await H.dump(a, (await a.$('mat-dialog-container')) ? 'mat-dialog-container' : 'body');
  const sc = (await a.$('mat-dialog-container')) ? 'mat-dialog-container' : 'body';
  const btns = await a.evaluate((sc) => [...document.querySelector(sc).querySelectorAll('button')].map((b) => b.innerText.trim()), sc);
  console.log(btns);
  const alvo = btns.find((b) => /Confirmar|entrada|Registrar/i.test(b));
  if (alvo) { await H.click(a, alvo, sc); await H.wait(a, 1500); }
  await H.shot(a, '44d-portaria-entrou', true);
  console.log(await H.txt(a));
  await ctx.close();
  await H.go(p, EV + '/convidados');
  await H.click(p, 'Lista de presença', 'main');
  await H.wd(p);
  await H.dlg(p, '45-lista-presenca');
  await H.dump(p);
};
