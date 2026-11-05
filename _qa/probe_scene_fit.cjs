const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'file:///C:/Users/elisa/dev/tianqing-adventure/index.html';

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => window.TQApp && typeof window.TQApp.fitScene === 'function', { timeout: 15000 });

  // A) 首帧 clientWidth=0，300ms 后恢复布局
  const a = await p.evaluate(async () => {
    const app = document.querySelector('.app');
    const host = document.createElement('div');
    host.className = 'bg-scene';
    app.appendChild(host);
    const real = app.clientWidth;
    Object.defineProperty(app, 'clientWidth', { configurable: true, get: () => 0 });
    window.TQApp.fitScene(host, 's2_guangde', 'v');
    await new Promise(r => setTimeout(r, 300));
    const during = { w: host.style.width, h: host.style.height };
    delete app.clientWidth;                 // 恢复原型 getter
    await new Promise(r => setTimeout(r, 1500));
    const after = { w: host.style.width, h: host.style.height };
    const px = s => parseInt(s || '0', 10) || 0;
    host.parentNode.removeChild(host);
    return { real, during, after, ok: px(after.w) > 200 && px(after.h) > 400 && px(during.w) !== 2 };
  });

  // B) clientWidth 始终为 0：应在 ~1.2s 后用 innerWidth/innerHeight 兜底，仍不是 2×1
  const c = await p.evaluate(async () => {
    const app = document.querySelector('.app');
    const host = document.createElement('div');
    app.appendChild(host);
    Object.defineProperty(app, 'clientWidth', { configurable: true, get: () => 0 });
    Object.defineProperty(app, 'clientHeight', { configurable: true, get: () => 0 });
    window.TQApp.fitScene(host, 's2_guangde', 'v');
    await new Promise(r => setTimeout(r, 2200));
    const out = { w: host.style.width, h: host.style.height };
    delete app.clientWidth; delete app.clientHeight;
    host.parentNode.removeChild(host);
    const px = s => parseInt(s || '0', 10) || 0;
    return { out, ok: px(out.w) > 200 && px(out.h) > 400 };
  });

  console.log('[A 首帧 0 → 恢复]', JSON.stringify(a), a.ok ? 'PASS' : 'FAIL');
  console.log('[B 持续 0 → 视口兜底]', JSON.stringify(c), c.ok ? 'PASS' : 'FAIL');
  console.log('pageerror=', JSON.stringify(errs.slice(0, 3)));
  await b.close();
  if (!a.ok || !c.ok) { process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
