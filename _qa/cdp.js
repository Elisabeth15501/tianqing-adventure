/* 立绘加载/切换时序探针（Node 22 内置 WebSocket 驱动 CDP，无需 playwright）
 *
 * 跑法：
 *   node _qa/cdp.js --net fast4g --clicks 8
 *   node _qa/cdp.js --net slow3g --clicks 8
 *   node _qa/cdp.js --net verylow --clicks 6      # 触发 2s 超时 → 观察 fail 是否被永久缓存
 *   node _qa/cdp.js --net fast4g --warm 1         # 先跑一遍再跑一遍（暖缓存对照）
 *
 * 输出：每个 TP.show 调用的
 *   ms_show    同步耗时（建 SVG 占位串 + 解析 + 排版）
 *   ms_real    从 show 到 .fig-real 出现（= 用户看到的「占位过渡」时长）
 *   cached     调用瞬间 TQA.status（none / pending / ok / fail）
 *   noop       同人同槽早退（没有重建）
 */
const { spawn } = require('child_process');
const http = require('http');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9333;

const args = process.argv.slice(2);
function arg(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
}
const NET = arg('net', 'fast4g');
const CLICKS = parseInt(arg('clicks', '8'), 10);
const WARM = arg('warm', '0') === '1';
const VIEW = arg('view', '1280x720');
const QUERY = arg('q', 'dev-scene.html?act=chen&step=12&next=0&role=nv');

