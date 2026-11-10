const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:8931/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const role = process.argv[2] || '女官';

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(URL, { waitUntil: 'load' }); await sleep(1700);

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
  const txt = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  const tag = () => p.evaluate(() => { const t = document.querySelector('.iv .step-tag'); return t ? t.textContent.trim() : null; });
  const hasIv = () => p.evaluate(() => !!document.querySelector('.iv'));
  const rect = () => p.evaluate(() => { const s = document.querySelector('.iv-stage'); const r = s.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });

  await clickVisible('入宫当值'); await clickVisible('入宫当值'); await clickVisible(role);
  let found = false;
  for (let i = 0; i < 90; i++) {
    if (await hasIv()) { found = true; break; }
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
  if (!found) { console.log('未进入小节'); await b.close(); return; }
  console.log('进入:', await tag());

  let R = await rect();
  // 揉面 3 下
  for (let k = 0; k < 3; k++) {
    await p.mouse.move(R.x + R.w / 2, R.y + R.h * 0.6);
    await p.mouse.down(); await sleep(1100); await p.mouse.up(); await sleep(450);
  }
  console.log('揉面后:', await tag()); await p.screenshot({ path: '_qa/beat2_gan.png' });

  // 擀面：纵向推到底，最多 8 次
  for (let k = 0; k < 8; k++) {
    if (!(await tag() || '').includes('擀面')) break;
    const s = await txt();
    const m = /已擀 (\d)/.exec(s);
    if (m && +m[1] >= 3) break;
    R = await rect();
    await p.mouse.move(R.x + R.w / 2, R.y + R.h * 0.26);
    await p.mouse.down();
    for (let t = 1; t <= 6; t++) { await p.mouse.move(R.x + R.w / 2, R.y + R.h * (0.26 + 0.09 * t)); await sleep(28); }
    await p.mouse.move(R.x + R.w / 2, R.y + R.h * 0.80); await sleep(60);
    await p.mouse.up(); await sleep(420);
  }
  console.log('擀面后:', await tag(), '|', (await txt()).slice(-90));
  await p.screenshot({ path: '_qa/beat3_qie.png' });

  // 切面：两刀（已验证 0.5 / 0.4 可成）
  for (const fx of [0.4, 0.6]) {
    if (!(await tag() || '').includes('切面')) break;
    R = await rect();
    await p.mouse.move(R.x + R.w * fx, R.y + R.h * 0.34);
    await p.mouse.down();
    for (let t = 1; t <= 8; t++) { await p.mouse.move(R.x + R.w * fx, R.y + R.h * (0.34 + 0.06 * t)); await sleep(26); }
    await p.mouse.move(R.x + R.w * fx, R.y + R.h * 0.84); await sleep(60);
    await p.mouse.up(); await sleep(600);
  }
  await sleep(800);

  const info = await p.evaluate(() => {
    const sheet = document.querySelector('.mg-sheet');
    const go = document.querySelector('.mg-sheet-go');
    if (!sheet || !go) return { sheet: false };
    const sr = sheet.getBoundingClientRect(), gr = go.getBoundingClientRect();
    const cx = gr.x + gr.width / 2, cy = gr.y + gr.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      sheet: true,
      sheetRect: { x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) },
      goRect: { x: Math.round(gr.x), y: Math.round(gr.y), w: Math.round(gr.width), h: Math.round(gr.height) },
      vh: innerHeight,
      topEl: top ? (top.className || top.tagName) : null,
      goIsTop: top === go || (top && go.contains(top)),
      goZ: getComputedStyle(go).zIndex, sheetZ: getComputedStyle(sheet).zIndex
    };
  });
  console.log('完成面板:', JSON.stringify(info));

  if (info.sheet) {
    const gr = info.goRect;
    await p.mouse.click(gr.x + gr.w / 2, gr.y + gr.h / 2);
    await sleep(1000);
    console.log('点「继续」后 → iv:', await hasIv(), '| tag:', await tag());
    console.log('末态:', (await txt()).slice(-120));
  }
  console.log('末态(无条件):', (await txt()).slice(-110));
  await p.screenshot({ path: '_qa/sheet_after_click.png' });
  console.log('errors:', errs.slice(0, 5));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
