/* 立绘「真的上屏了吗」诊断：不看有没有 .fig-real 节点，看它有没像素。
 *
 * 跑法：node _qa/cdp_diag.js [--net none|fast4g|slow3g] [--view 390x780]
 *
 * 逐屏 dump：
 *   slot 的 rect / 计算样式（display/height/opacity/z-index/visibility）
 *   img 的 naturalWidth×naturalHeight / rect / object-fit / transform / opacity
 *   TQA.status、reg 里 char-* 数量、每个资源请求的 HTTP 状态与耗时
 */
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9336;
const args = process.argv.slice(2);
const arg = (n, d) => (args.indexOf('--' + n) >= 0 ? args[args.indexOf('--' + n) + 1] : d);
const NET = arg('net', 'none');
const VIEW = arg('view', '390x780');
const PROFILES = {
  none: null,
  fast4g: { latency: 60, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 640 * 1024 / 8 },
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
    '--user-data-dir=' + os.tmpdir() + '/tq_diag_' + Date.now(), 'about:blank',
  ], { stdio: 'ignore' });

  let list = null;
  for (let i = 0; i < 60; i += 1) {
    await sleep(200);
    try { list = await getJSON('/json/list'); if (list && list.length) break; } catch (e) {}
  }
  const target = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const waiting = new Map();
  const netLog = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return; }
    if (m.method === 'Network.responseReceived' && /chars\//.test(m.params.response.url)) {
      netLog.push({ n: m.params.response.url.split('/').pop(), st: m.params.response.status, mime: m.params.response.mimeType });
    }
    if (m.method === 'Network.loadingFailed') {
      netLog.push({ fail: m.params.errorText, id: m.params.requestId });
    }
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

  const prof = PROFILES[NET];
  if (prof) await send('Network.emulateNetworkConditions', { offline: false, ...prof });

  /* 冷启动：清存档 → 走加载页/标题 → 入宫当值 → 选身份 → 进第一幕 */
  await ev("try{localStorage.removeItem('tianqing_save_v1');localStorage.removeItem('tq_assets_mode')}catch(e){}");
  await send('Page.reload', { ignoreCache: true });
  await sleep(2000);

  async function clickText(re, tries) {
    for (let i = 0; i < (tries || 40); i += 1) {
      const ok = await ev(`(function(){
        var b = [].slice.call(document.querySelectorAll('button,.btn,a')).filter(function(n){
          return ${re}.test((n.textContent||'').trim()) && n.offsetParent !== null;
        })[0];
        if (b) { b.click(); return (b.textContent||'').trim(); } return false;
      })()`);
      if (ok) return ok;
      await sleep(250);
    }
    return false;
  }

  async function clickSel(sel, tries) {
    for (let i = 0; i < (tries || 40); i += 1) {
      const ok = await ev(`(function(){ var b = document.querySelector(${JSON.stringify(sel)}); if (b) { b.click(); return (b.textContent||'').trim().slice(0,20); } return false; })()`);
      if (ok) return ok;
      await sleep(250);
    }
    return false;
  }

  const trace = [];
  /* 状态机：真实链路是 加载页 →（入宫当值）→ 标题页 →（入宫当值）→ 身份页 →（选卡）→ 进幕。
   * 按钮文案会重复出现（标题页/加载页都叫「入宫当值」），所以按「页面上出现了什么」推进，
   * 不能按文案点。 */
  for (let i = 0; i < 24; i += 1) {
    const st = await ev(`(function(){
      var roleN = document.querySelectorAll('.role-item').length;
      var btn = [].slice.call(document.querySelectorAll('button')).filter(function(b){
        return b.offsetParent !== null && !b.disabled && /入宫当值|继续值守|开始/.test((b.textContent||'').trim());
      })[0];
      return { roleN: roleN, btn: btn ? (btn.textContent||'').trim().slice(0,8) : null,
               body: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,46) };
    })()`);
    trace.push([i, st]);
    if (st && st.roleN > 0) {
      trace.push(['点身份卡', await ev("(function(){ var b=document.querySelector('.role-item'); b.click(); return (b.textContent||'').trim().slice(0,12); })()")]);
      await sleep(2600);
      break;
    }
    if (st && st.btn) {
      await ev("(function(){ var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return x.offsetParent!==null&&!x.disabled&&/入宫当值|继续值守|开始/.test((x.textContent||'').trim());})[0]; b.click(); return 1; })()");
      await sleep(1500);
      continue;
    }
    await sleep(500);
  }

  const probe = `(function(){
    var slots = [].slice.call(document.querySelectorAll('.sp-fig'));
    function cs(n, keys){ var s = getComputedStyle(n), o = {}; keys.forEach(function(k){ o[k] = s.getPropertyValue(k); }); return o; }
    function rect(n){ var b = n.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }
    return {
      where: location.pathname + location.search,
      body: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,90),
      zone: (function(){ var z = document.querySelector('.sp-zone'); return z ? { r: rect(z), cs: cs(z, ['display','flex-direction','position','overflow']) } : null; })(),
      slots: slots.map(function(s){
        var img = s.querySelector('.fig-real');
        var art = s.querySelector('.fig-art');
        return {
          key: s._tqKey || '', slot: s._tqSlot || '',
          data: { side: s.getAttribute('data-side'), anchor: s.getAttribute('data-anchor'), fit: s.getAttribute('data-fit'), duo: s.getAttribute('data-duo') },
          r: rect(s),
          cs: cs(s, ['display','position','height','width','opacity','visibility','z-index','overflow']),
          vars: { scale: s.style.getPropertyValue('--fig-scale'), sx: s.style.getPropertyValue('--fig-sx'), dx: s.style.getPropertyValue('--fig-shift-x'), dy: s.style.getPropertyValue('--fig-shift-y') },
          hasArt: !!art, hasReal: !!img,
          img: img ? {
            src: img.getAttribute('src'), inst: img.getAttribute('data-instant'),
            nat: img.naturalWidth + 'x' + img.naturalHeight,
            complete: img.complete, r: rect(img),
            cs: cs(img, ['display','position','object-fit','object-position','opacity','transform','width','height','visibility','z-index'])
          } : null
        };
      }),
      tqa: window.TQA ? {
        regChars: Object.keys(TQA.reg).filter(function(k){return /^char-/.test(k);}).length,
        status: TQA.status, env: TQA.env, mode: TQA.assetsMode(),
        regSample: (function(){ var k = Object.keys(TQA.reg).filter(function(x){return /^char-/.test(x);})[0]; return k ? (k + ' → ' + TQA.reg[k].src) : null; })()
      } : null,
      errs: (window.__errs || []).slice(0, 6)
    };
  })()`;

  const screens = [];
  screens.push(['进幕后', await ev(probe)]);
  /* 连点 4 次推进，每次 dump */
  for (let i = 0; i < 4; i += 1) {
    await ev(`(function(){ var b = document.querySelector('.dlg-box,.dlg-dock,.vn-doc') || document.body; b.click(); return 1; })()`);
    await sleep(1400);
    screens.push(['推进 ' + (i + 1), await ev(probe)]);
  }

  /* 缺失角标验收：强制把某角色判 fail，再 show 一次，看槽里是否挂出 .fig-miss */
  const missBadge = await ev(`(function(){
    try {
      if (!window.TP || !TP._slot) { return { __err: 'no slot' }; }
      var ak = TP.akOf('fanzhi');
      TQA.status[ak] = 'fail';
      TP.show('ligu', { fill: true });
      TP.show('fanzhi', { fill: true });
      return new Promise(function(res){
        setTimeout(function(){
          var m = TP._slot.querySelector('.fig-miss');
          res({ ak: ak, hasMiss: !!m, text: m ? m.textContent : null, href: m ? m.getAttribute('href') : null });
        }, 900);
      });
    } catch (e) { return { __err: String(e && e.stack || e) }; }
  })()`);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result && shot.result.data) {
    require('fs').writeFileSync('_qa/_diag_' + VIEW + '.png', Buffer.from(shot.result.data, 'base64'));
  }

  const res = await ev(`performance.getEntriesByType('resource').filter(function(e){return /chars\\//.test(e.name);}).map(function(e){
    return { n: e.name.split('/').pop(), start: Math.round(e.startTime), dur: Math.round(e.duration), size: e.transferSize, enc: e.encodedBodySize };
  })`);

  console.log(JSON.stringify({ net: NET, view: VIEW, trace, screens, res, netLog, missBadge }, null, 1));
  ws.close(); chrome.kill(); setTimeout(() => process.exit(0), 200);
})().catch((e) => { console.error('ERR', e && e.stack || e); process.exit(1); });
