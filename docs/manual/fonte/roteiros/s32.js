const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV);
  await H.click(p, 'edit Editar', 'main');
  await H.wd(p);
  await H.dump(p, D);
  for (const t of ['Detalhes', 'Cerimônia', 'Recepção']) {
    try { await H.click(p, t, D); console.log('### ' + t); console.log(await H.inter(p, D + ' .mat-mdc-tab-body-active')); } catch (e) { console.log(e.message); }
  }
  await H.esc(p);
};
