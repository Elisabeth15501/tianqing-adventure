const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PAGE = 'file:///C:/Users/elisa/dev/tianqing-adventure/_qa/touhu_ptr_test.html';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => ({
    TQM: typeof window.TQM,
    has: window.TQM ? window.TQM.has('touhu') : null,
    mg: window.__mg ? typeof window.__mg : String(window.__mg),
    mgState: window.__mg && window.__mg.state ? window.__mg.state() : null
  }));
  console.log('INFO', JSON.stringify(info));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
