const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/dinheiro');
  await H.click(p, 'expand_more Buffet', 'main');
  await H.wait(p, 600);
  console.log(await H.inter(p, 'main'));
  await H.click(p, 'expand_more Buffet Sabor', 'main').catch(() => {});
  await H.click(p, 'Entrada · vence 10/12/2026', 'main');
  await H.wait(p, 1200);
  if (await p.$(D)) { await H.dump(p, D); await H.click(p, 'Confirmar', D).catch(() => {}); }
  // comprovante da entrada: 2o input file da área? achar input file perto
  const files = await p.$$('main input[type=file]');
  console.log('files', files.length);
  if (files.length > 1) { await files[1].uploadFile(require('path').resolve('comprovante.pdf')); await H.wait(p, 1800); }
  await H.shot(p, '38d-entrada-paga', true);
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 1500));
  await H.go(p, EV + '/contratos');
  await H.shot(p, '39a-contratos-aba', true);
  await H.dump(p, 'main');
  await H.go(p, EV + '/convidados');
  await H.shot(p, '40a-convidados-vazio', true);
  await H.dump(p, 'main');
};
