const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto('file:///C:/Users/elisa/dev/tianqing-adventure/_qa/s1_fg_probe.html', { waitUntil: 'load' });
  const r = await p.evaluate(() => {
    const st = document.getElementById('stage');
    window.TQScenes.base = '../';
    window.TQScenes.mount(st, 's2_guangde', { form: 'v' });
    const stageEl = st.firstElementChild;
    return {
      stageAttr: stageEl ? stageEl.getAttribute('data-sp-additive') : null,
      stageTag: stageEl ? stageEl.className : null,
      mix: [...st.querySelectorAll('.spl')].map(el => ({
        l: el.getAttribute('data-l'),
        mix: getComputedStyle(el).mixBlendMode
      }))
    };
  });
  console.log(JSON.stringify(r));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
