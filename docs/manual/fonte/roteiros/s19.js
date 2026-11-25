module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/orcamentos-funil');
  await H.click(p, 'Parcelas', 'main');
  await H.wd(p);
  await H.fill(p, 'Número de parcelas', '6', D);
  await H.fill(p, 'Vencimento da 1ª parcela', '10/12/2026', D);
  await H.click(p, 'Tem entrada', D);
  await H.wait(p, 500);
  await H.dump(p, D);
  const t = await H.txt(p, D);
  if (/Valor da entrada|Entrada/.test(t)) { try { await H.fill(p, 'Valor da entrada', '540000', D); } catch (e) { console.log(e.message); } }
  await H.dlg(p, '22a-parcelas-form');
  await H.click(p, 'Gerar parcelas', D);
  await H.wait(p, 1500);
  await H.dlg(p, '22b-parcelas-geradas');
  await H.dump(p);
  await H.esc(p);
  await H.click(p, 'Enviar proposta', 'main');
  await H.wd(p);
  await H.dlg(p, '23a-enviar-proposta');
  await H.dump(p, D);
  const link = await p.evaluate(() => { const i = [...document.querySelectorAll('mat-dialog-container input')].find((x) => /proposta/.test(x.value)); return i ? i.value : document.querySelector('mat-dialog-container').innerText.match(/http\S+proposta\S+/)?.[0]; });
  console.log('LINK', link);
  require('fs').writeFileSync('link-proposta.txt', String(link));
};
