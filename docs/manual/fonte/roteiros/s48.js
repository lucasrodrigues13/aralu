const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  const convites = [
    ['Família Monteiro', 'familia.monteiro@email.test', [['Ricardo Monteiro', '11955551111'], ['Cláudia Monteiro', ''], ['Lucas Monteiro', '']]],
    ['Tios do Gustavo', 'tios.ramos@email.test', [['Paulo Ramos', '11955552222'], ['Sandra Ramos', '']]],
  ];
  for (const [nome, email, pessoas] of convites) {
    await H.go(p, EV + '/convidados');
    await H.click(p, 'Novo convite', 'main');
    await H.wd(p);
    await H.fill(p, 'Nome do convite', nome, D);
    await H.fill(p, 'E-mail', email, D);
    for (let i = 0; i < pessoas.length; i++) {
      if (i > 0) await H.click(p, 'Adicionar convidado', D);
      const n = await p.$(D + ` input[aria-label="Nome completo do convidado ${i + 1}"]`);
      await n.click(); await p.keyboard.type(pessoas[i][0]);
      if (pessoas[i][1]) { const t = await p.$(D + ` input[aria-label="Telefone do convidado ${i + 1}"]`); await t.click(); await p.keyboard.type(pessoas[i][1]); }
    }
    const radios = await p.$$(D + ' mat-radio-button input');
    await radios[0].click();
    if (nome === 'Família Monteiro') await H.dlg(p, '40b-novo-convite');
    await H.click(p, 'Salvar convite', D);
    await H.wait(p, 1500);
    console.log('dlg', !!(await p.$(D)), (await H.txt(p, D)).slice(-200));
    if (await p.$(D)) await H.esc(p);
  }
  await H.click(p, 'Prazo de confirmação', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.esc(p);
  await H.click(p, 'Data de envio', 'main');
  await H.wd(p);
  await H.dump(p, D);
  await H.esc(p);
  await H.shot(p, '40c-convidados-lista', true);
  await H.dump(p, 'main');
};
