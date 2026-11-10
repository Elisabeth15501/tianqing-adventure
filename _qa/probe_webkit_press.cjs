const { webkit } = require('playwright');
const URL = 'http://127.0.0.1:8931/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' }); await sleep(2000);

  async function clickVisible(match) {
    const box = await p.evaluate(m => {
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null && x.innerText.includes(m));
      if (!bs.length) return null;
      const r = bs[bs.length - 1].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, match);
    if (!box) return false;
    await p.mouse.click(box.x, box.y); await sleep(900); return true;
  }
  const hasIv = () => p.evaluate(() => !!document.querySelector('.iv'));
  const st = () => p.evaluate(() => {
    const t = document.querySelector('.iv .step-tag');
    const h = document.querySelector('.iv-hint');
    const s = window.getSelection();
    return { tag: t && t.textContent.trim(), hint: h && h.textContent.slice(0, 30),
             sel: s ? s.toString().slice(0, 40) : '',
             body: document.body.innerText.replace(/\s+/g, ' ').slice(-60) };
  });

  await clickVisible('入宫当值'); await clickVisible('入宫当值'); await clickVisible('女官');
  for (let i = 0; i < 90; i++) {
    if (await hasIv()) break;
    const clicked = await p.evaluate(() => {
      const names = ['收起差事帖', '收下瓷片', '知道了'];
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null);
      const hit = bs.find(x => names.some(n => x.innerText.trim() === n));
      if (hit) { hit.click(); return true; } return false;
    });
    if (clicked) { await sleep(600); continue; }
    const db = await p.evaluate(() => { const d = document.querySelector('.dlg-dock'); if (!d || d.offsetParent === null) return null; const r = d.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 30 }; });
    if (db) await p.mouse.click(db.x, db.y); else await p.keyboard.press('Space');
    await sleep(340);
  }
  console.log('进入:', JSON.stringify(await st()));

  const R = await p.evaluate(() => { const s = document.querySelector('.iv-stage'); const r = s.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  for (let k = 1; k <= 3; k++) {
    await p.mouse.move(R.x + R.w / 2, R.y + R.h * 0.6);
    await p.mouse.down();
    await sleep(1200);
    const during = await st();
    await p.mouse.up(); await sleep(500);
    const after = await st();
    console.log(`第${k}下 | 按住时 sel=「${during.sel}」 | 松手后 tag=${after.tag} body=…${after.body.slice(-40)}`);
  }
  console.log('errors:', errs.slice(0, 4));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
