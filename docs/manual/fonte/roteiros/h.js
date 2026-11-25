const puppeteer = require('puppeteer-core');
exports.get = async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: { width: 1366, height: 850 } });
  const pages = (await b.pages()).filter((x) => x.url().startsWith('http://localhost') || x.url() === 'about:blank');
  const p = pages[0] || (await b.newPage());
  await p.setViewport({ width: 1366, height: 850 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  return { b, p };
};
const sleep = (p, ms) => p.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
exports.wait = (p, ms = 800) => sleep(p, ms);
exports.go = async (p, path) => {
  await p.goto('http://localhost:8080' + path, { waitUntil: 'networkidle2', timeout: 12000 }).catch(() => {});
  await sleep(p, 700);
};
exports.shot = async (p, name, full) => {
  await sleep(p, 500);
  await p.evaluate(() => document.querySelectorAll('.cdk-overlay-container .toast, app-toast, .mat-mdc-snack-bar-container').forEach((e) => (e.style.display = 'none')));
  await p.screenshot({ path: 'shots/' + name + '.png', fullPage: !!full });
};
exports.dlg = async (p, name) => {
  await sleep(p, 500);
  const els = await p.$$('mat-dialog-container');
  const el = els[els.length - 1];
  if (el) await el.screenshot({ path: 'shots/' + name + '.png' });
  else await p.screenshot({ path: 'shots/' + name + '.png' });
};
exports.txt = async (p, sel = 'body') => p.evaluate((sel) => { const r = document.querySelectorAll(sel); return r.length ? r[r.length - 1].innerText : ''; }, sel);
exports.inter = async (p, sel = 'body') =>
  p.evaluate((sel) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const out = [];
    document.querySelectorAll(sel).forEach((r) => {
      r.querySelectorAll('button,a,input,textarea,mat-select,[role=tab],mat-checkbox,mat-slide-toggle,mat-radio-button').forEach((e) => {
        if (e.offsetParent === null && e.tagName !== 'INPUT') return;
        const t = e.tagName.toLowerCase();
        let lab = norm(e.getAttribute('aria-label') || e.innerText || e.placeholder || e.type).slice(0, 70);
        const ff = e.closest('mat-form-field');
        if (ff) {
          const l = ff.querySelector('mat-label,label');
          let L = l && norm(l.innerText);
          if (!L && ff.previousElementSibling && /LABEL/.test(ff.previousElementSibling.tagName)) L = norm(ff.previousElementSibling.innerText);
          if (L) lab = '[' + L + '] ' + lab;
        }
        out.push(t + ':' + lab);
      });
    });
    return out.join('\n');
  }, sel);
exports.click = async (p, text, scope = 'body', nth = 0) => {
  let ok = false;
  for (let k = 0; k < 4 && !ok; k++) { if (k) await sleep(p, 600); ok = await p.evaluate((text, scope, nth) => {
    const r = document.querySelectorAll(scope);
    const root = r[r.length - 1];
    if (!root) return false;
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const els = [...root.querySelectorAll('button,a,[role=tab],[role=menuitem],mat-option,[role=option],mat-chip-option,mat-checkbox,mat-slide-toggle,mat-radio-button,label,mat-expansion-panel-header,.mdc-list-item,mat-button-toggle')].filter((e) => e.getClientRects().length > 0);
    let m = els.filter((e) => norm(e.innerText) === text || e.getAttribute('aria-label') === text);
    if (!m.length) m = els.filter((e) => norm(e.innerText).includes(text) || (e.getAttribute('aria-label') || '').includes(text));
    if (!m[nth]) return false;
    m[nth].scrollIntoView({ block: 'center' });
    const alvo = /MAT-CHECKBOX|MAT-SLIDE-TOGGLE|MAT-RADIO-BUTTON/.test(m[nth].tagName) ? (m[nth].querySelector('input,button') || m[nth]) : m[nth];
    alvo.click();
    return true;
  }, text, scope, nth); }
  if (!ok) throw new Error('nao achei: ' + text);
  await sleep(p, 700);
};
const achaCampo = (p, label, scope, nth) =>
  p.evaluateHandle((label, scope, nth) => {
    const r = document.querySelectorAll(scope);
    const root = r[r.length - 1];
    const norm = (s) => (s || '').replace(/\s+/g, ' ').replace('*', '').trim();
    const ffs = [...root.querySelectorAll('mat-form-field')].filter((f) => f.getClientRects().length > 0);
    const lab = (ff) => {
      const l = ff.querySelector('mat-label,label');
      if (l && norm(l.innerText)) return norm(l.innerText);
      const pr = ff.previousElementSibling;
      if (pr && /LABEL/.test(pr.tagName)) return norm(pr.innerText);
      const i = ff.querySelector('input,textarea');
      return norm(i && (i.getAttribute('aria-label') || i.placeholder));
    };
    let c = ffs.filter((ff) => lab(ff) === label);
    if (!c.length) c = ffs.filter((ff) => lab(ff).startsWith(label));
    const f = c[nth];
    if (!f) return null;
    return f.querySelector('mat-select') || f.querySelector('input,textarea');
  }, label, scope, nth);
exports.fill = async (p, label, value, scope = 'body', nth = 0) => {
  const el = (await achaCampo(p, label, scope, nth)).asElement();
  if (!el) throw new Error('campo nao achado: ' + label);
  await el.click({ clickCount: 3 });
  await p.keyboard.down('Control'); await p.keyboard.press('a'); await p.keyboard.up('Control');
  await p.keyboard.press('Backspace');
  await el.type(String(value), { delay: 3 });
};
exports.select = async (p, label, option, scope = 'body', nth = 0) => {
  const el = (await achaCampo(p, label, scope, nth)).asElement();
  if (!el) throw new Error('select nao achado: ' + label);
  await el.click();
  await sleep(p, 500);
  await exports.opt(p, option);
  await sleep(p, 300);
};
exports.esc = async (p) => { await p.keyboard.press('Escape'); await sleep(p, 500); };

exports.opt = async (p, text) => { let ok=false; for (let k=0;k<4&&!ok;k++){ if(k) await sleep(p,500); ok = await p.evaluate((text)=>{ const norm=(s)=>(s||'').replace(/\s+/g,' ').trim(); const os=[...document.querySelectorAll('mat-option,[role=option],[role=menuitem]')].filter(e=>e.getClientRects().length>0); let m=os.find(e=>norm(e.innerText)===text)||os.find(e=>norm(e.innerText).includes(text)); if(!m) return false; m.click(); return true; }, text);} if(!ok) throw new Error('opcao nao achada: '+text); await sleep(p,500); };
exports.wd = async (p) => { await p.waitForSelector('mat-dialog-container', { timeout: 15000 }); await sleep(p, 900); };
