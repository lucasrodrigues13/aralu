const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/fornecedores');
  const t = await H.txt(p, 'main');
  console.log(t.slice(t.indexOf('Adicionar serviço')).replace(/\n+/g, ' | '));
  await H.click(p, 'expand_more Buffet', 'main');
  await H.wait(p, 900);
  const t2 = await H.txt(p, 'main');
  console.log(t2.slice(t2.indexOf('Adicionar serviço')).replace(/\n+/g, ' | '));
  console.log(await H.inter(p, 'main'));
  await H.shot(p, '36c-buffet-expandido');
};
