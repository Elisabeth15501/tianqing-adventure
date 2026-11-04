const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:51152/';

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

  const out = await frame.evaluate(async () => {
    const D = window.TQ_DATA;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const res = [];
    const games = [['shi_food', 'shifood'], ['shi_folk', 'shifolk'], ['shi_proof', 'proof']];
    for (const [cfgKey, rich] of games) {
      const wrap = document.createElement('div');
      wrap.className = 'iv rich';
      wrap.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:320px;opacity:0.01;z-index:-9999';
      const stage = document.createElement('div');
      stage.className = 'iv-stage';
      stage.style.cssText = 'position:relative;width:300px;height:210px';
      wrap.appendChild(stage); document.body.appendChild(wrap);
      const steps = [];
      const hooks = { step: (p, l) => steps.push({ p: +Number(p).toFixed(2), l: l || '' }), tip: (t) => steps.push({ tip: String(t).slice(0, 30) }), done: (m) => steps.push({ done: !!m }) };
      let err = null;
      try { window.TQM.play(rich, stage, D.iv[cfgKey], hooks); } catch (e) { err = String(e).slice(0, 120); }
      await wait(700);
      const svg = stage.querySelector('svg');
      let drag = 'no-svg';
      if (svg) {
        const r = svg.getBoundingClientRect();
        const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.56;
        function ev(type, x, y) { return new PointerEvent(type, { pointerType: 'touch', pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true, buttons: 1 }); }
        stage.dispatchEvent(ev('pointerdown', cx - 45, cy));
        for (let i = 0; i < 8; i++) {
          stage.dispatchEvent(ev('pointermove', cx + 45, cy)); await wait(40);
          stage.dispatchEvent(ev('pointermove', cx - 45, cy)); await wait(40);
        }
        stage.dispatchEvent(ev('pointerup', cx - 45, cy));
        drag = 'done';
      }
      await wait(500);
      const st = window.TQM.cur && window.TQM.cur.state ? window.TQM.cur.state() : null;
      res.push({ cfgKey, rich, err, drag, steps: steps.slice(0, 8), state: st });
      try { window.TQM.cur && window.TQM.cur.stop && window.TQM.cur.stop(); } catch (e) {}
      wrap.remove();
    }
    return res;
  });
  for (const r of out) console.log(JSON.stringify(r));
  console.log('CONSOLE', JSON.stringify(cons.slice(0, 10)));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
