module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/contratos-funil');
  await H.click(p, 'Ver contrato', 'main');
  await H.wd(p);
  await H.shot(p, '27a-ver-contrato');
  await H.dump(p, D);
  await H.esc(p);
  await H.click(p, 'Enviar contrato', 'main');
  await H.wait(p, 1000);
  if (await p.$(D)) { await H.dump(p, D); await H.click(p, 'Confirmar', D).catch(() => H.click(p, 'Enviar', D)); }
  await H.wait(p, 1000);
  await H.click(p, 'Marcar como assinado', 'main');
  await H.wait(p, 1000);
  if (await p.$(D)) { await H.dump(p, D); await H.click(p, 'Confirmar', D).catch(() => H.click(p, 'Assinar', D)); }
  await H.wait(p, 1200);
  await H.click(p, 'Assinados', 'main');
  await H.shot(p, '27b-contratos-assinados');
  await H.dump(p, 'main');
  // descartar Larissa
  await H.go(p, '/oportunidades');
  await H.click(p, 'more_vert', 'main', 0);
  await H.opt(p, 'Mover para Descartado');
  await H.wd(p);
  await H.dump(p, D);
  await H.dlg(p, '28a-descartar');
};
