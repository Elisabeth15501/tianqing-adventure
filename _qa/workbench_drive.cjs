const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:55130/';
const SHOT = 'C:/Users/elisa/dev/tianqing-adventure/_qa/';

function shot(page, name) { return page.screenshot({ path: SHOT + name, fullPage: false }); }

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const assets = [], httpErr = [], cons = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/assets\/(scenes|chars|shards)/.test(u)) assets.push({ u: u.slice(0, 140), s: r.status() });
    else if (r.status() >= 400) httpErr.push({ u: u.slice(0, 140), s: r.status() });
  });
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => cons.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  await shot(page, '_wb_0_load.png');

  async function tap(text, label) {
    try {
      const loc = page.getByText(text, { exact: false }).first();
      await loc.waitFor({ state: 'visible', timeout: 8000 });
      await loc.click({ timeout: 4000 });
      console.log('CLICK OK', text);
    } catch (e) {
      console.log('CLICK FAIL', text, String(e).slice(0, 120));
      // 坐标兜底
      try { await page.mouse.click(535, 725); console.log('COORD CLICK 535,725'); } catch (_) {}
    }
    await page.waitForTimeout(1200);
    if (label) await shot(page, label);
  }

  await tap('入宫当值', '_wb_1_title.png');
  await tap('入宫当值', '_wb_2_role.png');
  await tap('女官', '_wb_3_act.png');
  await page.waitForTimeout(4000);
  await shot(page, '_wb_4_act_wait.png');

  const state = await page.evaluate(() => {
    function walk(root, out) {
      const all = root.querySelectorAll('*');
      for (const el of all) { if (el.shadowRoot) walk(el.shadowRoot, out); }
      return out;
    }
    const hosts = [];
    (function find(root) {
      root.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) { hosts.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')); find(el.shadowRoot); }
      });
    })(document);
    return { text: (document.documentElement.innerText || '').slice(0, 300), hosts };
  });

  console.log('=== STATE ==='); console.log(JSON.stringify(state));
  console.log('=== ASSET RESPONSES ==='); console.log(JSON.stringify(assets.slice(0, 40)));
  console.log('=== HTTP>=400 ==='); console.log(JSON.stringify(httpErr.slice(0, 20)));
  console.log('=== CONSOLE ERR ==='); console.log(JSON.stringify(cons.slice(0, 20)));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
