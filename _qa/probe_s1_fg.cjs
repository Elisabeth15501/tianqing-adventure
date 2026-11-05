const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:8951/_qa/s1_fg_probe.html';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  const r = await p.evaluate(async () => {
    // 该页已加载 scenes.js；造一个舞台容器
    const stage = document.getElementById('stage');

    window.TQScenes.base = '../';   // 探针页在 _qa/ 下，资源实际在仓库根
    const noFg = window.TQScenes.mount(stage, 's1_wanshou', { form: 'v' });
    await new Promise(r => setTimeout(r, 400));
    const before = stage.querySelectorAll('.tqs-solo-fgimg').length;
    noFg.destroy();

    // 临时给配置补一个 fg（模拟资产到位），验证接入位
    const orig = window.TQScenes.form;
    window.TQScenes.form = function (k, f) {
      const c = orig.call(window.TQScenes, k, f);
      if (k === 's1_wanshou' && c && c.files) { c.files.fg = 'assets/scenes/s2_guangde/l5v.webp'; }
      return c;
    };
    const withFg = window.TQScenes.mount(stage, 's1_wanshou', { form: 'v' });
    await new Promise(r => setTimeout(r, 600));
    const el = stage.querySelector('.tqs-solo-fgimg');
    const after = stage.querySelectorAll('.tqs-solo-fgimg').length;
    const bg = el ? el.style.backgroundImage : '';
    window.TQScenes.form = orig;
    return { before, after, bg, bgOk: /l5v\.webp/.test(bg) };
  });
  console.log('[S1 前景接入位]', JSON.stringify(r),
    (r.before === 0 && r.after === 1 && r.bgOk) ? 'PASS' : 'FAIL');
  console.log('pageerror=', JSON.stringify(errs.slice(0, 2)));
  await b.close();
  if (!(r.before === 0 && r.after === 1 && r.bgOk)) { process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
