const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:55130/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  const frame = page.frames().find((f) => /\/app\//.test(f.url()));
  if (!frame) { console.log('NO FRAME'); await browser.close(); return; }

  const r = await frame.evaluate(async () => {
    function wait(ms) { return new Promise((x) => setTimeout(x, ms)); }
    const m = document.createElement('div');
    m.style.cssText = 'width:300px;height:300px;position:fixed;left:0;top:0;opacity:0.01;pointer-events:none';
    document.body.appendChild(m);
    let err = null;
    try { window.F.spin3d(m, 'vessel'); } catch (e) { err = String(e).slice(0, 120); }
    await wait(1500);
    const cv = m.querySelector('canvas');
    let ink = 0, w = 0, h = 0;
    if (cv) {
      w = cv.width; h = cv.height;
      try { const d = cv.getContext('2d').getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 4000) { if (d[i]) ink++; } } catch (e) {}
    }
    const vec = !!m.querySelector('.vessel-vec');
    const tq = m.__tq ? m.__tq() : null;
    return { err, hasCanvas: !!cv, w, h, ink, vecFallback: vec, tq, reg: !!(window.TQA && TQA.reg && TQA.reg['vessel-LL']) };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
