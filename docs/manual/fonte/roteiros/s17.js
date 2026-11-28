module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/orcamentos-funil');
  await H.click(p, 'Novo orçamento', 'main');
  await H.wd(p);
  await H.select(p, 'Oportunidade', 'Casamento Beatriz e Gustavo', D);
  await H.select(p, 'Modelo', 'Proposta de casamento', D);
  await H.wait(p, 1000);
  await H.fill(p, 'Valor', '1800000', D);
  await H.dlg(p, '21a-orcamento-novo');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1500);
  await H.shot(p, '21b-orcamentos-lista');
  await H.dump(p, 'main');
};
