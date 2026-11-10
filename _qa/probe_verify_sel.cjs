const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8931/', { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const cs = s => getComputedStyle(document.querySelector(s));
    const out = {
      bodySelect: cs('body').userSelect,
      bodyCallout: cs('body').webkitTouchCallout,
      htmlSelect: cs('html').userSelect
    };
    // selectstart 是否被拦
    const el = document.querySelector('.title-wrap') || document.body;
    const ev = new Event('selectstart', { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    out.selectstartPrevented = ev.defaultPrevented;
    // 选中后被清掉
    const range = document.createRange();
    const tn = [...document.querySelectorAll('p,span,div')].find(n => n.childNodes.length && n.textContent.trim().length > 4);
    if (tn) { range.selectNodeContents(tn); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
    await new Promise(r => setTimeout(r, 250));
    out.selectionAfter = (getSelection() || '').toString().slice(0, 20);
    return out;
  });
  console.log(JSON.stringify(r));
  const ok = r.bodySelect === 'none' && r.selectstartPrevented === true && (r.selectionAfter === '' || r.selectionAfter === undefined);
  console.log(ok ? 'PASS 选择已封死' : 'FAIL');
  console.log('errors:', errs.slice(0, 3));
  await b.close();
  if (!ok) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
