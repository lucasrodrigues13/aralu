module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/oportunidades');
  await H.click(p, 'more_vert', 'main', 1);
  await H.opt(p, 'Briefing');
  await H.wd(p);
  await H.select(p, 'Modelo de briefing', 'Primeira conversa', D);
  await H.click(p, 'Aplicar', D);
  await H.wait(p, 1000);
  await H.dump(p, D);
  const resp = ['15 de maio de 2027, sábado à tarde', 'Cerca de 180 pessoas', 'Clássico, ao ar livre, tons de verde e branco', 'Até R$ 150.000 no total', 'Pista de dança animada e doces finos'];
  const tas = await p.$$(D + ' textarea, ' + D + ' input:not([type=checkbox])');
  console.log('campos', tas.length);
  await H.dlg(p, '18a-briefing-aplicado');
  for (let i = 0; i < resp.length && i < 99; i++) {
    try { await H.fill(p, ['Qual a data desejada?', 'Quantos convidados vocês imaginam?', 'Qual o estilo da festa?', 'Qual o orçamento total previsto?', 'O que não pode faltar de jeito nenhum?'][i], resp[i], D); } catch (e) { console.log(e.message); }
  }
  await H.dlg(p, '18b-briefing-respondido');
  await H.dump(p, D);
};
