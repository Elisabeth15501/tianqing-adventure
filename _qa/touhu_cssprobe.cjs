const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'file:///C:/Users/elisa/dev/tianqing-adventure/preview/dev-touhu.html?m=aim&qhide=1';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => {
    var st = document.querySelector('.iv-stage');
    var sv = document.querySelector('.iv-stage svg');
    function ta(el) { return el ? getComputedStyle(el).touchAction : null; }
    var chain = [], el = st;
    while (el && el !== document.documentElement) { chain.push((el.id || el.className || el.tagName) + ':' + getComputedStyle(el).touchAction + ':ov=' + getComputedStyle(el).overflowY); el = el.parentElement; }
    return {
      stageTA: ta(st), svgTA: ta(sv),
      appTA: ta(document.getElementById('app')), mainTA: ta(document.getElementById('main')),
      bodyTA: ta(document.body),
      chain: chain,
      stageH: st && st.clientHeight, svgRect: sv ? sv.getBoundingClientRect().toJSON() : null,
      cssRulePresent: Array.prototype.slice.call(document.styleSheets).some(function (ss) {
        try { return Array.prototype.slice.call(ss.cssRules).some(function (r) { return r.selectorText === '.iv-stage' && /touch-action/.test(r.cssText); }); } catch (e) { return false; }
      })
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
