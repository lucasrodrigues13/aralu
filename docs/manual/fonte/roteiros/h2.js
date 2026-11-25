const H = require('./h');
const sleep = (p, ms) => p.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
H.quill = async (p, idx, text, scope = 'mat-dialog-container') => {
  const eds = await p.$$(scope + ' .ql-editor');
  const e = eds[idx];
  if (!e) throw new Error('quill ' + idx);
  await e.click();
  await p.keyboard.type(text, { delay: 1 });
};
H.upload = async (p, idx, file, scope = 'body') => {
  const ins = await p.$$(scope + ' input[type=file]');
  if (!ins[idx]) throw new Error('file input ' + idx);
  await ins[idx].uploadFile(require('path').resolve(file));
  await sleep(p, 1500);
};
H.dump = async (p, sc) => {
  sc = sc || ((await p.$('mat-dialog-container')) ? 'mat-dialog-container' : 'main');
  console.log((await H.txt(p, sc)).replace(/\n+/g, ' | ').slice(0, 1500));
  console.log('--');
  console.log(await H.inter(p, sc));
};
module.exports = H;
