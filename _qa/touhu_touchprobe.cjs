const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'file:///C:/Users/elisa/dev/tianqing-adventure/preview/dev-touhu.html?m=aim&qhide=1';

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
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
  const box = await p.evaluate(() => { var el = document.querySelector('.iv-stage'); var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });

  /* 计数探针：确认 touch 事件是否真的到达 stage */
  await p.evaluate(() => {
    window.__tc = { s: 0, m: 0, e: 0, last: null };
    var st = document.querySelector('.iv-stage');
    st.addEventListener('touchstart', function (e) { window.__tc.s++; var t = e.changedTouches[0]; window.__tc.last = t ? { x: t.clientX, y: t.clientY } : null; }, true);
    st.addEventListener('touchmove', function (e) { window.__tc.m++; }, true);
    st.addEventListener('touchend', function (e) { window.__tc.e++; }, true);
  });

  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  const sx = box.x + box.w * 0.38, sy = box.y + box.h * 0.82;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + 180 * i / 12, y: sy - 120 * i / 12, id: 1 }] });
    await p.waitForTimeout(16);
  }
  const mid = await p.evaluate(() => ({ aim: window.TQM.cur.state().aim, tc: window.__tc }));
  console.log('box', JSON.stringify(box), 'start', Math.round(sx), Math.round(sy));
  console.log('after moves: aim=', JSON.stringify(mid.aim), 'touchCounts=', JSON.stringify(mid.tc));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(180);
  const after = await p.evaluate(() => ({ st: window.TQM.cur.state(), tc: window.__tc }));
  console.log('after end: ph=', after.st.ph, 'fly=', JSON.stringify(after.st.fly), 'touchCounts=', JSON.stringify(after.tc), 'errs=', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
