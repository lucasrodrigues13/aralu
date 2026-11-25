const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV);
  await H.click(p, 'Aplicar modelo', 'main');
  await H.wd(p);
  await H.dump(p, D);
  try { await H.select(p, 'Modelo', 'Casamento completo', D); } catch (e) { await H.click(p, 'Casamento completo', D).catch(() => {}); }
  await H.wait(p, 1200);
  await H.dlg(p, '33a-aplicar-modelo');
  await H.dump(p, D);
  await H.click(p, 'Aplicar', D);
  await H.wait(p, 2000);
  await H.shot(p, '33b-resumo-com-tarefas', true);
  await H.click(p, 'Mais', 'main');
  console.log('MAIS:', await p.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ')).join(' | ')));
  await H.esc(p);
  await H.click(p, 'Editar', 'main');
  await H.wd(p);
  await H.dump(p, D);
};
