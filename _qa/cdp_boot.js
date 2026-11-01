/* 冷启动首帧探针：真实入口 index.html → 加载页 → 标题 → 选身份 → 进第一幕
 * 目标口径：①第一条立绘请求何时发出（= 用户已经在看剧情了才去下载）
 *          ②首张真立绘何时上屏（占位 → 真图的窗口有多长）
 *          ③整条链路里立绘资源占了多少时间
 *
 * 跑法：node _qa/cdp_boot.js --net fast4g
 *      node _qa/cdp_boot.js --net slow3g
 */
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9334;
const args = process.argv.slice(2);
const NET = args.indexOf('--net') >= 0 ? args[args.indexOf('--net') + 1] : 'fast4g';
const PROFILES = {
  none: null,
  fast4g: { latency: 60, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 640 * 1024 / 8 },
  slow3g: { latency: 200, downloadThroughput: 500 * 1024 / 8, uploadThroughput: 200 * 1024 / 8 },
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
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--window-size=390,780',
    '--user-data-dir=' + os.tmpdir() + '/tq_boot_' + Date.now(), 'about:blank',
  ], { stdio: 'ignore' });

  let list = null;
  for (let i = 0; i < 60; i += 1) {
    await sleep(200);
    try { list = await getJSON('/json/list'); if (list && list.length) break; } catch (e) {}
  }
  const target = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const waiting = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const send = (method, params) => new Promise((res) => { const mid = ++id; waiting.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params: params || {} })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : null;
  };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  const prof = PROFILES[NET];
  if (prof) await send('Network.emulateNetworkConditions', { offline: false, ...prof });
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  /* 在文档开始前装标记：所有时间都以 navigationStart 为 0 */
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__TL = { firstReal: null, firstArt: null, firstShow: null };
      if (window.TP) {} /* 占位：脚本早于 TP 定义，用轮询接管 */
      document.addEventListener('DOMContentLoaded', function(){
        var t = setInterval(function(){
          var slot = document.querySelector('.sp-zone .slot.sp-fig');
          if (!slot) { return; }
          if (window.__TL.firstShow === null) { window.__TL.firstShow = Math.round(performance.now()); }
          if (window.__TL.firstArt === null && slot.querySelector('.fig-art')) { window.__TL.firstArt = Math.round(performance.now()); }
          if (!window.__TL.firstReal && slot.querySelector('.fig-real')) {
            window.__TL.firstReal = Math.round(performance.now());
            clearInterval(t);
          }
        }, 20);
      });`,
  });

  await send('Page.navigate', { url: 'http://127.0.0.1:8765/index.html?fresh=1' });
  await sleep(1200);

  /* 清存档，保证走「加载页 → 标题 → 入宫当值」全链 */
  await ev("localStorage.removeItem('tianqing_save_v1')");

  async function clickText(re, tries) {
    for (let i = 0; i < (tries || 40); i += 1) {
      const ok = await ev(`(function(){
        var b = [].slice.call(document.querySelectorAll('button,.btn')).filter(function(n){
          return ${re}.test((n.textContent||'').trim()) && n.offsetParent !== null;
        })[0];
        if (b) { b.click(); return true; } return false;
      })()`);
      if (ok) return true;
      await sleep(250);
    }
    return false;
  }

  const steps = [];
  const dump = () => ev("(document.body.innerText||'').replace(/\\s+/g,' ').slice(0,160)");
  steps.push(['入宫当值', await clickText('/入宫当值|继续值守/'), await dump()]);
  await sleep(1200);
  steps.push(['选身份', await clickText('/女官|史官/'), await dump()]);
  await sleep(2000);
  steps.push(['进幕', await clickText('/辰时|入殿|当值|开始/'), await dump()]);
  await sleep(3500);

  const out = await ev(`(function(){
    var res = performance.getEntriesByType('resource').filter(function(e){ return /chars\\//.test(e.name); });
    var slots = [].slice.call(document.querySelectorAll('.sp-fig'));
    return {
      nav: Math.round(performance.timing.navigationStart ? (performance.now()) : 0),
      firstShow: window.__TL.firstShow, firstArt: window.__TL.firstArt, firstReal: window.__TL.firstReal,
      res: res.map(function(e){ return { n: e.name.split('/').pop(), start: Math.round(e.startTime), dur: Math.round(e.duration) }; }),
      status: window.TQA ? window.TQA.status : null,
      slots: slots.map(function(s){ return { key: s._tqKey || '', real: !!s.querySelector('.fig-real'), art: !!s.querySelector('.fig-art') }; })
    };
  })()`);

  console.log(JSON.stringify({ net: NET, steps, out }, null, 1));
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 200);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
