const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DELAY = parseInt(process.argv[2] || '2500', 10);
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  // 延迟 shard 内壁图，模拟慢网/首访
  await p.route('**/assets/shards/*.webp', async route => {
    if (/_inner\.webp/.test(route.request().url())) { await sleep(DELAY); }
    route.continue();
  });
  await p.goto('http://127.0.0.1:8931/', { waitUntil: 'load' }); await sleep(1500);

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
    await sleep(320);
  }
  // 完成小节；以「面板出现」为 t0
  for (let i = 0; i < 6; i++) {
    if (!(await has('.iv'))) break;
    await p.evaluate(() => { const iv = document.querySelector('.iv'); if (iv && iv._tqForce) iv._tqForce(); });
    await sleep(400);
  }
  let panelAt = null, firstAt = null, firstKind = null, cvAt = null;
  const t0 = Date.now();
  for (let i = 0; i < 400; i++) {
    const st = await p.evaluate(() => {
      const panel = document.querySelector('.shard-occ');
      const stage = document.querySelector('.shard-stage');
      const c = stage && stage.firstElementChild;
      return { panel: !!panel, child: c ? (c.tagName + '.' + (c.getAttribute('class') || '')) : null,
               canvas: !!(stage && stage.querySelector('canvas.shard-ll')) };
    });
    const now = Date.now() - t0;
    if (st.panel && panelAt === null) panelAt = now;
    if (st.child && firstAt === null) { firstAt = now; firstKind = st.child; }
    if (st.canvas && cvAt === null) { cvAt = now; break; }
    await sleep(25);
  }
  console.log(`[延迟 ${DELAY}ms] 面板 ${panelAt}ms | 首内容 ${firstAt}ms(${firstKind}) | 真图 ${cvAt}ms | 空窗 ${panelAt !== null && firstAt !== null ? firstAt - panelAt : 'n/a'}ms | 升级耗时 ${cvAt !== null && firstAt !== null ? cvAt - firstAt : 'n/a'}ms`);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
