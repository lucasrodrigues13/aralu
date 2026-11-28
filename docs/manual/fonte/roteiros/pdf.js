// Gera docs/manual/manual-de-utilizacao-aralu.pdf a partir de src/frontend/public/manual/index.html.
module.exports = async (p) => {
  const path = require('path');
  const raiz = path.resolve(__dirname, '../../../..');
  const pg = await p.browser().newPage();
  await pg.goto('file:///' + path.join(raiz, 'src/frontend/public/manual/index.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 60000 });
  await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({
    path: path.join(raiz, 'docs/manual/manual-de-utilizacao-aralu.pdf'),
    format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false,
  });
  await pg.close();
  console.log('ok');
};
