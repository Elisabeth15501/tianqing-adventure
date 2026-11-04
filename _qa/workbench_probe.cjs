const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:55130/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const failed = [], httpErr = [], cons = [];
  page.on('requestfailed', (r) => failed.push({ url: r.url().slice(0, 160), err: r.failure() && r.failure().errorText }));
  page.on('response', (r) => { if (r.status() >= 400) httpErr.push({ url: r.url().slice(0, 160), status: r.status() }); });
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => cons.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);

  const info = await page.evaluate(() => ({
    title: document.title,
    iframes: Array.from(document.querySelectorAll('iframe')).map((f) => f.src || f.getAttribute('src')),
    bodyText: (document.body.innerText || '').slice(0, 400)
  }));
  await page.screenshot({ path: 'C:/Users/elisa/dev/tianqing-adventure/_qa/_workbench.png', fullPage: false });
  console.log('=== INFO ==='); console.log(JSON.stringify(info, null, 1));
  console.log('=== FAILED ==='); console.log(JSON.stringify(failed.slice(0, 20)));
  console.log('=== HTTP>=400 ==='); console.log(JSON.stringify(httpErr.slice(0, 30)));
  console.log('=== CONSOLE ERR ==='); console.log(JSON.stringify(cons.slice(0, 20)));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
