module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  // Estágios
  await H.go(p, '/oportunidades');
  await H.shot(p, '14a-oportunidades-vazio');
  await H.click(p, 'Gerenciar estágios', 'main');
  await H.click(p, 'Novo estágio', D);
  await H.wait(p, 500);
  const ins = await p.$$(D + ' input[aria-label^="Nome do estágio"]');
  console.log('estagios', ins.length);
  const novo = ins[ins.length - 1];
  await novo.click();
  await p.keyboard.type('Reunião marcada');
  await H.dlg(p, '14b-gerenciar-estagios');
  await H.dump(p, D);
  // mover para posição 2: arrastar handle
  const handles = await p.$$(D + ' button[aria-label="Arrastar para mudar a ordem"]');
  const hb = await handles[handles.length - 1].boundingBox();
  const tb = await handles[1].boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(hb.x + hb.width / 2, hb.y + (tb.y - hb.y) * (i / 10) - 5);
  await p.mouse.up();
  await H.wait(p, 600);
  console.log(await p.evaluate(() => [...document.querySelectorAll('mat-dialog-container input[aria-label^="Nome do estágio"]')].map((i) => i.value).join(' > ')));
  await H.dlg(p, '14c-gerenciar-estagios-ordem');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1200);
  await H.shot(p, '14d-oportunidades-estagios');
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 500));
};