const PROFILES = {
  none:    null,
  fast4g:  { latency: 60,  downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 640 * 1024 / 8 },
  slow3g:  { latency: 200, downloadThroughput: 500 * 1024 / 8,        uploadThroughput: 200 * 1024 / 8 },
  verylow: { latency: 300, downloadThroughput: 160 * 1024 / 8,        uploadThroughput: 120 * 1024 / 8 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function getJSON(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
      let b = '';
      r.on('data', (d) => (b += d));
      r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

(async () => {
  const [vw, vh] = VIEW.split('x').map(Number);
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT,
    '--window-size=' + vw + ',' + vh,
    '--user-data-dir=' + require('os').tmpdir() + '/tq_cdp_' + Date.now(),
    'about:blank',
  ], { stdio: 'ignore' });

  let list = null;
  for (let i = 0; i < 60; i += 1) {
    await sleep(200);
    try { list = await getJSON('/json/list'); if (list && list.length) break; } catch (e) { /* 未起 */ }
  }
  if (!list || !list.length) { console.error('chrome 未就绪'); chrome.kill(); process.exit(1); }
  const target = list.find((t) => t.type === 'page') || list[0];

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  function send(method, params) {
    const mid = ++id;
    return new Promise((res) => { waiting.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params: params || {} })); });
  }
  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) { return { __err: r.result.exceptionDetails.text }; }
    return r.result && r.result.result ? r.result.result.value : null;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 1, mobile: false });
  const prof = PROFILES[NET];
  if (prof) await send('Network.emulateNetworkConditions', { offline: false, ...prof });
  await send('Network.setCacheDisabled', { cacheDisabled: WARM ? false : true });

  const url = 'http://127.0.0.1:8765/preview/' + QUERY;
  await send('Page.navigate', { url });
  await sleep(2500);

  // 等页面进到剧情（dev-scene 会点「入宫当值」→「继续值守」）
  for (let i = 0; i < 40; i += 1) {
    const ok = await evaluate("!!(document.querySelector('.dlg-box') && window.TP)");
    if (ok) break;
    await sleep(250); 
  }

  await evaluate(`(function(){
    window.__log = [];
    window.__T0 = performance.now();
    var orig = TP.show;
    TP.show = function(key, opts){
      var side = (opts && opts.side) || 'main';
      var slot = TP.slotOf(side) || TP._slot;
      if (!slot) { return orig.apply(TP, arguments); }
      var useSlot = opts && opts.slot;
      var ak = 'char-' + key + (useSlot ? '-' + useSlot : '');
      var noop = (slot._tqKey === key);
      var rec = { key: key, side: side, noop: noop,
                  cached: TQA.status[ak] || 'none',
                  registered: !!TQA.reg[ak],
                  hadRealBefore: !!slot.querySelector('.fig-real'),
                  placeholderBefore: !!slot.querySelector('.fig-art') };
      window.__log.push(rec);
      var t0 = performance.now();
      var ret = orig.apply(TP, arguments);
      rec.ms_show = +(performance.now() - t0).toFixed(1);
      rec.realSync = !!slot.querySelector('.fig-real');
      if (noop) { rec.ms_real = 0; return ret; }
      var tk = setInterval(function(){
        var im = slot.querySelector('.fig-real');
        /* ★必须校验 src 里带本人 key：槽是复用的，下一个人的图落进来会被
         *   算成「上一个人 3.1s 才出图」，把「永久失败」误读成「只是慢」。 */
        var mine = !!(im && im.getAttribute('src') && im.getAttribute('src').indexOf(key) >= 0);
        if (mine) { rec.ms_real = +(performance.now() - t0).toFixed(0); clearInterval(tk); }
        else if (performance.now() - t0 > 7000) { rec.ms_real = null; clearInterval(tk); }
      }, 6);
      return ret;
    };
    /* 记录「真图插进来」的精确时刻（比轮询更准） */
    window.__muts = [];
    var zone = document.querySelector('.sp-zone');
    if (zone) {
      new MutationObserver(function(ms){
        ms.forEach(function(m){
          if (!m.addedNodes) return;
          [].forEach.call(m.addedNodes, function(n){
            if (n.nodeType === 1 && n.classList && n.classList.contains('fig-real')) {
              window.__muts.push(+performance.now().toFixed(0));
            }
          });
        });
      }).observe(zone, { childList: true, subtree: true });
    }
    return 'hook-ok';
  })()`);

  for (let i = 0; i < CLICKS; i += 1) {
    await evaluate("(function(){var b=document.querySelector('.dlg-box'); if(b){b.click(); return 1;} return 0;})()");
    await sleep(700);
  }
  await sleep(1600);

  const out = await evaluate(`(function(){
    var res = performance.getEntriesByType('resource').filter(function(e){ return /chars\\//.test(e.name); });
    return {
      log: window.__log,
      resources: res.map(function(e){ return { n: e.name.split('/').pop(), start: Math.round(e.startTime), dur: Math.round(e.duration), size: e.transferSize }; }),
      status: TQA.status,
      errs: (window.__errs || []).slice(0, 8),
      t0: Math.round(window.__T0)
    };
  })()`);

  /* 第二阶段：网络恢复到不限制，对「已判失败」的角色重新 show 一次。
   * 仍不出图 ⇒ 失败被永久缓存（「只看到占位」的硬证据）。 */
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const retry = await evaluate(`(function(){
    var keys = Object.keys(TQA.status).filter(function(k){ return TQA.status[k] === 'fail' && /^char-/.test(k); })
      .map(function(k){ return k.replace(/^char-/, '').replace(/-[a-z0-9]+$/, ''); });
    var uniq = keys.filter(function(k, i){ return keys.indexOf(k) === i; });
    if (!uniq.length) { return { keys: [], realNow: null }; }
    var slot = TP._slot;
    var before = slot ? slot.querySelector('.fig-real') : null;
    uniq.forEach(function(k){ TP.show(k, { fill: true }); });
    return new Promise(function(res){
      setTimeout(function(){
        var img = slot && slot.querySelector('.fig-real');
        res({ keys: uniq, hadRealBefore: !!(before && before.getAttribute('src')),
              statusAfter: JSON.parse(JSON.stringify(TQA.status)),
              realNow: !!img, realKey: img ? img.getAttribute('src').split('/').pop() : null });
      }, 3000);
    });
  })()`);

  console.log(JSON.stringify({ net: NET, view: VIEW, warm: WARM, clicks: CLICKS, out, retry }, null, 1));
  ws.close();
  chrome.kill();
  setTimeout(() => process.exit(0), 300);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
