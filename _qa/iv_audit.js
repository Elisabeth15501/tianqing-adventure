/* 小游戏接入核查：把 data.js 里所有 type:'iv' 的入口列出来，
   逐个在浏览器里挂一遍，确认入口/手势/内容都能起来。 */
const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newPage({ viewport: { width: 430, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForTimeout(1400);

  const rows = await page.evaluate(() => {
    const D = window.TQ_DATA, out = [];
    const walk = (node, act, scene) => {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(n => walk(n, act, scene)); return; }
      if (node.type === 'iv' && node.cfg) out.push({ cfg: node.cfg, act: act, where: scene });
      if (node.type === 'touhu') out.push({ cfg: 'touhu', act: act, where: scene, via: 'type:touhu' });
      Object.keys(node).forEach(k => { if (k !== 'type' && typeof node[k] === 'object') walk(node[k], act, scene); });
    };
    (D.acts || []).forEach((a, i) => walk(a, a.title || ('act' + i), ''));
    return out;
  });

  const seen = new Set();
  const uniq = rows.filter(r => { if (seen.has(r.cfg)) return false; seen.add(r.cfg); return true; });

  const res = [];
  for (const r of uniq) {
    const cfg = await page.evaluate(c => {
      const k = window.TQ_DATA.iv[c];
      return k ? { rich: k.rich || null, steps: (k.steps || []).length, labels: (k.steps || []).map(s => s.label), title: k.title } : null;
    }, r.cfg);
    let mount = { ok: false };
    if (cfg && cfg.rich) {
      mount = await page.evaluate(c => {
        /* 投壶整局靠 cfg.story 拿台词（app.js 的 runTouhu 也这么接），漏了就只有玩家两矢 */
        if (c === 'touhu') { window.TQ_DATA.iv.touhu.story = window.TQ_DATA.touhu; }
        document.querySelectorAll('.__probe').forEach(n => n.remove());
        const app = document.querySelector('.app') || document.body;
        const main = document.createElement('div');
        main.className = 'main __probe';
        main.style.cssText = 'height:640px;flex:0 0 auto;position:relative;z-index:99';
        app.appendChild(main);
        const F = window.F || window.TQF;
        try {
          main.appendChild(F.iv(main, window.TQ_DATA.iv[c], function () {}));
        } catch (e) { return { ok: false, err: e.message }; }
        const sv = main.querySelector('.iv-stage svg');
        const nodes = sv ? sv.querySelectorAll('*').length : 0;
        return { ok: !!sv && nodes > 8, nodes: nodes, tag: (main.querySelector('.step-tag') || {}).textContent,
                 cur: !!(window.TQM && window.TQM.cur) };
      }, r.cfg);
    }
    res.push({ cfg: r.cfg, title: cfg ? cfg.title : '—', rich: cfg ? cfg.rich : null,
      steps: cfg ? cfg.steps : 0, labels: cfg ? cfg.labels.join('/') : '', mount: mount });
    await sleep(120);
  }
  console.log('ERR', JSON.stringify(errs.slice(0, 3)));
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
