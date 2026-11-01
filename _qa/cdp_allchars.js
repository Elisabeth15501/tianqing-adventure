/* 全角色落图体检：在**真实入口 index.html** 里把 33 个 char-* 资源键逐个 show 一遍，
 * 记录 status / naturalWidth / 可见像素面积。用来分辨「全都出不来」和「个别出不来」。
 *
 * 跑法：node _qa/cdp_allchars.js [--view 390x780] [--net none|slow3g]
 */
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9337;
const args = process.argv.slice(2);
const arg = (n, d) => (args.indexOf('--' + n) >= 0 ? args[args.indexOf('--' + n) + 1] : d);
const VIEW = arg('view', '390x780');
const NET = arg('net', 'none');
const PROFILES = {
  none: null,
  slow3g: { latency: 200, downloadThroughput: 500 * 1024 / 8, uploadThroughput: 200 * 1024 / 8 },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (path) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
    let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

(async () => {
  const [vw, vh] = VIEW.split('x').map(Number);
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--window-size=' + vw + ',' + (vh + 120),
    '--user-data-dir=' + os.tmpdir() + '/tq_all_' + Date.now(), 'about:blank',
  ], { stdio: 'ignore' });

  let list = null;
  for (let i = 0; i < 60; i += 1) {
    await sleep(200);
    try { list = await getJSON('/json/list'); if (list && list.length) break; } catch (e) {}
  }
  const target = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const waiting = new Map();
  const failed = [];
  ws.addEventListener('message', (m2) => {
    const m = JSON.parse(m2.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return; }
    if (m.method === 'Network.loadingFailed') { failed.push(m.params.errorText); }
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

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 2, mobile: true });
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/index.html?fresh=1' });
  await sleep(1500);
  if (PROFILES[NET]) await send('Network.emulateNetworkConditions', { offline: false, ...PROFILES[NET] });
  await ev("try{localStorage.removeItem('tianqing_save_v1')}catch(e){}");
  await send('Page.reload', { ignoreCache: true });
  await sleep(2000);

  /* 进幕：走真实按钮链 */
  for (let i = 0; i < 24; i += 1) {
    const st = await ev(`(function(){
      var roleN = document.querySelectorAll('.role-item').length;
      var btn = [].slice.call(document.querySelectorAll('button')).filter(function(b){
        return b.offsetParent !== null && /入宫当值|继续值守|开始/.test((b.textContent||'').trim());
      })[0];
      return { roleN: roleN, btn: !!btn };
    })()`);
    if (st && st.roleN > 0) { await ev("document.querySelector('.role-item').click(); 1"); await sleep(2800); break; }
    if (st && st.btn) {
      await ev("(function(){var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return x.offsetParent!==null&&/入宫当值|继续值守|开始/.test((x.textContent||'').trim());})[0];b.click();return 1;})()");
      await sleep(1500); continue;
    }
    await sleep(500);
  }

  const keys = await ev("TP.list().map(function(x){return {key:x.key, slot:x.slot, slots:x.slots};})");
  const rows = [];
  for (const it of keys) {
    const targets = [['', it.slot]].concat((it.slots || []).map((s) => [s, s]));
    for (const [slotArg, label] of targets) {
      const r = await ev(`(function(){
        try { TP.show(${JSON.stringify(it.key)}, { fill: true${slotArg ? ", slot: " + JSON.stringify(slotArg) : ''} }); }
        catch (e) { return { err: String(e && e.message || e) }; }
        var s = TP._slot;
        return new Promise(function(res){
          var t0 = performance.now(), tk = setInterval(function(){
            var im = s.querySelector('.fig-real');
            var done = im && im.complete && im.naturalWidth > 0;
            if (done || performance.now() - t0 > 12000) {
              clearInterval(tk);
              var ak = TP.akOf(${JSON.stringify(it.key)}${slotArg ? "," + JSON.stringify(slotArg) : ''});
              var b = im ? im.getBoundingClientRect() : null;
              var sb = s.getBoundingClientRect();
              /* 可见面积比：图与槽的交集 / 图面积 */
              var vis = 0;
              if (b) {
                var iw = Math.max(0, Math.min(b.right, sb.right) - Math.max(b.left, sb.left));
                var ih = Math.max(0, Math.min(b.bottom, sb.bottom) - Math.max(b.top, sb.top));
                vis = b.width * b.height > 0 ? +((iw * ih) / (b.width * b.height)).toFixed(3) : 0;
              }
              res({ key: ${JSON.stringify(it.key)}, slot: ${JSON.stringify(label)}, ak: ak,
                    status: ak ? (TQA.status[ak] || 'pending') : 'noreg',
                    nat: im ? im.naturalWidth + 'x' + im.naturalHeight : null,
                    hasReal: !!im, hasArt: !!s.querySelector('.fig-art'),
                    imgRect: b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null,
                    slotRect: { x: Math.round(sb.x), y: Math.round(sb.y), w: Math.round(sb.width), h: Math.round(sb.height) },
                    vis: vis, ms: Math.round(performance.now() - t0) });
            }
          }, 100);
        });
      })()`);
      rows.push(r);
    }
  }

  const bad = rows.filter((r) => !r || r.err || !r.hasReal || r.status !== 'ok' || r.vis < 0.5);
  console.log(JSON.stringify({ view: VIEW, net: NET, total: rows.length, bad: bad, rows: rows, failed }, null, 1));
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 200);
})().catch((e) => { console.error('ERR', e && e.stack || e); process.exit(1); });
