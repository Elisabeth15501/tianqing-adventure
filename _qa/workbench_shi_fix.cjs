const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:61248/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  const frame = page.frames().find((f) => /\/app\//.test(f.url()));
  if (!frame) { console.log('NO FRAME'); await browser.close(); return; }

  const out = await frame.evaluate(async () => {
    const D = window.TQ_DATA;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const res = [];
    function mount(rich, cfgKey) {
      const wrap = document.createElement('div');
      wrap.className = 'iv rich';
      wrap.style.cssText = 'position:fixed;left:0;top:0;width:320px;height:320px;opacity:0.01;z-index:-9999';
      const stage = document.createElement('div');
      stage.className = 'iv-stage';
      stage.style.cssText = 'position:relative;width:300px;height:210px';
      wrap.appendChild(stage); document.body.appendChild(wrap);
      const steps = [];
      const hooks = { step: (p, l) => steps.push({ p: +Number(p).toFixed(2), l: l || '' }), tip: () => {}, done: () => steps.push({ done: 1 }) };
      window.TQM.play(rich, stage, D.iv[cfgKey], hooks);
      return { wrap, stage, steps };
    }
    function ev(type, x, y) { return new PointerEvent(type, { pointerType: 'touch', pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true, buttons: 1 }); }
    function rectOf(stage) { const s = stage.querySelector('svg'); return s.getBoundingClientRect(); }

    // 1) 食单：砚池左右往返
    {
      const g = mount('shifood', 'shi_food'); await wait(600);
      const r = rectOf(g.stage); const y = r.top + 120;
      g.stage.dispatchEvent(ev('pointerdown', r.left + 110, y));
      for (let i = 0; i < 8; i++) { g.stage.dispatchEvent(ev('pointermove', r.left + 190, y)); await wait(35); g.stage.dispatchEvent(ev('pointermove', r.left + 110, y)); await wait(35); }
      g.stage.dispatchEvent(ev('pointerup', r.left + 110, y));
      await wait(300);
      res.push({ test: 'shifood', state: window.TQM.cur.state(), steps: g.steps.slice(-2) });
      window.TQM.cur.stop(); g.wrap.remove();
    }
    // 2) 民俗：向左拖三趟看三段
    {
      const g = mount('shifolk', 'shi_folk'); await wait(600);
      const r = rectOf(g.stage); const y = r.top + 110;
      for (let k = 0; k < 3; k++) {
        g.stage.dispatchEvent(ev('pointerdown', r.left + 285, y));
        for (let x = 285; x >= 15; x -= 15) { g.stage.dispatchEvent(ev('pointermove', r.left + x, y)); await wait(12); }
        g.stage.dispatchEvent(ev('pointerup', r.left + 15, y));
        await wait(120);
      }
      await wait(300);
      res.push({ test: 'shifolk', state: window.TQM.cur.state(), steps: g.steps.slice(-3) });
      window.TQM.cur.stop(); g.wrap.remove();
    }
    // 3) 校字：右拖→回抖→再右拖→松手（应单调不回退）
    {
      const g = mount('proof', 'shi_proof'); await wait(600);
      const r = rectOf(g.stage); const y = r.top + 110;
      g.stage.dispatchEvent(ev('pointerdown', r.left + 80, y));
      g.stage.dispatchEvent(ev('pointermove', r.left + 200, y)); await wait(40);
      const mid = window.TQM.cur.state().pulled;
      g.stage.dispatchEvent(ev('pointermove', r.left + 150, y)); await wait(40);
      const afterJiggle = window.TQM.cur.state().pulled;
      g.stage.dispatchEvent(ev('pointermove', r.left + 240, y)); await wait(40);
      g.stage.dispatchEvent(ev('pointerup', r.left + 240, y));
      await wait(300);
      res.push({ test: 'proof', mid, afterJiggle, state: window.TQM.cur.state(), steps: g.steps.slice(-2) });
      window.TQM.cur.stop(); g.wrap.remove();
    }
    return res;
  });
  for (const r of out) console.log(JSON.stringify(r));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
