const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'file:///C:/Users/elisa/dev/tianqing-adventure/preview/dev-touhu.html?m=aim&qhide=1';

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: false });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  let s = null;
  for (let i = 0; i < 80; i++) {
    s = await p.evaluate(() => (window.TQM && window.TQM.cur && window.TQM.cur.state) ? window.TQM.cur.state() : null);
    if (s && s.ph === 'aim') break;
    await p.waitForTimeout(150);
  }
  console.log('before drag: ph=', s && s.ph, 'armed=', s && s.armed);
  const box = await p.evaluate(() => { var el = document.querySelector('.iv-stage'); var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  console.log('stage box', JSON.stringify(box));
  const sx = box.x + box.w * 0.38, sy = box.y + box.h * 0.82;
  await p.mouse.move(sx, sy);
  await p.mouse.down();
  for (let i = 1; i <= 12; i++) { await p.mouse.move(sx + 180 * i / 12, sy - 120 * i / 12); await p.waitForTimeout(16); }
  const mid = await p.evaluate(() => window.TQM.cur.state());
  console.log('after moves (before up): dragAim=', JSON.stringify(mid.aim));
  await p.mouse.up();
  await p.waitForTimeout(150);
  const after = await p.evaluate(() => window.TQM.cur.state());
  console.log('after up: ph=', after.ph, 'fly=', JSON.stringify(after.fly), 'errs=', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
