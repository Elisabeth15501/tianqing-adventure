const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:8944/index.html';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const failed = [], httpErr = [], consoleErr = [];
  page.on('requestfailed', (r) => failed.push({ url: r.url(), err: r.failure() && r.failure().errorText }));
  page.on('response', (r) => { if (r.status() >= 400) httpErr.push({ url: r.url(), status: r.status() }); });
  page.on('console', (m) => { if (m.type() === 'error') consoleErr.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => consoleErr.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const s0 = await page.evaluate(() => ({
    app: (document.querySelector('.app') || {}).className || null,
    title: document.title,
    btns: Array.from(document.querySelectorAll('button')).map((b) => ({
      t: (b.textContent || '').trim().slice(0, 8), dis: b.disabled,
      disp: getComputedStyle(b).display, vis: getComputedStyle(b).visibility,
      w: Math.round(b.getBoundingClientRect().width)
    })).slice(0, 10)
  }));
  console.log('S0', JSON.stringify(s0));

  async function clickBtn(text, timeout = 20000) {
    const loc = page.locator(`button:has-text("${text}"):visible`).first();
    await loc.waitFor({ state: 'visible', timeout });
    for (let i = 0; i < 50; i++) {
      if (!(await loc.evaluate((el) => el.disabled))) break;
      await page.waitForTimeout(300);
    }
    await loc.click({ timeout: 5000 });
  }

  await clickBtn('入宫当值');           // load -> title
  await page.waitForTimeout(700);
  await clickBtn('入宫当值');           // title -> role
  await page.waitForTimeout(700);
  const role = page.locator('.role-item:visible').first();
  await role.waitFor({ state: 'visible', timeout: 8000 });
  await role.click();
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).map((im) => ({
      src: im.getAttribute('src'), complete: im.complete, nw: im.naturalWidth, nh: im.naturalHeight
    }));
    const stages = Array.from(document.querySelectorAll('.tqs-stage')).map((el) => ({
      cls: el.className, input: el.getAttribute('data-spl-input'),
      bg: getComputedStyle(el).backgroundImage,
      childImgs: Array.from(el.querySelectorAll('img')).map((i) => ({ src: i.getAttribute('src'), nw: i.naturalWidth }))
    }));
    return {
      app: (document.querySelector('.app') || {}).className || null,
      imgCount: imgs.length, imgs: imgs, stages: stages,
      scenesBase: (window.TQScenes && window.TQScenes.base) || null,
      hasScenes: !!window.TQScenes, env: (window.TQA && window.TQA.env) || null
    };
  });

  console.log('=== FAILED REQUESTS ==='); console.log(JSON.stringify(failed));
  console.log('=== HTTP >=400 ==='); console.log(JSON.stringify(httpErr));
  console.log('=== CONSOLE ERR ==='); console.log(JSON.stringify(consoleErr.slice(0, 20)));
  console.log('=== PAGE INFO ==='); console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
