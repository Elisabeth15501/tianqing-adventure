/* 定向验证 2026-11-17 三处新机制：
 * ① show 后 TQA.imgs 仍有位图（releasePortrait 已移除）
 * ② fail 冷却后 resolve 自动重取（不再永久钉死）
 * ③ fig-real 的 onerror 会撤破图 + 回退矢量 + TQA.retry 清状态
 * 用法：node _qa/probe_fix_verify.cjs
 */
const { spawn } = require('child_process');
const os = require('os');
const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9353;
const URL = 'http://127.0.0.1:8947/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STUB = `window.xhs={miniTool:{getWindowInfo:function(o){var i={windowWidth:390,windowHeight:844,safeArea:{top:44,bottom:34,left:0,right:390},menuButtons:{me:{top:47,bottom:81,left:296,right:332,width:36,height:34},share:{top:47,bottom:81,left:338,right:378,width:40,height:34}}};if(o&&o.success)o.success(i);return i;},getLaunchOptions:function(){return{miniToolEnv:{buildVersion:'9600000'}};},startGyroscope:function(){return Promise.resolve({errMsg:'ok'});},stopGyroscope:function(){return Promise.resolve({errMsg:'ok'});},onGyroscopeChange:function(){},offGyroscopeChange:function(){},setStorage:function(o){if(o&&o.success)o.success();},getStorage:function(o){if(o&&o.success)o.success({data:null});},removeStorage:function(o){if(o&&o.success)o.success();}}};`;

(async () => {
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    '--window-size=390,844', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + os.tmpdir() + '/cdp-fix-' + Date.now(), 'about:blank'], { stdio: 'ignore' });
  let u = null;
  for (let i = 0; i < 60 && !u; i++) {
    await sleep(200);
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p = l.find(x => x.type === 'page'); if (p) u = p.webSocketDebuggerUrl; } catch (e) {}
  }
  if (!u) { console.log('NO-CHROME'); proc.kill(); return; }
  const ws = new WebSocket(u);
  let id = 0; const pending = new Map(); const errs = [];
  const send = (m, p) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method: m, params: p || {} })); });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const q = pending.get(m.id); pending.delete(m.id); m.error ? q.rej(new Error(JSON.stringify(m.error))) : q.res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push('EXC: ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text));
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
  await send('Page.navigate', { url: URL });
  await sleep(2000);
  const ev = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }).then(r => r.result.value);

  // 找一个已注册的角色 ak
  const ak = await ev(`(function(){var k=Object.keys(TQA.reg).filter(function(x){return /^char-/.test(x);});return k[0]||null;})()`);
  console.log('AK', ak);

  // ① resolve 后位图应留在 imgs
  const r1 = await ev(`new Promise(function(res){TQA.resolve(${JSON.stringify(ak)},function(st){res(JSON.stringify({st:st,inImgs:!!TQA.imgs[${JSON.stringify(ak)}],lru:TQA._lru.length,src:!!TQA.srcs[${JSON.stringify(ak)}]}));});})`);
  console.log('① LRU_KEEP', r1);

  // ② 人为设 fail（把 _failAt 推到 3s 前）→ resolve 应自动重取成功
  const r2 = await ev(`new Promise(function(res){
    var k=${JSON.stringify(ak)};
    TQA.status[k]='fail'; TQA._failAt[k]=Date.now()-3000; TQA._retryN[k]=1;
    var before=TQA.status[k];
    TQA.retry_before=before;
    TQA.resolve(k,function(st){res(JSON.stringify({before:before,after:st,inImgs:!!TQA.imgs[k],retryN:TQA._retryN[k]}));});
  })`);
  console.log('② COOLDOWN_RETRY', r2);

  // ③ 自建槽 + bindSlot 走真实 TP.show → 拿 paintReal 绑定的 .fig-real
  await ev(`(function(){
    var s=document.createElement('div'); s.className='sp-fig'; document.body.appendChild(s);
    window.__tSlot=s;
    if(window.TP&&TP.bindSlot){TP.bindSlot(s); TP.show('guorong',{});}
    return true;
  })()`);
  await sleep(900);
  const r3 = await ev(`(function(){
    var pic=document.querySelector('.fig-real');
    if(!pic) return JSON.stringify({err:'no .fig-real on stage'});
    var slot=pic.parentNode;
    var before={real:!!document.querySelector('.fig-real'),hasReal:slot.classList.contains('has-real'),status:TQA.status[${JSON.stringify(ak)}]||'(none)'};
    pic.dispatchEvent(new Event('error'));
    return JSON.stringify({before:before,after:{real:!!slot.querySelector('.fig-real'),hasReal:slot.classList.contains('has-real'),figMiss:document.querySelectorAll('.fig-miss').length}});
  })()`);
  console.log('③ IMG_ONERROR_FALLBACK', r3);
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  ws.close(); proc.kill();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
