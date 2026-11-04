const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:65105/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const cons = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') cons.push(m.type() + ': ' + m.text().slice(0, 140)); });
  page.on('pageerror', (e) => cons.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  const frame = page.frames().find((f) => /\/app\//.test(f.url()));
  if (!frame) { console.log('NO FRAME'); await browser.close(); return; }

  const res = await frame.evaluate(async () => {
    const keys = ['s1_wanshou', 's2_guangde', 's3_banquet', 's4_pano', 's5_zide', 's6_yujin', 's7_cixin'];
    const out = [];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const k of keys) {
      for (const form of ['v', 'h']) {
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:844px;opacity:0.01;pointer-events:none;z-index:-9999';
        document.body.appendChild(host);
        let err = null, inst = null;
        try { inst = window.TQScenes.mount(host, k, { form: form, input: 'auto' }); } catch (e) { err = String(e).slice(0, 120); }
        await wait(1400);
        const imgs = Array.from(host.querySelectorAll('img')).map((i) => ({ f: (i.getAttribute('src') || '').split('/').slice(-1)[0], nw: i.naturalWidth }));
        out.push({ k, form, err, imgs });
        try { if (inst && inst.destroy) inst.destroy(); } catch (e) {}
        host.remove();
      }
    }
    // spin3d
    const m = document.createElement('div');
    m.style.cssText = 'width:300px;height:300px;position:fixed;left:0;top:0;opacity:0.01;pointer-events:none';
    document.body.appendChild(m);
    let spinErr = null;
    try { window.F.spin3d(m, 'vessel'); } catch (e) { spinErr = String(e).slice(0, 100); }
    await wait(1400);
    const cv = m.querySelector('canvas');
    let ink = 0;
    if (cv) { try { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4000) { if (d[i]) ink++; } } catch (e) {} }
    const spin = { err: spinErr, hasCanvas: !!cv, ink: ink, vecFallback: !!m.querySelector('.vessel-vec'), tq: m.__tq ? m.__tq().kind : null };
    return { scenes: out, spin, version: (window.TQ_VERSION && window.TQ_VERSION.ver) || null };
  });

  let bad = 0;
  for (const s of res.scenes) {
    const b = s.imgs.filter((i) => !i.nw).length; bad += b;
    console.log(`${s.k} [${s.form}] imgs=${s.imgs.length} bad=${b}${s.err ? ' ERR=' + s.err : ''}`);
  }
  console.log('VERSION', res.version, '| totalBad', bad);
  console.log('3D', JSON.stringify(res.spin));
  console.log('CONSOLE', JSON.stringify(cons.slice(0, 12)));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
