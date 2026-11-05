const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:8951/index.html';

async function run(stubName, stub) {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  if (stub) { await ctx.addInitScript(stub); }
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--tq-set-top').trim();
    const d = document.createElement('div'); d.className = 'set-ov';
    document.body.appendChild(d);
    const pad = getComputedStyle(d).paddingTop;
    d.remove();
    return { v, pad };
  });
  await b.close();
  return { stubName, ...r, errs: errs.slice(0, 2) };
}

(async () => {
  const pages = await run('pages(无容器)', null);
  const okPages = pages.pad === '16px';

  const withInfo = await run('container(返回 safeArea.top=59)', () => {
    window.xhs = { miniTool: { getWindowInfo: () => Promise.resolve({
      windowWidth: 390, windowHeight: 844,
      safeArea: { top: 59, left: 0, right: 390, bottom: 810 },
      menuButtons: {}
    }) } };
  });
  const okInfo = withInfo.pad === '75px';

  const failInfo = await run('container(getWindowInfo 失败)', () => {
    window.xhs = { miniTool: { getWindowInfo: () => Promise.reject(new Error('nope')) } };
  });
  const okFail = failInfo.pad === '60px';

  console.log('[Pages]', JSON.stringify(pages), okPages ? 'PASS' : 'FAIL');
  console.log('[容器有数据]', JSON.stringify(withInfo), okInfo ? 'PASS' : 'FAIL');
  console.log('[容器取不到]', JSON.stringify(failInfo), okFail ? 'PASS' : 'FAIL');
  if (!(okPages && okInfo && okFail)) { process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
