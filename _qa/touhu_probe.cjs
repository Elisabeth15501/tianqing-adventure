const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'file:///C:/Users/elisa/dev/tianqing-adventure/preview/dev-touhu.html?m=aim&drag=180,120&qhide=1';

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL, { waitUntil: 'load' });
  let m = null;
  for (let i = 0; i < 48; i++) { m = await p.evaluate(() => window.__metrics || null); if (m) break; await p.waitForTimeout(250); }
  console.log('ERRS', JSON.stringify(errs.slice(0, 5)));
  if (!m) {
    const st = await p.evaluate(() => ({
      hasF: typeof window.F, hasTQM: typeof window.TQM,
      cur: (window.TQM && window.TQM.cur && window.TQM.cur.state) ? window.TQM.cur.state() : null,
      stage: (function(){var s=document.querySelector('.iv-stage'); return s?{w:s.clientWidth,h:s.clientHeight,pos:getComputedStyle(s).position}:null;})()
    }));
    console.log('NO METRICS; diag=', JSON.stringify(st, null, 1));
  } else {
    console.log('stageW/H', m.stageW, m.stageH, 'rect', JSON.stringify(m.rect));
    console.log('state.ph', m.state && m.state.ph, 'armed', m.state && m.state.armed, 'aim', JSON.stringify(m.state && m.state.aim));
    console.log('nodes', m.nodes, 'errs', JSON.stringify(m.errs));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
