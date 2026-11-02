/* _qa/shard_occ.js —— 拾得瓷片占台真机复现（390×844 · DPR2 · 触屏）
 *
 * 用途：玩家报「#11/#13/#15 在拾得界面不显示（上移出屏 / 素材缺失）」。
 * 本脚本走的是**真流程**（TQApp.shard = showShard 同一入口），只在前面把游戏推进到
 * 有 `.vn-doc` 的一幕，随后逐个打开占台，量三件事：
 *   ① 瓷片画布是否在可视区内（stage 的 top/bottom 与容器可视矩形相交）
 *   ② 画布是否真的画上了东西（取像素 alpha 非零的面积占比）
 *   ③ 占台整体是否需要滚动、按钮是否在屏内
 * 用法：node _qa/shard_occ.js [port]
 */
const { chromium } = require('playwright');
const PORT = process.argv[2] || '8931';
const OUT = process.env.TQ_OUT || '.';
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: +(process.env.TQ_VW || 390), height: +(process.env.TQ_VH || 844) },
    deviceScaleFactor: +(process.env.TQ_DPR || 2), isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92 Mobile Safari/537.36'
  });
  const page = await ctx.newPage();
  const errs = [];
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  /* 加载页有 10s 硬上限，等它退场再操作 */
  await page.waitForFunction(() => {
    const a = document.querySelector('.app');
    return a && !a.classList.contains('load');
  }, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(600);
  if (process.env.TQ_DUMP) {
    console.log('BUTTONS:', JSON.stringify(await page.evaluate(() =>
      [...document.querySelectorAll('button,.btn,[role=button]')].map(b => b.textContent.trim()).filter(Boolean))));
  }

  /* 进游戏：标题「入宫当值」→ 选角卡（女官/史官）→ 就位。用真实鼠标点，
     因为按钮的 handler 在父层、且 .btn 有 pointer 逻辑，element.click() 不触发。 */
  async function clickVisible(reSrc) {
    const box = await page.evaluate((src) => {
      const rx = new RegExp(src);
      const bs = [...document.querySelectorAll('button,.btn,[role=button]')].filter(x => rx.test(x.textContent || ''));
      for (const el of bs) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: (el.textContent || '').trim().slice(0, 12) }; }
      }
      return null;
    }, reSrc);
    if (!box) { return false; }
    await page.mouse.click(box.x, box.y);
    return true;
  }
  const STEPS = [/入宫当值/, /宫中女官/, /入宫当值/, /就位|开始|入席|继续|知道了/, /入宫当值/];
  for (let k = 0; k < 8; k += 1) {
    const ok = await page.evaluate(() => !!document.querySelector('.vn-doc'));
    if (ok) { break; }
    let hit = false;
    for (const re of STEPS) { if (await clickVisible(re.source)) { hit = true; break; } }
    if (!hit) { break; }
    await page.waitForTimeout(1100);
  }
  await page.waitForTimeout(600);

  const hasDoc = await page.evaluate(() => !!document.querySelector('.vn-doc'));
  console.log('vn-doc ready:', hasDoc);
  if (!hasDoc) {
    console.log('TITLE DUMP:', (await page.evaluate(() => document.body.innerHTML)).slice(0, 1200));
  }

  const ids = ['1', '11', '13', '15', '14', '16'];
  const report = {};
  for (const id of ids) {
    await page.evaluate(i => { window.TQApp && window.TQApp.shard(i); }, id);
    await page.waitForTimeout(1300);   /* 等素材 resolve（2s 超时前） */

    const m = await page.evaluate(() => {
      const wrap = document.querySelector('.shard-occ');
      if (!wrap) return { err: 'no .shard-occ' };
      const stage = wrap.querySelector('.shard-stage');
      const acts = wrap.querySelector('.shard-acts');
      const cv = stage && stage.querySelector('canvas');
      const card = wrap.querySelector('.shiliao');
      const r = e => e ? e.getBoundingClientRect() : null;
      const sr = r(stage), ar = r(acts), cr = r(card);
      const vh = window.innerHeight;
      let ink = 0, w = 0, h = 0;
      if (cv && cv.width) {
        w = cv.width; h = cv.height;
        try {
          const g = cv.getContext('2d');
          const d = g.getImageData(0, 0, w, h).data;
          let on = 0;
          for (let i = 3; i < d.length; i += 4 * 7) { if (d[i] > 8) on++; }
          ink = on / (d.length / (4 * 7));
        } catch (e) { ink = -1; }
      }
      return {
        stage: sr && { top: Math.round(sr.top), bottom: Math.round(sr.bottom), w: Math.round(sr.width), h: Math.round(sr.height) },
        card: cr && { top: Math.round(cr.top), bottom: Math.round(cr.bottom), h: Math.round(cr.height) },
        acts: ar && { top: Math.round(ar.top), bottom: Math.round(ar.bottom) },
        vh,
        canvas: cv ? { bw: w, bh: h, cssW: Math.round(cv.getBoundingClientRect().width), cssH: Math.round(cv.getBoundingClientRect().height), ink: +(ink * 100).toFixed(1), cls: cv.className } : null,
        scrollTop: (function (n) { while (n && n.scrollHeight <= n.clientHeight) n = n.parentNode; return n ? n.scrollTop : null; })(wrap),
        stageInView: sr ? (sr.bottom > 0 && sr.top < vh) : false,
        actsInView: ar ? (ar.bottom <= vh + 1 && ar.top > -1) : false
      };
    });
    report[id] = m;
    await page.screenshot({ path: `${OUT}/.shard_occ_${id}.png` });
    console.log(`#${id}`, JSON.stringify(m));
    await page.evaluate(() => { const b = [...document.querySelectorAll('.shard-acts .btn')].find(x => /收下/.test(x.textContent)); if (b) b.click(); });
    await page.waitForTimeout(350);
  }
  console.log('ERRORS:', errs.length ? errs.slice(0, 6) : 'none');
  console.log('HTTP>=400:', bad.length ? [...new Set(bad)].slice(0, 10) : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
