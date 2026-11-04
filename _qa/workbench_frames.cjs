const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:55130/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);

  const frames = page.frames();
  console.log('frame count:', frames.length);
  for (const f of frames) {
    let info;
    try {
      info = await f.evaluate(() => {
        const imgs = Array.from(document.images || []).map((i) => ({ src: i.getAttribute('src'), nw: i.naturalWidth }));
        return {
          href: location.href.slice(0, 100),
          hasTQA: !!window.TQA,
          hasScenes: !!window.TQScenes,
          env: (window.TQA && window.TQA.env) || null,
          envNote: (window.TQA && window.TQA.envNote) ? window.TQA.envNote() : null,
          bodyText: ((document.body && document.body.innerText) || '').slice(0, 160),
          imgCount: imgs.length,
          imgs: imgs.slice(0, 6)
        };
      });
    } catch (e) { info = { err: String(e).slice(0, 100) }; }
    console.log('FRAME', JSON.stringify(info));
  }
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
