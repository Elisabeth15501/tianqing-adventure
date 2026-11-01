/* 回忆舞台双人演出探针（2026-11-02）
 * 用法：node _qa/cdp_mem.js --mem fengdao --view 390x780 [--shot out.png]
 * 深链：dev-scene.html?act=chen&step=20 命中 {type:'memory',id:'fengdao'}
 * 逐步轻点 .mem-stage 推进，每步 dump：可见槽 / 立绘 key / data-st / filter / 头顶 y。
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9337;

const args = process.argv.slice(2);
function arg(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
}
const MEM = arg('mem', 'fengdao');
const VIEW = arg('view', '390x780');
const SHOT = arg('shot', '');
const ENTRY = {
  guowei: 'dev-scene.html?act=yin&step=11&next=0&role=nv',
  fengdao: 'dev-scene.html?act=chen&step=20&next=0&role=nv',
  chashi: 'dev-scene.html?act=wu&step=15&next=0&role=nv',
  suiweng: 'dev-scene.html?act=you&step=11&next=0&role=nv',
}[MEM] || 'dev-scene.html?act=chen&step=20&next=0&role=nv';

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
    '--user-data-dir=' + require('os').tmpdir() + '/tq_mem_' + Date.now(),
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
    if (r.result && r.result.exceptionDetails) { return { __err: (r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) || r.result.exceptionDetails.text }; }
    return r.result && r.result.result ? r.result.result.value : null;
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/preview/' + ENTRY });
  await sleep(2600);
  for (let i = 0; i < 40; i += 1) {
    const ok = await evaluate("!!(document.querySelector('.dlg-box') && window.TP)");
    if (ok) break;
    await sleep(250);
  }

  /* 剧情起播后回忆步会自己弹出 .mem-stage；没弹就点一下对话框推进到它 */
  let stage = false;
  for (let i = 0; i < 20; i += 1) {
    stage = await evaluate("!!document.querySelector('.mem-stage')");
    if (stage) break;
    await evaluate("(function(){var b=document.querySelector('.dlg-box'); if(b) b.click(); return 1;})()");
    await sleep(600);
  }
  if (!stage) { console.log(JSON.stringify({ err: 'mem-stage 未出现' })); ws.close(); chrome.kill(); process.exit(1); }
  await sleep(900);

  const steps = parseInt(arg('steps', '12'), 10);
  const frames = [];
  for (let k = 0; k < steps; k += 1) {
    const snap = await evaluate(`(function(){
      var st = document.querySelector('.mem-stage');
      if (!st) { return { done: true }; }
      var figs = st.querySelector('.mem-figs');
      var out = { n: figs ? figs.getAttribute('data-n') : null, prog: (st.querySelector('.mem-stage-prog')||{}).textContent,
                  line: ((st.querySelector('.mem-line')||{}).textContent||'').slice(0,14),
                  plate: (st.querySelector('.mem-plate')||{}).textContent };
      out.slots = [].slice.call(st.querySelectorAll('.mem-fig')).map(function(s){
        var img = s.querySelector('img');
        var r = s.getBoundingClientRect();
        var top = r.height ? (function(){ /* 头顶：槽顶即图顶（contain 底对齐→图贴槽底，头顶≈槽顶+空隙） */
          return null; })() : null;
        return { side: s.getAttribute('data-side'), st: s.getAttribute('data-st'),
                 vis: r.width > 0 && !!s.firstChild,
                 key: (img && img.src || '').split('/').pop().replace(/tq_chars_|_final\\.webp/g,''),
                 filter: getComputedStyle(s).filter,
                 w: Math.round(r.width), bottom: Math.round(r.bottom),
                 imgTop: img ? Math.round(img.getBoundingClientRect().top) : null };
      });
      return out;
    })()`);
    frames.push(snap);
    if (snap.done) break;
    /* 截双人同框那一步（第三帧，郭荣+冯道都在台上） */
    if (k === 3 && SHOT) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot.result && shot.result.data) fs.writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64'));
    }
    await evaluate("(function(){var s=document.querySelector('.mem-stage'); if(s) s.click(); return 1;})()");
    await sleep(760);
  }

  console.log(JSON.stringify({ mem: MEM, view: VIEW, frames }, null, 1));
  ws.close();
  chrome.kill();
  setTimeout(() => process.exit(0), 300);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
