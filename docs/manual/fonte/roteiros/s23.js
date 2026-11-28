module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/contratos-funil');
  await H.dump(p, 'main');
  await H.click(p, 'Novo contrato', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.select(p, 'Oportunidade', 'Casamento Beatriz e Gustavo', D);
  await H.select(p, 'Modelo', 'Contrato de assessoria', D);
  await H.wait(p, 800);
  await H.dlg(p, '26a-contrato-novo');
  await H.dump(p, D);
  await H.click(p, 'Gerar', D).catch(async () => H.click(p, 'Salvar', D));
  await H.wait(p, 1800);
  await H.shot(p, '26b-contratos-lista');
  await H.dump(p, 'main');
};
