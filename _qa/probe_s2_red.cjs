const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto('file:///C:/Users/elisa/dev/tianqing-adventure/_qa/s1_fg_probe.html', { waitUntil: 'load' });
  const r = await p.evaluate(async () => {
    const st = document.getElementById('stage');
    st.style.cssText = 'position:relative;width:390px;height:844px;overflow:hidden';
    window.TQScenes.base = '../';
    window.TQScenes.mount(st, 's2_guangde', { form: 'v' });
    await new Promise(r => setTimeout(r, 1200));
    const fg = [...st.querySelectorAll('.spl')].find(x => /l5v\.webp/.test(x.style.backgroundImage));
    if (!fg) return { fg: false };
    const before = getComputedStyle(fg);
    fg.style.background = 'rgb(255,0,0)';
    await new Promise(r => setTimeout(r, 200));
    const box = fg.getBoundingClientRect();
    const pts = [[195, 800], [195, 700], [195, 600], [195, 400], [195, 100]];
    const hits = pts.map(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return { y, el: el ? (el.className || el.tagName) : null, isFg: el === fg };
    });
    return { fg: true, bg: fg.style.backgroundImage.slice(0, 60), z: before.zIndex, op: before.opacity,
             display: before.display, rect: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) }, hits };
  });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: '_qa/s2_red.png' });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
