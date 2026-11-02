/*
 * cdp_smoke.js —— 用原生 CDP（node 22 自带 WebSocket，不依赖 playwright）跑真实页面
 *
 * 用途：改了 js/tilt.js 之后，确认真机链路（index.html）没有运行时报错，
 *      并且 TiltController 自检字段能读到。
 *
 * 用法：node _qa/cdp_smoke.js [url] [waitMs]
 */
const { spawn } = require('child_process');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL_ = process.argv[2] || 'http://127.0.0.1:8765/index.html';
const WAIT = Number(process.argv[3] || 9000);
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--window-size=390,844', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + require('os').tmpdir() + '/cdp-smoke-' + Date.now(),
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i += 1) {
    await sleep(200);
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page) { wsUrl = page.webSocketDebuggerUrl; }
    } catch (e) { /* 还没起来 */ }
  }
  if (!wsUrl) { console.log('CHROME-NOT-READY'); proc.kill(); process.exit(1); }

  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const errors = [];
  const warns = [];

  const send = (method, params) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });

  await new Promise((r) => { ws.onopen = r; });

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push('EXCEPTION: ' + (d.exception && (d.exception.description || d.exception.value) || d.text));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push('LOG: ' + msg.params.entry.text);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const t = msg.params.type;
      const txt = msg.params.args.map((a) => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      if (t === 'error') { errors.push('CONSOLE: ' + txt); }
      if (t === 'warning') { warns.push(txt); }
    }
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Page.navigate', { url: URL_ });
  await sleep(WAIT);

  /* TILT_CLICKS=n：连点 n 次推进（标题→选角→剧情），用来把场景真正挂起来 */
  const CLICKS = Number(process.env.TILT_CLICKS || 0);
  for (let i = 0; i < CLICKS; i += 1) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 195, y: 600, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 195, y: 600, button: 'left', clickCount: 1 });
    await sleep(1300);
  }

  const expr = `(function(){
    var out = { url: location.href, ready: document.readyState };
    out.tilt = typeof window.TiltController;
    out.hub = window.TQ_TILT_HUB ? { owners: window.TQ_TILT_HUB.owners, running: window.TQ_TILT_HUB.running } : null;
    out.info = window.TQ_TILT_INFO || null;
    out.inContainer = !!(window.xhs && window.xhs.miniTool);
    out.webLoaded = typeof window.OrientationSource;
    var spl = document.querySelectorAll('[data-spl-input]');
    out.splNodes = spl.length;
    out.splKinds = [].map.call(spl, function (n) { return n.getAttribute('data-spl-input'); });
    var sp = document.querySelector('[data-spl-key]');
    if (sp && sp.__sp && sp.__sp.inputStatus) { out.sceneStatus = sp.__sp.inputStatus(); }
    out.missingImg = [].filter.call(document.images, function (i) { return i.complete && i.naturalWidth === 0; }).length;
    return JSON.stringify(out);
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log('=== 页面状态 ===');
  console.log(r.result.value);

  const fails = await send('Runtime.evaluate', {
    expression: `JSON.stringify([].filter.call(document.querySelectorAll('img,script,link'), function(n){
      return (n.tagName==='IMG' && n.complete && n.naturalWidth===0);
    }).map(function(n){return n.getAttribute('src');}).slice(0,10))`,
    returnByValue: true
  });
  console.log('=== 加载失败的图片 ===');
  console.log(fails.result.value);

  console.log('=== 错误 (' + errors.length + ') ===');
  errors.slice(0, 15).forEach((e) => console.log('  ' + e));
  console.log('=== 警告 (' + warns.length + ') ===');
  warns.slice(0, 8).forEach((e) => console.log('  ' + e));

  ws.close();
  proc.kill();
  process.exit(errors.length ? 2 : 0);
})();
