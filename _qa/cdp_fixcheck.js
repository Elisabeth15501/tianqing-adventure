/* 立绘加载修复的三点验收（CDP 实网限速）
 *   A 晚到补图：慢网下先出占位，图到了要**原位升级**（旧版永远停在占位）
 *   B 热路径：图在内存里时 show() 不能先画占位（旧版无条件画）
 *   C 真 404：failed 仍要缓存，且同一 key 只发一次请求（不能变成无限重试）
 *
 * 跑法：node _qa/cdp_fixcheck.js --net verylow
 */
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9335;
const args = process.argv.slice(2);
const NET = args.indexOf('--net') >= 0 ? args[args.indexOf('--net') + 1] : 'verylow';
const PROFILES = {
  none: null,
  fast4g: { latency: 60, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 640 * 1024 / 8 },
  verylow: { latency: 300, downloadThroughput: 120 * 1024 / 8, uploadThroughput: 100 * 1024 / 8 },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function getJSON(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
      let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--window-size=1280,720',
    '--user-data-dir=' + os.tmpdir() + '/tq_fix_' + Date.now(), 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 60; i += 1) { await sleep(200); try { list = await getJSON('/json/list'); if (list && list.length) break; } catch (e) {} }
  const target = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const waiting = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
  await new Promise((r) => ws.addEventListener('open', r));
  const send = (method, params) => new Promise((res) => { const mid = ++id; waiting.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params: params || {} })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : (r.result && r.result.exceptionDetails ? { __err: r.result.exceptionDetails.text } : null);
  };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/preview/dev-scene.html?act=chen&step=9&next=0&role=nv' });
  await sleep(2600);
  let ready = false;
  for (let i = 0; i < 150; i += 1) {
    if (await ev("!!(document.querySelector('.dlg-box') && window.TP && TP._slot)")) { ready = true; break; }
    await sleep(200);
  }
  if (!ready) { console.log(JSON.stringify({ net: NET, ready: false })); chrome.kill(); process.exit(1); }
  /* ★页面就绪后再切慢网：受限网络下 data.js 本身就要几十秒，先加载完再测图 */
  const prof = PROFILES[NET];
  if (prof) await send('Network.emulateNetworkConditions', { offline: false, ...prof });
  await sleep(300);

  /* 清空所有状态，从零开始测 */
  await ev("(function(){ Object.keys(TQA.status).forEach(function(k){TQA.reset(k);}); TQA._late={}; TQA._inflight={}; TQA._hot={}; return 1; })()");

  /* ---- A：慢网下 show → 先占位 → 图到后原位升级（轮询到出图或 15s 超时）---- */
  const dbg = await ev("(function(){ try { TP.show('fanzhi', { fill: true }); window.__A = { artAt0: !!document.querySelector('.sp-zone .fig-art'), realAt0: !!document.querySelector('.sp-zone .fig-real') }; return { ok: true, a: window.__A }; } catch (e) { return { err: String(e && e.stack || e) }; } })()");
  console.error('DBG', JSON.stringify(dbg));
  await sleep(16000);
  const A = await ev(`(function(){
    var slot = TP._slot;
    return { artAt0: window.__A.artAt0, realAt0: window.__A.realAt0,
             artNow: !!slot.querySelector('.fig-art'), realNow: !!slot.querySelector('.fig-real'),
             status: TQA.status['char-fanzhi'] || 'pending' };
  })()`);

  /* ---- B：网络恢复 → 换人 → 切回 fanzhi（此时在内存里）---- */
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await ev("TP.show('ligu', { fill: true }); 1");
  await sleep(2500);
  const B = await ev(`(function(){
    var slot = TP._slot;
    var t0 = performance.now();
    TP.show('fanzhi', { fill: true });
    var img = slot.querySelector('.fig-real');
    return { ms: +(performance.now()-t0).toFixed(1),
             artEver: !!slot.querySelector('.fig-art'),
             real: !!img,
             instant: img ? img.getAttribute('data-instant') : null,
             status: TQA.status['char-fanzhi'] || 'pending' };
  })()`);

  /* ---- C：不存在的 key —— 只发一次请求，第二次直接 fail ---- */
  const C = await ev(`(function(){
    TQA.reg['char-__missing__'] = { kind: 'image', src: './assets/chars/__missing__.webp' };
    return new Promise(function(res){
      var t = { first: null, second: null };
      TQA.resolve('char-__missing__', function(s){ t.first = s; });
      setTimeout(function(){
        TQA.resolve('char-__missing__', function(s){ t.second = s; res(t); });
      }, 1200);
    });
  })()`);
  const C2 = await ev("performance.getEntriesByType('resource').filter(function(e){return /__missing__/.test(e.name);}).length");

  /* ---- D：回忆舞台 mem-fig 走 realInto（另一条落图路径，改过就要验）---- */
  const D = await ev(`(function(){
    var n = document.createElement('div'); n.className = 'mem-fig';
    document.body.appendChild(n);
    var ret = TP.realInto(n, 'fuhou');
    return new Promise(function(res){
      setTimeout(function(){
        var img = n.querySelector('.mem-fig-real');
        res({ ret: ret, real: !!img, src: img ? img.getAttribute('src').split('/').pop() : null });
      }, 3000);
    });
  })()`);

  const out = { net: NET, A: A, B: B, C: C, D: D, missingRequests: C2 };
  out.verdict = {
    'A 晚到补图': A.artAt0 === true && A.realAt0 === false && A.realNow === true && A.status === 'ok',
    'B 热路径不闪占位': B.artEver === false && B.real === true && B.instant === '1',
    'C 404 只请求一次': C.first === 'fail' && C.second === 'fail' && C2 === 1,
    'D 回忆舞台落图': D.ret === true && D.real === true,
  };
  console.log(JSON.stringify(out, null, 1));
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 200);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
