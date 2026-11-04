const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:55130/';
const SHOT = 'C:/Users/elisa/dev/tianqing-adventure/_qa/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const assets = [], cons = [];
  page.on('response', (r) => { const u = r.url(); if (/assets\/(scenes|chars|shards)/.test(u)) assets.push({ u: u.replace(/^.*\/files\//, ''), s: r.status() }); });
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);

  const frame = page.frames().find((f) => /\/app\//.test(f.url()));
  if (!frame) { console.log('NO GAME FRAME'); await browser.close(); return; }
  console.log('GAME FRAME', frame.url().slice(0, 90));

  async function clickText(t, wait = 1500) {
    for (let i = 0; i < 25; i++) {
      const ok = await frame.evaluate((txt) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find((x) => (x.textContent || '').trim().indexOf(txt) >= 0 && !x.disabled);
        if (b) { b.click(); return true; }
        const any = Array.from(document.querySelectorAll('*')).find((x) => x.children.length === 0 && (x.textContent || '').trim() === txt);
        if (any) { any.click(); return true; }
        return false;
      }, t);
      if (ok) { console.log('CLICK', t); await page.waitForTimeout(wait); return true; }
      await page.waitForTimeout(300);
    }
    console.log('MISS', t);
    return false;
  }

  await clickText('入宫当值');
  await clickText('入宫当值');
  await clickText('女官', 2500);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: SHOT + '_wf_act.png' });

  const info = await frame.evaluate(() => ({
    env: window.TQA && window.TQA.env,
    envNote: (window.TQA && window.TQA.envNote) ? window.TQA.envNote() : null,
    stage: document.querySelector('.tqs-stage') ? document.querySelector('.tqs-stage').className : null,
    bgScene: !!document.querySelector('.bg-scene'),
    bgArt: !!document.querySelector('.bg-art.wash'),
    imgs: Array.from(document.querySelectorAll('img')).map((i) => ({ src: i.getAttribute('src'), nw: i.naturalWidth, nh: i.naturalHeight }))
  }));
  console.log('=== INFO ==='); console.log(JSON.stringify(info, null, 1));
  console.log('=== ASSETS total:', assets.length, 'non200:', assets.filter(a => a.s !== 200).length, '===');
  console.log('=== SCENE ASSETS sample ==='); console.log(JSON.stringify(assets.filter(a => /scenes/.test(a.u)).slice(0, 12)));
  console.log('=== CONSOLE ==='); console.log(JSON.stringify(cons.slice(0, 15)));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
