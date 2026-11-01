/* 终幕双人同框验收：张永德(e3) ↔ 郭荣 —— 真实 index.html 驱动
 * 跑法：node _qa/cdp_duo.js [before|after 标签]
 * 流程：冷启动 → 进幕 → 按 setPortrait 的分边规则（说者右/听者左）驱动
 *   TP.show 两侧 → 截图 390 竖 + 1280 横 → 量头宽/镜像位。
 */
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const fs = require('fs');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9338;
const TAG = process.argv[2] || 'after';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (path) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
    let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--window-size=1360,900',
    '--user-data-dir=' + os.tmpdir() + '/tq_duo_' + Date.now(), 'about:blank',
  ], { stdio: 'ignore' });

  let list = null;
  for (let i = 0; i < 60; i += 1) { await sleep(200); try { list = await getJSON('/json/list'); if (list && list.length) break; } catch (e) {} }
  const target = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const waiting = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const send = (method, params) => new Promise((res) => {
    const mid = ++id; waiting.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) { return { __err: (r.result.exceptionDetails.exception || {}).description || r.result.exceptionDetails.text }; }
    return r.result && r.result.result ? r.result.result.value : null;
  };
  const shot = async (name, w, h) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: /390/.test(String(w)) });
    await sleep(700);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    if (s.result && s.result.data) { fs.writeFileSync('_qa/_duo_' + TAG + '_' + name + '.png', Buffer.from(s.result.data, 'base64')); }
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/index.html?fresh=1' });
  await sleep(1800);

  /* 冷启动进幕（与 cdp_diag 相同的状态机） */
  for (let i = 0; i < 24; i += 1) {
    const st = await ev(`(function(){
      var roleN = document.querySelectorAll('.role-item').length;
      var btn = [].slice.call(document.querySelectorAll('button')).filter(function(b){
        return b.offsetParent !== null && !b.disabled && /入宫当值|继续值守|开始/.test((b.textContent||'').trim());
      })[0];
      return { roleN: roleN, btn: btn ? 1 : 0 };
    })()`);
    if (st && st.roleN > 0) {
      await ev("(function(){ document.querySelector('.role-item').click(); return 1; })()");
      await sleep(2600); break;
    }
    if (st && st.btn) {
      await ev("(function(){ var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return x.offsetParent!==null&&!x.disabled&&/入宫当值|继续值守|开始/.test((x.textContent||'').trim());})[0]; b.click(); return 1; })()");
      await sleep(1500); continue;
    }
    await sleep(500);
  }

  /* 驱动终幕张永德↔郭荣双人场（复刻 app.js setPortrait：说者右 / 听者左）。
   * data.js:341 —— speaker 张永德 slot e3，pair 官家(=guorong)。 */
  const drive = await ev(`(function(){
    try {
      var zone = document.querySelector('.sp-zone');
      if (!zone) return { __err: 'no zone' };
      var slots = [].slice.call(zone.querySelectorAll('.slot.sp-fig'));
      var figL = slots[0], figR = slots[1];
      figL.style.display = '';
      figL.setAttribute('data-side', 'l');  figR.setAttribute('data-side', 'r');
      figL.setAttribute('data-duo', '1');   figR.setAttribute('data-duo', '1');
      zone.setAttribute('data-duo', '1');
      TP.bindStage(zone);
      /* 听者左 = 郭荣（官家），说者右 = 张永德 e3 */
      TP.show('guorong', { fill: true, side: 'l' });
      TP.show('zhangyongde', { fill: true, slot: 'e3', side: 'r' });
      if (TP.refit) TP.refit();
      figL.setAttribute('data-st', 'off');
      figR.setAttribute('data-st', 'on');
      return { ok: 1 };
    } catch (e) { return { __err: String(e && e.stack || e) }; }
  })()`);
  /* 等两张真图就位 */
  let figs = null;
  for (let i = 0; i < 40; i += 1) {
    figs = await ev(`(function(){
      var out = [];
      [].slice.call(document.querySelectorAll('.sp-fig')).forEach(function(s){
        if (s.getAttribute('data-side') === 'off') return;
        var img = s.querySelector('.fig-real');
        out.push({
          key: s._tqKey || '', slot: s._tqSlot || '', side: s.getAttribute('data-side'),
          real: !!img, nat: img ? img.naturalWidth : 0,
          sx: s.style.getPropertyValue('--fig-sx'), sc: s.style.getPropertyValue('--fig-scale'),
          shiftX: s.style.getPropertyValue('--fig-shift-x')
        });
      });
      return out;
    })()`);
    if (figs && figs.length >= 2 && figs.every(function (f) { return f.real && f.nat > 0; })) break;
    await sleep(300);
  }
  /* 头宽（px）= FIT.headW × contain宽 × k，反算与 pw 口径一致 */
  const heads = await ev(`(function(){
    var out = [];
    [].slice.call(document.querySelectorAll('.sp-fig')).forEach(function(s){
      if (s.getAttribute('data-side') === 'off' || !s._tqKey) return;
      var img = s.querySelector('.fig-real'); if (!img || !img.naturalWidth) return;
      var m = (TP.fitOf(s._tqKey, s._tqSlot)) || {};
      out.push({ key: s._tqKey, slot: s._tqSlot, headW: m.headW, k: parseFloat(s.style.getPropertyValue('--fig-scale'))||1,
                 w: img.getBoundingClientRect().width,
                 /* 头宽(px) = headW × 未缩放图宽 × k；rect 已含 k ⇒ headW × rect 即可（勿再乘 k） */
                 dispHead: Math.round(m.headW * img.getBoundingClientRect().width) });
    });
    return out;
  })()`);
  await shot('390', 390, 780);
  await shot('1280', 1280, 760);

  console.log(JSON.stringify({ TAG, drive, figs, heads }, null, 1));
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 200);
})().catch((e) => { console.error('ERR', e && e.stack || e); process.exit(1); });
