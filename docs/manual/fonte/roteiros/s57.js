const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/agenda');
  await H.click(p, 'Novo compromisso', 'main');
  await H.wd(p);
  await H.fill(p, 'Descrição', 'Visita técnica ao Espaço Villa Jardim', D);
  await H.fill(p, 'Data', '03/12/2026', D);
  await H.fill(p, 'Hora (opcional)', '1430', D);
  await H.dlg(p, '48b-novo-compromisso');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1200);
  await H.click(p, 'Próximo período', 'main');
  await H.wait(p, 800);
  await H.shot(p, '48a-agenda');
  // recebimento
  await H.go(p, '/gestao-financeira');
  await H.click(p, 'Parcelas do contrato', 'main');
  await H.wd(p);
  await H.click(p, 'Recebi', D);
  await H.wait(p, 1000);
  const dl = await p.$$(D);
  console.log('dialogs', dl.length);
  await H.dump(p, 'mat-dialog-container:last-of-type');
  await H.dlg(p, '29c-recebi');
};
