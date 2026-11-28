module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/oportunidades');
  await H.click(p, 'Nova oportunidade', 'main');
  await H.fill(p, 'Nome da oportunidade', 'Casamento Larissa e Felipe', D);
  await H.fill(p, 'Nome', 'Larissa Prado', D, 0);
  await H.fill(p, 'Telefone', '11977778888', D);
  await H.select(p, 'Tipo', 'Casamento', D);
  await H.fill(p, 'Convidados', '120', D);
  await H.select(p, 'Origem', 'Instagram', D);
  await H.dlg(p, '16a-nova-oportunidade');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1500);
  await H.shot(p, '16b-quadro-dois-leads');
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 1500));
  // menu do cartão
  await H.click(p, 'more_vert', 'main');
  console.log('MENU:', (await p.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ')).join(' | '))));
  await H.shot(p, '16c-menu-cartao');
  await H.esc(p);
};
