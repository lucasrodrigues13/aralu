const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV);
  await H.click(p, 'Mais', 'main');
  await H.opt(p, 'Salvar como modelo');
  await H.wd(p);
  await H.fill(p, 'Nome', 'Casamento completo v2', D);
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1500);
  await H.shot(p, '32b-evento-resumo-final', true);
  await H.click(p, 'Mais', 'main');
  await H.opt(p, 'Concluir evento');
  await H.wait(p, 1000);
  if (await p.$(D)) { await H.dump(p, D); await H.dlg(p, '52a-concluir'); const bs = await p.evaluate(() => [...document.querySelectorAll('mat-dialog-container button')].map((b) => b.innerText.trim())); console.log(bs); await H.click(p, bs[bs.length - 1], D); }
  await H.wait(p, 1500);
  await H.go(p, '/eventos');
  await H.click(p, 'Concluído', 'main');
  await H.wait(p, 1000);
  await H.shot(p, '52b-eventos-concluidos');
  await H.click(p, 'Estatísticas', 'main');
  await H.wait(p, 1500);
  await H.shot(p, '53-estatisticas', true);
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 1200));
};
