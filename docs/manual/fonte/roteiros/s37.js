const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/fornecedores');
  // add fornecedor ao Buffet (3o serviço => index 2)
  await H.click(p, 'add Fornecedor', 'main', 2);
  await H.wd(p);
  await H.dump(p, D);
  await H.click(p, 'Buffet Sabor & Arte', D);
  await H.dlg(p, '36b-adicionar-fornecedor');
  await H.click(p, 'Adicionar', D);
  await H.wait(p, 1500);
  await H.click(p, 'Ações do serviço', 'main', 2);
  console.log('ACOES SERV:', await p.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ')).join(' | ')));
  await H.esc(p);
  await H.click(p, 'Buffet', 'main');
  await H.wait(p, 800);
  await H.shot(p, '36c-buffet-expandido');
  console.log((await H.txt(p, 'main mat-expansion-panel.mat-expanded')));
  console.log(await H.inter(p, 'main mat-expansion-panel.mat-expanded'));
};
