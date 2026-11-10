const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function drive(b, role) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8931/', { waitUntil: 'load' }); await sleep(1600);

  const tapDock = async () => {
    const db = await p.evaluate(() => { const d = document.querySelector('.dlg-dock'); if (!d || d.offsetParent === null) return null; const r = d.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 30 }; });
    if (db) { await p.mouse.click(db.x, db.y); return 'dock'; }
    await p.keyboard.press('Space'); return 'space';
  };
  const clickBtn = async m => {
    const box = await p.evaluate(m => {
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null && x.innerText.includes(m));
      if (!bs.length) return null; const r = bs[bs.length - 1].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, m);
    if (!box) return false; await p.mouse.click(box.x, box.y); await sleep(800); return true;
  };
  const tag = () => p.evaluate(() => { const t = document.querySelector('.iv .step-tag'); return t ? t.textContent.trim() : null; });
  const hasIv = () => p.evaluate(() => !!document.querySelector('.iv'));
  const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());

  await clickBtn('入宫当值'); await clickBtn('入宫当值'); await clickBtn(role);

  let entered = null;
  for (let i = 0; i < 110; i++) {
    if (await hasIv()) { entered = await tag(); break; }
    const done = await p.evaluate(() => {
      const names = ['收起差事帖', '收下瓷片', '知道了'];
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null);
      const hit = bs.find(x => names.some(n => x.innerText.trim() === n));
      if (hit) { hit.click(); return hit.innerText.trim(); } return null;
    });
    if (done) { await sleep(650); continue; }
    await tapDock(); await sleep(330);
  }
  if (!entered) { const t = await body(); await ctx.close(); return { role, entered: false, tail: t.slice(-80), errs }; }

  // 稳定完成这一小节（3 拍）
  let forced = 0;
  for (let i = 0; i < 12; i++) {
    if (!(await hasIv())) break;
    const ok = await p.evaluate(() => { const iv = document.querySelector('.iv'); if (!iv || typeof iv._tqForce !== 'function') return false; iv._tqForce(); return true; });
    if (!ok) break;
    forced++; await sleep(600);
  }
  const afterIv = { iv: await hasIv(), tag: await tag(), body: (await body()).slice(-90) };

  // 继续推进 8 次，看是否出现新内容
  let moved = 0; const seen = [];
  for (let i = 0; i < 8; i++) {
    const before = (await body()).slice(-80);
    await tapDock(); await sleep(420);
    const now = (await body()).slice(-80);
    if (now !== before) { moved++; seen.push(now.slice(-30)); }
  }
  const tail = (await body()).slice(-120);
  await ctx.close();
  return { role, entered, forced, afterIv, moved, tail, errs };
}

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  for (const role of ['女官', '史官']) {
    const r = await drive(b, role);
    console.log(`\n=== ${role} ===`);
    console.log(JSON.stringify(r, null, 1).slice(0, 700));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
