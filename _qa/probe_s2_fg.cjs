const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto('file:///C:/Users/elisa/dev/tianqing-adventure/_qa/s1_fg_probe.html', { waitUntil: 'load' });
  const info = await p.evaluate(() => {
    const stage = document.getElementById('stage');
    stage.style.width = '390px'; stage.style.height = '844px';
    window.TQScenes.base = '../';
    const inst = window.TQScenes.mount(stage, 's2_guangde', { form: 'v' });
    const layers = [...stage.querySelectorAll('.spl')].map(el => ({
      layer: el.getAttribute('data-layer'),
      bg: (el.style.backgroundImage || '').split('/').pop(),
      opacity: getComputedStyle(el).opacity,
      display: getComputedStyle(el).display,
      transform: getComputedStyle(el).transform,
      rect: (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(el.getBoundingClientRect())
    }));
    return { layers, loaded: inst && inst.loaded };
  });
  await sleep(1200);
  await p.screenshot({ path: '_qa/s2_fg_on.png' });
  const off = await p.evaluate(() => {
    const el = [...document.querySelectorAll('.spl')].find(x => /l5v\.webp/.test(x.style.backgroundImage));
    if (!el) return false;
    el.style.display = 'none'; return true;
  });
  await sleep(300);
  await p.screenshot({ path: '_qa/s2_fg_off.png' });
  console.log('图层:', JSON.stringify(info.layers, null, 1));
  console.log('fg 存在:', off);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
