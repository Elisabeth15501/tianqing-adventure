const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'file:///C:/Users/elisa/dev/tianqing-adventure/preview/dev-touhu.html?m=aim&qhide=1';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  let s = null;
  for (let i = 0; i < 80; i++) { s = await p.evaluate(() => window.TQM&&window.TQM.cur&&window.TQM.cur.state?window.TQM.cur.state():null); if (s && s.ph === 'aim') break; await p.waitForTimeout(150); }
  const box = await p.evaluate(() => { var el = document.querySelector('.iv-stage'); var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const sx = box.x + box.w * 0.38, sy = box.y + box.h * 0.82;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + 180, y: sy - 120, id: 1 }] });
  await p.waitForTimeout(80);
  const mid = await p.evaluate(() => ({ aim: window.TQM.cur.state().aim, ph: window.TQM.cur.state().ph }));
  console.log('after ONE big move: ph=', mid.ph, 'aim=', JSON.stringify(mid.aim));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(180);
  const after = await p.evaluate(() => window.TQM.cur.state());
  console.log('after end: ph=', after.ph, 'fly=', JSON.stringify(after.fly));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
