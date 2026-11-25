const EV = '/eventos/9da95638-fbfc-44c8-8db4-9ab2995d2ab3';
module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, EV + '/dinheiro');
  console.log(await p.evaluate(() => [...document.querySelectorAll('main button')].map((b) => (b.getAttribute('aria-label') || '') + '#' + b.innerText.replace(/\s+/g, ' ').slice(0, 40)).join('\n')));
  await H.click(p, 'parcelas', 'main', 0).catch((e) => console.log(e.message));
  await H.wait(p, 700);
  await H.click(p, 'Entrada · vence 10/12/2026', 'main');
  await H.wait(p, 1200);
  if (await p.$(D)) { await H.dump(p, D); }
  const files = await p.$$('main input[type=file]');
  console.log('files', files.length);
  await H.shot(p, '38d-entrada-paga', true);
  console.log((await H.txt(p, 'main')).replace(/\n+/g, ' | ').slice(0, 1500));
};
