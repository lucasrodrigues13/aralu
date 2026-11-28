module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/oportunidades');
  await H.shot(p, '30b-quadro-contratado');
  await H.click(p, 'Criar evento', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.dlg(p, '31b-novo-evento-da-oportunidade');
  await H.click(p, 'Criar evento', D);
  await H.wait(p, 2500);
  console.log(p.url());
  await H.shot(p, '32a-evento-resumo');
  await H.dump(p, 'main');
};
