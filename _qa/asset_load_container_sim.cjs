const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:8944/index.html';

const STUB = `
  window.xhs = { miniTool: {
    getWindowInfo: function(){ return { statusBarHeight: 0, safeArea: { top:0,bottom:0,left:0,right:0,width:390,height:844 }, menuButtons: { back:{}, me:{}, share:{} } }; },
    getLaunchOptions: function(){ return { miniToolEnv: { buildVersion: '9600000' } }; },
    startGyroscope: function(){ return Promise.resolve({ errMsg: 'startGyroscope:ok' }); },
    stopGyroscope: function(){ return Promise.resolve({ errMsg: 'stopGyroscope:ok' }); },
    onGyroscopeChange: function(fn){ window.__gyroFn = fn; },
    offGyroscopeChange: function(){ window.__gyroFn = null; },
    setStorage: function(o){ if(o&&o.success)o.success(); },
    getStorage: function(o){ if(o&&o.success)o.success({ data: null }); },
    removeStorage: function(o){ if(o&&o.success)o.success(); },
    followAuthor: function(){ return Promise.resolve({ follow_status: 0 }); },
    getFollowStatus: function(){ return Promise.resolve({ follow_status: 0 }); }
  }};
`;

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage();
  const failed = [], httpErr = [], consoleErr = [];
  page.on('requestfailed', (r) => failed.push({ url: r.url(), err: r.failure() && r.failure().errorText }));
  page.on('response', (r) => { if (r.status() >= 400) httpErr.push({ url: r.url(), status: r.status() }); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleErr.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => consoleErr.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  async function clickBtn(text) {
    const loc = page.locator(`button:has-text("${text}"):visible`).first();
    await loc.waitFor({ state: 'visible', timeout: 20000 });
    for (let i = 0; i < 50; i++) { if (!(await loc.evaluate((el) => el.disabled))) break; await page.waitForTimeout(300); }
    await loc.click({ timeout: 5000 });
  }

  await clickBtn('入宫当值');
  await page.waitForTimeout(700);
  await clickBtn('入宫当值');
  await page.waitForTimeout(700);
  const role = page.locator('.role-item:visible').first();
  await role.waitFor({ state: 'visible', timeout: 8000 });
  await role.click();
  await page.waitForTimeout(3500);

  const info = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).map((im) => ({ src: im.getAttribute('src'), nw: im.naturalWidth, nh: im.naturalHeight, complete: im.complete }));
    const stage = document.querySelector('.tqs-stage');
    return {
      app: (document.querySelector('.app') || {}).className || null,
      hasXhs: !!window.xhs,
      env: (window.TQA && window.TQA.env) || null,
      envNote: (window.TQA && window.TQA.envNote) ? window.TQA.envNote() : null,
      stageCls: stage ? stage.className : null,
      stageImgs: stage ? Array.from(stage.querySelectorAll('img')).map((i) => ({ src: i.getAttribute('src'), nw: i.naturalWidth })) : null,
      imgs: imgs,
      bgArt: !!document.querySelector('.bg-art.wash')
    };
  });

  console.log('=== FAILED ==='); console.log(JSON.stringify(failed));
  console.log('=== HTTP>=400 ==='); console.log(JSON.stringify(httpErr));
  console.log('=== CONSOLE ==='); console.log(JSON.stringify(consoleErr.slice(0, 20)));
  console.log('=== INFO ==='); console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
