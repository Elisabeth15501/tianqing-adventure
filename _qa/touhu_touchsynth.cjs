const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'file:///C:/Users/elisa/dev/tianqing-adventure/preview/dev-touhu.html?m=aim&qhide=1';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  let s = null;
  for (let i = 0; i < 80; i++) { s = await p.evaluate(() => window.TQM&&window.TQM.cur&&window.TQM.cur.state?window.TQM.cur.state():null); if (s && s.ph === 'aim') break; await p.waitForTimeout(150); }
  const res = await p.evaluate(() => {
    var st = document.querySelector('.iv-stage');
    var r = st.getBoundingClientRect();
    var sx = r.left + r.width * 0.38, sy = r.top + r.height * 0.82;
    var ex = sx + 180, ey = sy - 120;
    function T(x, y) { return new Touch({ identifier: 1, target: st, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y }); }
    function fire(type, touches, changed) {
      st.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: touches, changedTouches: changed, targetTouches: touches }));
    }
    var t0 = T(sx, sy), t1 = T(sx + 90, sy - 60), t2 = T(ex, ey);
    fire('touchstart', [t0], [t0]);
    fire('touchmove', [t1], [t1]);
    fire('touchmove', [t2], [t2]);
    var mid = window.TQM.cur.state();
    fire('touchend', [], [t2]);
    var after = window.TQM.cur.state();
    return { mid: { ph: mid.ph, aim: mid.aim }, after: { ph: after.ph, fly: after.fly } };
  });
  console.log('after moves: ph=', res.mid.ph, 'aim=', JSON.stringify(res.mid.aim));
  console.log('after end  : ph=', res.after.ph, 'fly=', JSON.stringify(res.after.fly), 'errs=', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
