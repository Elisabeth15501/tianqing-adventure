const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:55130/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const cons = [];
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => cons.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  const frame = page.frames().find((f) => /\/app\//.test(f.url()));
  if (!frame) { console.log('NO FRAME'); await browser.close(); return; }

  const res = await frame.evaluate(async () => {
    const keys = ['s1_wanshou', 's2_guangde', 's3_banquet', 's4_pano', 's5_zide', 's6_yujin', 's7_cixin'];
    const out = [];
    function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
    for (const k of keys) {
      for (const form of ['v', 'h']) {
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;opacity:0.01;pointer-events:none;z-index:-9999';
        document.body.appendChild(host);
        let err = null, inst = null;
        try { inst = window.TQScenes.mount(host, k, { form: form, input: 'auto' }); } catch (e) { err = String(e).slice(0, 120); }
        await wait(1500);
        const imgs = Array.from(host.querySelectorAll('img')).map((i) => ({
          f: (i.getAttribute('src') || '').split('/').slice(-1)[0], nw: i.naturalWidth
        }));
        out.push({ k, form, err, imgs });
        try { if (inst && inst.destroy) inst.destroy(); } catch (e) {}
        host.remove();
      }
    }
    // 3D 图集
    let vll = null;
    try {
      const ent = window.TQA && TQA.reg && TQA.reg['vessel-LL'];
      if (ent && ent.src) {
        vll = await new Promise((r) => {
          const im = new Image();
          im.onload = () => r({ src: ent.src.split('/').slice(-1)[0], nw: im.naturalWidth });
          im.onerror = () => r({ src: ent.src.split('/').slice(-1)[0], nw: 0 });
          im.src = ent.src;
        });
      }
    } catch (e) { vll = { err: String(e).slice(0, 100) }; }
    return { scenes: out, vll: vll, hasF: !!(window.F && window.F.spin3d) };
  });

  console.log('=== SCENE MATRIX ===');
  for (const s of res.scenes) {
    const bad = s.imgs.filter((i) => !i.nw);
    console.log(`${s.k} [${s.form}] imgs=${s.imgs.length} bad=${bad.length} ${s.err ? 'ERR=' + s.err : ''} ${JSON.stringify(s.imgs)}`);
  }
  console.log('=== 3D ===', JSON.stringify(res.vll), 'hasSpin3d=', res.hasF);
  console.log('=== CONSOLE ===', JSON.stringify(cons.slice(0, 10)));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
