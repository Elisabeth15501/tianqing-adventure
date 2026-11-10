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
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await p.goto(URL, { waitUntil: 'load' }); await sleep(1700);

  async function clickVisible(match) {
    const box = await p.evaluate(m => {
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null && x.innerText.includes(m));
      if (!bs.length) return null;
      const r = bs[bs.length - 1].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, match);
    if (!box) return false;
    await p.mouse.click(box.x, box.y);
    await sleep(900); return true;
  }
  const state = () => p.evaluate(() => {
    const iv = document.querySelector('.iv');
    const tag = document.querySelector('.iv .step-tag');
    const hint = document.querySelector('.iv-hint');
    const dock = document.querySelector('.dlg-dock');
    return {
      iv: !!iv, tag: tag ? tag.textContent.trim() : null,
      hint: hint ? hint.textContent.trim().slice(0, 40) : null,
      dock: dock ? dock.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : null,
      body: document.body.innerText.replace(/\s+/g, ' ').trim().slice(-70)
    };
  });

  await clickVisible('入宫当值'); await clickVisible('入宫当值');
  await clickVisible(role);
  await sleep(600);
  console.log('选角后:', JSON.stringify(await state()));

  let found = false;
  for (let i = 0; i < 80; i++) {
    const s = await state();
    if (s.iv) { found = true; console.log(`第 ${i} 次推进后进入动手小节:`, JSON.stringify(s)); break; }
    // 夹在中间的瓷片卡/问答：先点掉再继续
    const clicked = await p.evaluate(() => {
      const names = ['收起差事帖', '收下瓷片', '知道了', '继续'];
      const bs = [...document.querySelectorAll('button,.btn')].filter(x => x.offsetParent !== null);
      const hit = bs.find(x => names.some(n => x.innerText.trim() === n));
      if (hit) { hit.click(); return hit.innerText.trim(); }
      return null;
    });
    if (clicked) { console.log(`  [第${i}轮] 点掉「${clicked}」`); await sleep(600); continue; }
    // 优先点对话区（真机就是轻点继续），没有就空格
    const db = await p.evaluate(() => {
      const d = document.querySelector('.dlg-dock');
      if (!d || d.offsetParent === null) return null;
      const r = d.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 40) };
    });
    if (db) { await p.mouse.click(db.x, db.y); } else { await p.keyboard.press('Space'); }
    await sleep(360);
    if (i % 10 === 9) { const q = await state(); console.log(`  [${i}] dock=${(q.dock || '').slice(0, 30)}`); }
  }
  if (!found) { console.log('未进入动手小节，末态:', JSON.stringify(await state())); await b.close(); return; }

  const rect = await p.evaluate(() => {
    const st = document.querySelector('.iv-stage'); const r = st.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height * 0.6, w: r.width, h: r.height };
  });
  console.log('舞台:', JSON.stringify(rect));

  // 揉面：按住到圈满再松，重复 3 次
  for (let k = 1; k <= 3; k++) {
    await p.mouse.move(rect.x, rect.y);
    await p.mouse.down();
    await sleep(1100);
    await p.mouse.up();
    await sleep(500);
    console.log(`第 ${k} 次按压后:`, JSON.stringify(await state()));
  }

  await sleep(800);
  console.log('--- 三下之后 ---');
  console.log('状态:', JSON.stringify(await state()));

  // 再按空格，看剧情是否推进
  const before = (await state()).body;
  await p.keyboard.press('Space'); await sleep(900);
  const after = (await state()).body;
  console.log('空格后是否变化:', before !== after, '\n before:', before, '\n after:', after);
  await p.screenshot({ path: `_qa/flow_block_${role}.png`, fullPage: false });
  console.log('errors:', errs.slice(0, 6));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
