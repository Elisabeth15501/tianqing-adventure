const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:8951/_qa/touhu_ptr_test.html?m=aim&qhide=1';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  let s = null;
  for (let i = 0; i < 60; i++) {
    s = await p.evaluate(() => (window.TQM && window.TQM.cur && window.TQM.cur.state) ? window.TQM.cur.state() : null);
    if (s && s.ph === 'aim') break;
    await p.waitForTimeout(150);
  }
  console.log('[基线] ph=', s && s.ph, 'armed=', s && s.armed);

  // A) 纯 TouchEvent（模拟只投递 touch 事件的容器）
  const t = await p.evaluate(() => {
    var st = document.querySelector('.iv-stage'), r = st.getBoundingClientRect();
    var sx = r.left + r.width * 0.38, sy = r.top + r.height * 0.82;
    function T(x, y) { return new Touch({ identifier: 1, target: st, clientX: x, clientY: y }); }
    function fire(type, arr, ch) {
      st.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: arr, changedTouches: ch, targetTouches: arr }));
    }
    var a = T(sx, sy), c = T(sx + 180, sy - 120);
    fire('touchstart', [a], [a]); fire('touchmove', [c], [c]); fire('touchend', [], [c]);
    return window.TQM.cur.state();
  });
  console.log('[A 纯 touch 事件] ph=', t.ph, 'aim=', JSON.stringify(t.aim), '->', t.ph === 'fly' ? '有响应' : '无响应（投壶卡死）');

  // B) pointerType=touch 的 PointerEvent（模拟以 pointer 形式投递触摸的容器）
  const q = await p.evaluate(() => {
    var st = document.querySelector('.iv-stage'), r = st.getBoundingClientRect();
    var sx = r.left + r.width * 0.38, sy = r.top + r.height * 0.82;
    function P(type, x, y) {
      st.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 2, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    }
    P('pointerdown', sx, sy); P('pointermove', sx + 180, sy - 120); P('pointerup', sx + 180, sy - 120);
    return window.TQM.cur.state();
  });
  console.log('[B pointer(touch)] ph=', q.ph, '->', q.ph === 'fly' ? '有响应' : '无响应');

  // C) 拖动被当成滚动 -> pointercancel
  const r2 = await p.evaluate(() => {
    var st = document.querySelector('.iv-stage'), r = st.getBoundingClientRect();
    var sx = r.left + r.width * 0.38, sy = r.top + r.height * 0.82;
    function P(type, x, y) {
      st.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: 1 }));
    }
    P('pointerdown', sx, sy); P('pointermove', sx + 20, sy - 10); P('pointercancel', sx + 20, sy - 10);
    return window.TQM.cur.state();
  });
  console.log('[C 拖动被 pointercancel] ph=', r2.ph, '->', r2.ph === 'fly' ? '仍投出' : '手势作废（表现=拖不动）');
  console.log('pageerror=', JSON.stringify(errs.slice(0, 2)));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
