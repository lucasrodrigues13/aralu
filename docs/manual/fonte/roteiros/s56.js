const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/leads-rsvp');
  await H.shot(p, '46a-oportunidades-rsvp');
  console.log('RSVP:', (await H.txt(p, 'main')).replace(/\n+/g, ' | '));
  console.log(await H.inter(p, 'main'));
  await H.go(p, '/agenda');
  await H.click(p, 'Novo compromisso', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.fill(p, 'Título', 'Visita técnica ao Espaço Villa Jardim', D).catch((e) => console.log(e.message));
  await H.fill(p, 'Data', '03/12/2026', D).catch((e) => console.log(e.message));
  await H.dlg(p, '48b-novo-compromisso');
  await H.click(p, 'Salvar', D).catch((e) => console.log(e.message));
  await H.wait(p, 1200);
  await H.shot(p, '48a-agenda');
  // gestão financeira: recebimento
  await H.go(p, '/gestao-financeira');
  await H.click(p, 'Parcelas do contrato', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.dlg(p, '29b-parcelas-contrato');
};
