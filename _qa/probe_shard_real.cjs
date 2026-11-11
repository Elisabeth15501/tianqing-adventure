const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const reqs = [];
  p.on('request', r => { if (/shards\//.test(r.url())) reqs.push({ f: r.url().split('/').pop(), t: Date.now() }); });
  await p.goto('http://127.0.0.1:8931/', { waitUntil: 'load' }); await sleep(1600);

  const tap = async m => {
    const box = await p.evaluate(m => {
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null && x.innerText.includes(m));
      if (!bs.length) return null; const r = bs[bs.length - 1].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, m);
    if (!box) return false; await p.mouse.click(box.x, box.y); await sleep(800); return true;
  };
  const has = s => p.evaluate(s => !!document.querySelector(s), s);

  await tap('入宫当值'); await tap('入宫当值'); await tap('女官');
  // 推进到动手小节
  for (let i = 0; i < 110; i++) {
    if (await has('.iv')) break;
    const clicked = await p.evaluate(() => {
      const names = ['收起差事帖', '收下瓷片', '知道了'];
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null);
      const hit = bs.find(x => names.some(n => x.innerText.trim() === n));
      if (hit) { hit.click(); return true; } return false;
    });
    if (clicked) { await sleep(650); continue; }
    const db = await p.evaluate(() => { const d = document.querySelector('.dlg-dock'); if (!d || d.offsetParent === null) return null; const r = d.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 30 }; });
    if (db) await p.mouse.click(db.x, db.y); else await p.keyboard.press('Space');
    await sleep(330);
  }
  // 强制完成小节，观察瓷片面板出现后的空窗
  const tClick = Date.now();
  for (let i = 0; i < 6; i++) {
    if (!(await has('.iv'))) break;
    await p.evaluate(() => { const iv = document.querySelector('.iv'); if (iv && iv._tqForce) iv._tqForce(); });
    await sleep(500);
  }
  let panelAt = null, stageAt = null, kind = null;
  for (let i = 0; i < 160; i++) {
    const st = await p.evaluate(() => {
      const panel = document.querySelector('.shard-occ');
      const stage = document.querySelector('.shard-stage');
      if (!stage) return { panel: !!panel, child: null };
      const c = stage.firstElementChild;
      return { panel: !!panel, child: c ? (c.tagName + '.' + (c.getAttribute('class') || '')) : null };
    });
    const now = Date.now() - tClick;
    if (st.panel && panelAt === null) panelAt = now;
    if (st.child && stageAt === null) { stageAt = now; kind = st.child; break; }
    await sleep(25);
  }
  console.log('瓷片面板出现(ms):', panelAt, '| 舞台首个内容(ms):', stageAt, '| 类型:', kind);
  console.log('空窗时长(ms):', (panelAt !== null && stageAt !== null) ? (stageAt - panelAt) : 'n/a');
  console.log('shard 请求:', JSON.stringify(reqs.slice(0, 5).map(r => r.f)));
  console.log('errors:', errs.slice(0, 3));
  await p.screenshot({ path: '_qa/shard_real.png' });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
