const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = 'file:///C:/Users/elisa/dev/tianqing-adventure/_qa/touhu_ptr_test.html';

async function run(pointerType, ministers, waitMs) {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto(BASE + '?ministers=' + ministers, { waitUntil: 'load' });
  await page.waitForTimeout(waitMs);
  const before = await page.evaluate(() => window.__state());
  let after = null;
  if (pointerType) { after = await page.evaluate((pt) => window.__drag(pt), pointerType); }
  await browser.close();
  return { pointerType, before, after };
}

(async () => {
  // A. 输入类型：空预演直达 aim，再拖
  for (const pt of ['touch', 'mouse', 'pen']) {
    const r = await run(pt, 0, 3000);
    console.log(JSON.stringify({
      test: 'input', pointerType: pt,
      before_ph: r.before && r.before.ph, before_armed: r.before && r.before.armed,
      after_ph: r.after && r.after.ph, threw: !!(r.after && r.after.ph === 'fly')
    }));
  }
  // B. AI 预演（1 位群臣）能否跑到玩家回合
  const r2 = await run(null, 1, 9000);
  console.log(JSON.stringify({
    test: 'prelude', ministers: 1,
    ph: r2.before && r2.before.ph, armed: r2.before && r2.before.armed,
    reachedAim: !!(r2.before && r2.before.ph === 'aim' && r2.before.armed)
  }));
})().catch((e) => { console.error(e); process.exit(1); });
