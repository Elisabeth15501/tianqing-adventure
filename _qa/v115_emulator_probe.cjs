/* v1.1.5 官方模拟器实测：
   ① 加载页按钮从 disabled → 可点用了多久（评审看到的是"死按钮"吗）
   ② 进幕之后场景宿主尺寸 / 图片解码 / 资源 404 / console 告警
   ③ 史官线入口是否可达 */
const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL = 'http://127.0.0.1:64078/';
const SHOT = 'C:/Users/elisa/dev/tianqing-adventure/_qa/';

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const assets = [], errs = [], warns = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/assets\/(scenes|chars|shards)/.test(u)) assets.push({ f: u.replace(/^.*\/files\//, '').slice(0, 70), s: r.status() });
  });
  page.on('console', (m) => {
    const t = (m.text() || '').slice(0, 180);
    if (m.type() === 'error') errs.push(t);
    else if (m.type() === 'warning') warns.push(t);
  });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 160)));

  await page.goto(URL, { waitUntil: 'load' });

  // 找游戏 frame
  let frame = null;
  for (let i = 0; i < 40; i++) {
    frame = page.frames().find((f) => /\/app\//.test(f.url()));
    if (frame) break;
    await page.waitForTimeout(500);
  }
  if (!frame) { console.log('NO GAME FRAME'); await browser.close(); return; }
  console.log('GAME FRAME ok:', frame.url().slice(0, 70));

  // ① 按钮启用时间线
  const t0 = Date.now();
  let firstEnabled = null, snaps = [];
  for (let i = 0; i < 60; i++) {
    const s = await frame.evaluate(() => {
      const b = document.querySelector('.lt .btn') || document.querySelector('.btn');
      if (!b) return null;
      const n = document.querySelector('.ld-note');
      return { dis: !!b.disabled, txt: (b.textContent || '').trim(), note: n ? (n.textContent || '').trim() : '' };
    });
    const el = Date.now() - t0;
    if (s) {
      snaps.push(el + 'ms ' + (s.dis ? 'DISABLED' : 'enabled ') + ' | ' + s.txt + ' | ' + s.note);
      if (!s.dis && firstEnabled === null) firstEnabled = el;
      if (!s.dis) break;
    }
    await page.waitForTimeout(250);
  }
  console.log('=== ① 加载页按钮时间线 ===');
  snaps.slice(0, 12).forEach((x) => console.log('   ' + x));
  console.log('   首次可点用:', firstEnabled === null ? '20s 内仍不可点' : firstEnabled + 'ms');

  // ② 进幕（史官线）
  async function clickText(t, wait = 1500) {
    for (let i = 0; i < 25; i++) {
      const ok = await frame.evaluate((txt) => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim().indexOf(txt) >= 0 && !x.disabled);
        if (b) { b.click(); return true; }
        const any = Array.from(document.querySelectorAll('*')).find((x) => x.children.length === 0 && (x.textContent || '').trim() === txt);
        if (any) { any.click(); return true; }
        return false;
      }, t);
      if (ok) { await page.waitForTimeout(wait); return true; }
      await page.waitForTimeout(300);
    }
    return false;
  }
  console.log('   点「入宫当值」:', await clickText('入宫当值'));
  console.log('   再点「入宫当值」:', await clickText('入宫当值'));
  console.log('   选「史官」:', await clickText('史官', 3000));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: SHOT + '_v115_act.png' });

  const info = await frame.evaluate(() => {
    const host = document.querySelector('.bg-scene');
    const r = host ? host.getBoundingClientRect() : null;
    const appEl = document.querySelector('.app');
    const ar = appEl ? appEl.getBoundingClientRect() : null;
    return {
      env: window.TQA && window.TQA.env,
      envNote: (window.TQA && window.TQA.envNote) ? window.TQA.envNote() : null,
      appBox: ar ? [Math.round(ar.width), Math.round(ar.height)] : null,
      hostClass: host ? host.className : null,
      hostStyle: host ? { w: host.style.width, h: host.style.height, l: host.style.left, t: host.style.top } : null,
      hostBox: r ? [Math.round(r.width), Math.round(r.height)] : null,
      docText: (document.querySelector('.vn-doc') ? document.querySelector('.vn-doc').textContent : '').slice(0, 60),
      imgs: Array.from(document.querySelectorAll('img')).map((i) => ({
        src: (i.getAttribute('src') || '').split('/').slice(-2).join('/'), nw: i.naturalWidth, nh: i.naturalHeight,
        box: [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)]
      }))
    };
  });
  console.log('=== ② 进幕状态 ===');
  console.log(JSON.stringify(info, null, 1));
  console.log('=== 资源请求 total=' + assets.length + ' 非200=' + assets.filter((a) => a.s !== 200).length + ' ===');
  const bad = assets.filter((a) => a.s !== 200);
  if (bad.length) console.log(JSON.stringify(bad.slice(0, 8)));
  console.log('=== 场景类请求 ===');
  console.log(JSON.stringify(assets.filter((a) => /scenes/.test(a.f)).slice(0, 10)));
  console.log('=== console.error ==='); console.log(JSON.stringify(errs.slice(0, 10)));
  console.log('=== console.warn ==='); console.log(JSON.stringify(warns.slice(0, 10)));

  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
