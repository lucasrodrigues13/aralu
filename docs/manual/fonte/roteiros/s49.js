const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/convidados');
  await H.click(p, 'Prazo de confirmação', 'main');
  await H.wd(p);
  await H.fill(p, 'Data limite', '15/04/2027', D);
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1200);
  await H.click(p, 'Data de envio', 'main');
  await H.wd(p);
  await H.fill(p, 'Data de envio', '10/02/2027', D);
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1200);
  await H.click(p, 'Expandir convidados de Família Monteiro', 'main');
  await H.shot(p, '40c-convidados-lista', true);
  // link do cliente
  await H.go(p, EV);
  await H.click(p, 'Mais', 'main');
  await H.opt(p, 'Link do cliente');
  await H.wd(p);
  await H.dump(p, D);
  await H.click(p, 'Gerar link', D).catch((e) => console.log(e.message));
  await H.wait(p, 1500);
  await H.dlg(p, '41a-link-cliente');
  await H.dump(p, D);
};
