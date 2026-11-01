/* 加载页验收：正常 / 部分资源被阻断 两种状态下的 UI 表现。
 *
 * 跑法：node _qa/cdp_load.js
 * 判据：①正常态进度到 100%、按钮可点、文案「素材已就绪」
 *      ②阻断态出现「n 项素材未载入 · 点此重试」+「素材自检」链接、按钮仍能放行（10s 硬上限）
 *      ③阻断态点重试后能恢复（解封后重试 → 就绪）
 */
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const fs = require('fs');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9338;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (path) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
    let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--window-size=390,900',
    '--user-data-dir=' + os.tmpdir() + '/tq_load_' + Date.now(), 'about:blank',
  ], { stdio: 'ignore' });

  let list = null;
  for (let i = 0; i < 60; i += 1) {
    await sleep(200);
    try { list = await getJSON('/json/list'); if (list && list.length) break; } catch (e) {}
  }
  const target = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const waiting = new Map();
  ws.addEventListener('message', (m2) => {
    const m = JSON.parse(m2.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const send = (method, params) => new Promise((res) => {
    const mid = ++id; waiting.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) { return { __err: r.result.exceptionDetails.text }; }
    return r.result && r.result.result ? r.result.result.value : null;
  };
  const state = () => ev(`(function(){
    var note = document.querySelector('.load .ld-note');
    var diag = document.querySelector('.load .ld-diag');
    var bar = document.querySelector('.load .ld-bar i');
    var btn = document.querySelector('.load .lt .btn');
    return {
      note: note ? note.textContent : null,
      noteErr: note ? /err/.test(note.className) : null,
      diagShown: diag ? diag.style.display !== 'none' : null,
      barW: bar ? bar.style.width : null,
      btn: btn ? btn.textContent : null,
      btnDisabled: btn ? btn.disabled : null,
      status: window.TQA ? window.TQA.status : null
    };
  })()`);

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  /* ---------- ① 正常态 ---------- */
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/index.html?fresh=1' });
  await sleep(2600);
  const okState = await state();
  const shotOk = await send('Page.captureScreenshot', { format: 'png' });
  if (shotOk.result && shotOk.result.data) {
    fs.writeFileSync('_qa/_load_ok.png', Buffer.from(shotOk.result.data, 'base64'));
  }

  /* ---------- ② 阻断两张立绘 ---------- */
  await send('Network.setBlockedURLs', { urls: ['*tq_chars_fanzhi*', '*tq_chars_ligu*'] });
  await ev("try{localStorage.clear()}catch(e){}");
  await send('Page.reload', { ignoreCache: true });
  await sleep(3200);
  const badState = await state();
  const shotBad = await send('Page.captureScreenshot', { format: 'png' });
  if (shotBad.result && shotBad.result.data) {
    fs.writeFileSync('_qa/_load_bad.png', Buffer.from(shotBad.result.data, 'base64'));
  }

  /* ---------- ③ 解封后点重试 ---------- */
  await send('Network.setBlockedURLs', { urls: [] });
  await ev("(function(){ var n=document.querySelector('.load .ld-note'); if(n){ n.click(); return true; } return false; })()");
  await sleep(3000);
  const retryState = await state();

  console.log(JSON.stringify({ okState, badState, retryState }, null, 1));
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 200);
})().catch((e) => { console.error('ERR', e && e.stack || e); process.exit(1); });
