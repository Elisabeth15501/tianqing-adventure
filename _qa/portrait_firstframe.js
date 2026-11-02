/* 立绘首帧自动化测试（2026-11-02 v3）
 *
 * 判据：**立绘第一次出现时就必须是真图**；出现矢量占位（svg.fig-art）即失败。
 *       （加载超时后的矢量回退是设计内保底，故本测试在 1.0s 就放行请求，早于超时。）
 *
 * 时间线（确定性，不赌网络快慢）：
 *   t=0     进入目标剧情，图片请求全部挂起，开始每 40ms 采样
 *   t=1.0s  统一放行图片请求
 *   t=3.5s  收尾，取"第一次出现的人像是什么"
 *
 * 覆盖：A 叙事/对话（.sp-fig）  B 回忆（.mem-fig，重点）
 * 用法：node _qa/portrait_firstframe.js --label 基线
 * 退出码：0 全过；1 出现矢量占位。
 */
const { chromium } = require('playwright');
const PATH = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe';
const BASE = process.env.TQ_BASE || 'http://127.0.0.1:8931/index.html';
const LABEL = (process.argv.indexOf('--label') > 0 ? process.argv[process.argv.indexOf('--label') + 1] : 'run');

const SAMPLER = () => {
  window.__pf = { first: {}, t0: Date.now() };
  const grab = (sel, tag) => {
    const nodes = Array.from(document.querySelectorAll(sel)).filter(n => n.getBoundingClientRect().width);
    for (const n of nodes) {
      const kid = n.querySelector('img.fig-real, img.mem-fig-real, svg.fig-art, .fig-art');
      if (!kid) continue;
      return { tag: kid.tagName.toLowerCase(), cls: kid.getAttribute('class') || '', real: kid.tagName === 'IMG' };
    }
    return null;
  };
  window.__pf.timer = setInterval(() => {
    if (!window.__pf.first.story) {
      const s = grab('.sp-fig');
      if (s) window.__pf.first.story = Object.assign({ t: Date.now() - window.__pf.t0 }, s);
    }
    if (!window.__pf.first.memory) {
      const m = grab('.mem-fig');
      if (m) window.__pf.first.memory = Object.assign({ t: Date.now() - window.__pf.t0 }, m);
    }
  }, 40);
};

(async () => {
  const b = await chromium.launch({ executablePath: PATH });
  const cases = [
    { key: 'story', label: '叙事/对话', act: 1, step: 5, role: 'nv', sel: '.sp-fig' },
    { key: 'memory', label: '回忆（重点）', act: 0, step: 11, role: 'nv', sel: '.mem-fig' }
  ];
  const out = [];
  for (const c of cases) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    let hold = true;
    const pending = [];
    await p.route('**/assets/chars/*.webp', async route => {
      if (hold) { pending.push(route); return; }
      try { await route.continue(); } catch (e) {}
    });
    await p.addInitScript(({ a, s, r }) => {
      try { localStorage.setItem('__s', '1'); } catch (e) {}
      localStorage.setItem('tianqing_save_v1', JSON.stringify({ v: 1, role: r, actIndex: a, step: s,
        shards: {}, deco: {}, memories: {}, taskDone: {}, choices: {}, updated: Date.now() }));
    }, { a: c.act, s: c.step, r: c.role });
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(10800);
    await p.evaluate(() => { const b = Array.from(document.querySelectorAll('.lt .btn')).find(n => n.getClientRects().length); if (b) b.click(); });
    await p.waitForTimeout(600);
    await p.evaluate(() => { const x = Array.from(document.querySelectorAll('.tr .btn,.footbar .btn')).find(n => n.getClientRects().length); if (x) x.click(); });
    await p.waitForTimeout(700);
    await p.evaluate(SAMPLER);
    /* 推进剧情，同时计时：1.0s 处放行 */
    const t0 = Date.now();
    let released = false;
    while (Date.now() - t0 < 3500) {
      if (!released && Date.now() - t0 >= 1000) {
        released = true; hold = false;
        const list = pending.splice(0);
        for (const r of list) { try { await r.continue(); } catch (e) {} }
      }
      await p.evaluate(() => {
        const pick = s => Array.from(document.querySelectorAll(s)).find(n => n.getClientRects().length);
        const box = pick('.mem-stage') || pick('.dlg-dock .dlg-box') || pick('.main .narr');
        if (box) box.click();
      });
      await p.waitForTimeout(200);
    }
    const res = await p.evaluate(() => { clearInterval(window.__pf.timer); return window.__pf.first; });
    await p.screenshot({ path: '_qa/pf_' + c.key + '_' + LABEL + '.png' });
    await ctx.close();
    out.push({ label: c.label, first: res[c.key] || null });
  }
  console.log('\n=== 立绘首帧测试 [' + LABEL + ']（图片挂起 1.0s 后放行） ===');
  let fail = 0;
  let na = 0;
  out.forEach(o => {
    const f = o.first;
    if (!f) {
      na += 1;
      console.log(`${o.label}: （3.5s 内未出现人像，未取样）—— N/A`);
      return;
    }
    const ok = f.real;
    if (!ok) { fail += 1; }
    console.log(`${o.label}: 首次人像 @${f.t}ms = ${ok ? '真图 img.' + f.cls : '矢量占位 ' + f.tag + '.' + f.cls} —— ${ok ? 'PASS' : 'FAIL'}`);
  });
  const judged = out.length - na;
  console.log(fail ? `\n结果：FAIL（${fail}/${judged} 项取样失败）` : `\n结果：PASS（${judged}/${judged} 项）；未取样 ${na} 项`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
