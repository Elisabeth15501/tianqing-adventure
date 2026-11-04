const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:8933/index.html';
const OUT = 'C:/Users/elisa/dev/tianqing-adventure/_qa/_flow';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fails = [], consoleErrs = [], pageErrs = [];
  page.on('response', (r) => { if (r.status() >= 400) fails.push({ url: r.url().replace('http://127.0.0.1:8933/', ''), status: r.status() }); });
  page.on('requestfailed', (r) => fails.push({ url: r.url().replace('http://127.0.0.1:8933/', ''), failed: (r.failure() && r.failure().errorText) || 'failed' }));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', (e) => pageErrs.push(e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + '_1_load.png' });

  // 加载页 -> 标题
  await page.click('.lt .btn').catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + '_2_title.png' });

  // 标题 -> 选角
  await page.click('.footbar .btn').catch(async () => { await page.getByText('入宫当值').last().click().catch(() => {}); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + '_3_role.png' });

  // 选角 -> 进幕
  await page.click('.role-item').catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '_4_act.png' });

  // 推进若干步，触发立绘/场景
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(195, 700); // 点击对话区推进
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '_5_advance.png' });

  const dom = await page.evaluate(() => {
    const figs = Array.from(document.querySelectorAll('.sp-fig, .slot, .fig, .mem-fig')).map((n) => ({
      cls: n.className,
      hasReal: n.classList.contains('has-real'),
      img: !!n.querySelector('img'),
      imgSrc: (n.querySelector('img') || {}).currentSrc || (n.querySelector('img') || {}).src || null,
      svgImage: !!n.querySelector('svg image'),
      text: (n.textContent || '').slice(0, 30)
    }));
    return {
      figs,
      imgs: Array.from(document.images).slice(0, 20).map((im) => ({ src: im.currentSrc || im.src, w: im.naturalWidth, h: im.naturalHeight })),
      diag: (window.TQA && window.TQA.diag) ? (function () { var d = window.TQA.diag(); return { total: d.total, ok: d.ok.length, miss: d.miss.length, pending: d.pending.length, missList: d.miss.slice(0, 10) }; })() : null,
      note: (document.querySelector('.ld-note') || {}).textContent || null
    };
  });
  console.log('DOM', JSON.stringify(dom));
  console.log('NET_FAILS', JSON.stringify(fails.slice(0, 40)));
  console.log('CONSOLE_ERR', JSON.stringify(consoleErrs.slice(0, 20)));
  console.log('PAGE_ERR', JSON.stringify(pageErrs.slice(0, 10)));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
