const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:55130/';
const SHOT = 'C:/Users/elisa/dev/tianqing-adventure/_qa/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const assets = [], httpErr = [], cons = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/assets\/(scenes|chars|shards)/.test(u)) assets.push({ u: u.replace(/^.*\/files\//, ''), s: r.status() });
    else if (r.status() >= 400) httpErr.push({ u: u.slice(0, 120), s: r.status() });
  });
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => cons.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);

  // 影子树内找可点元素（按文本精确匹配）
  async function findRect(text) {
    return await page.evaluate((txt) => {
      let hit = null;
      function walk(root) {
        root.querySelectorAll('*').forEach((el) => {
          if (hit) return;
          const t = (el.textContent || '').trim();
          if (t === txt) {
            const r = el.getBoundingClientRect();
            if (r.width > 4 && r.height > 4) { hit = { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }
          }
          if (el.shadowRoot) walk(el.shadowRoot);
        });
      }
      walk(document);
      return hit;
    }, text);
  }

  async function tap(text, shotName) {
    const r = await findRect(text);
    if (!r) { console.log('NOT FOUND', text); return false; }
    await page.mouse.click(r.x, r.y);
    console.log('TAP', text, Math.round(r.x), Math.round(r.y));
    await page.waitForTimeout(1300);
    if (shotName) await page.screenshot({ path: SHOT + shotName });
    return true;
  }

  await page.screenshot({ path: SHOT + '_wb2_0.png' });
  await tap('入宫当值', '_wb2_1.png');
  await tap('入宫当值', '_wb2_2.png');
  const ok = await tap('女官', '_wb2_3.png');
  if (!ok) { await tap('史官', '_wb2_3.png'); }
  await page.waitForTimeout(4500);
  await page.screenshot({ path: SHOT + '_wb2_4_act.png' });

  const info = await page.evaluate(() => {
    const imgs = [];
    function walk(root) {
      root.querySelectorAll('img').forEach((im) => imgs.push({ src: im.getAttribute('src'), nw: im.naturalWidth, nh: im.naturalHeight }));
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return {
      hasTQA: !!window.TQA,
      env: (window.TQA && window.TQA.env) || null,
      envNote: (window.TQA && window.TQA.envNote) ? window.TQA.envNote() : null,
      hasScenes: !!window.TQScenes,
      imgs: imgs
    };
  });

  console.log('=== INFO ==='); console.log(JSON.stringify(info, null, 1));
  console.log('=== ASSETS (status) ==='); console.log(JSON.stringify(assets.slice(0, 50)));
  console.log('=== HTTP>=400 ==='); console.log(JSON.stringify(httpErr.slice(0, 10)));
  console.log('=== CONSOLE ==='); console.log(JSON.stringify(cons.slice(0, 15)));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
