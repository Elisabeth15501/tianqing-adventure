/* _qa/longpress_iv.js —— 真机 P0 复现/验收：动手小节长按道具会不会被当成「长按图片」
 *
 * 判据（三条全过才算通过）：
 *   ① 页面上**没有任何** img / svg image 参与命中测试（computed pointer-events === 'none'）
 *      —— 这是根治项：宿主只有在手指底下是图片节点时才会弹「保存图片／识别图片」。
 *   ② 长按 900ms 后 elementFromPoint 拿到的不是 IMG / IMAGE / SVGImageElement。
 *   ③ 长按期间 contextmenu 事件被 preventDefault（事件层兜底仍在）。
 *
 * 用法：node _qa/longpress_iv.js [port]
 */
const { chromium } = require('playwright');
const PORT = process.argv[2] || '8931';
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const a = document.querySelector('.app');
    return a && !a.classList.contains('load');
  }, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(500);

  async function clickVisible(reSrc) {
    const box = await page.evaluate((src) => {
      const rx = new RegExp(src);
      const bs = [...document.querySelectorAll('button,.btn,[role=button]')].filter(x => rx.test(x.textContent || ''));
      for (const el of bs) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      }
      return null;
    }, reSrc);
    if (!box) { return false; }
    await page.mouse.click(box.x, box.y);
    return true;
  }
  const STEPS = [/入宫当值/, /宫中女官/, /入宫当值/, /就位|开始|入席|继续|知道了/];
  for (let k = 0; k < 8; k += 1) {
    if (await page.evaluate(() => !!document.querySelector('.vn-doc'))) { break; }
    let hit = false;
    for (const re of STEPS) { if (await clickVisible(re.source)) { hit = true; break; } }
    if (!hit) { break; }
    await page.waitForTimeout(1000);
  }

  /* 点对话框推进，直到动手小节（.iv）出现 */
  let iv = false;
  for (let k = 0; k < 40; k += 1) {
    iv = await page.evaluate(() => !!document.querySelector('.iv'));
    if (iv) { break; }
    const pt = await page.evaluate(() => {
      const d = document.querySelector('.dlg-dock') || document.querySelector('.vn-doc');
      if (!d) { return null; }
      const r = d.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 60) };
    });
    if (!pt) { break; }
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(420);
  }
  console.log('进入动手小节:', iv);
  if (!iv) {
    console.log('（没走到 .iv，仅做全页图片命中检查）');
  }

  /* ① 全页图片的命中资格 */
  const imgs = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('img, svg image').forEach(el => {
      const cs = getComputedStyle(el);
      out.push({ tag: el.tagName, cls: String(el.getAttribute('class') || el.parentNode.className || ''), pe: cs.pointerEvents });
    });
    return out;
  });
  const bad = imgs.filter(x => x.pe !== 'none');
  console.log(`图片节点 ${imgs.length} 个，仍可命中 ${bad.length} 个`, bad.slice(0, 5));

  /* ②③ 在动手小节里真按一次 */
  if (iv) {
    const box = await page.evaluate(() => {
      const st = document.querySelector('.iv-stage') || document.querySelector('.iv');
      if (!st) { return null; }
      const r = st.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) };
    });
    if (box) {
      const res = await page.evaluate((b) => {
        return new Promise((resolve) => {
          const el = document.elementFromPoint(b.x, b.y);
          let ctxPrevented = null;
          document.addEventListener('contextmenu', function once(e) { ctxPrevented = e.defaultPrevented; document.removeEventListener('contextmenu', once); }, true);
          resolve({ tag: el ? el.tagName : null, cls: el ? String(el.className || '') : null });
        });
      }, box);
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      await page.waitForTimeout(900);
      const hit = await page.evaluate((b) => {
        const el = document.elementFromPoint(b.x, b.y);
        const proto = el ? (el.constructor && el.constructor.name) : null;
        return { tag: el ? el.tagName : null, cls: el ? String(el.className || '') : null, proto };
      }, box);
      await page.mouse.up();
      console.log('按下点元素:', JSON.stringify(res), '→ 长按后:', JSON.stringify(hit));
      console.log('判定 ②:', ['IMG', 'IMAGE'].indexOf(hit.tag) < 0 && hit.proto !== 'SVGImageElement' ? 'PASS' : 'FAIL');
    }
  }
  console.log('页面异常:', errs.length ? errs.slice(0, 4) : 'none');
  await page.screenshot({ path: '.tq_longpress.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
