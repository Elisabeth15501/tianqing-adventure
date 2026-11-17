/* 针对用户 2026-11-17 23:04-23:22 截图三问题的容器桩验证（测的是实际交付 zip 解压目录）
 * ① 立绘 resolve 后位图留在 LRU（releasePortrait 已移除）
 * ② fail 冷却后 resolve 自动重取（不再永久钉死）
 * ③ fig-real 二次 onerror 撤破图 + 回退矢量 + TQA.retry
 * ④ 顶栏：xhs 异步注入 + getWindowInfo 回调形态下 --tq-top-inset / topRight 生效
 * 用法：node _qa/probe_containerfix2_verify.cjs
 */
const { spawn } = require('child_process');
const os = require('os');
const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9362;
const URL = 'http://127.0.0.1:8947/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* 模拟平台胶囊按钮在右上角，且 xhs 桥延迟 600ms 注入 */
const STUB = `
  setTimeout(function(){
    window.xhs={miniTool:{
      getWindowInfo:function(o){
        var i={windowWidth:390,windowHeight:844,safeArea:{top:44,bottom:34,left:0,right:390},
          menuButtons:{me:{top:47,bottom:81,left:296,right:332,width:36,height:34},share:{top:47,bottom:81,left:338,right:378,width:40,height:34}}};
        if(o&&o.success)o.success(i);
        return Promise.resolve(i);
      },
      getLaunchOptions:function(){return {miniToolEnv:{buildVersion:'9600000'}};},
      startGyroscope:function(){return Promise.resolve({errMsg:'ok'});},
      stopGyroscope:function(){return Promise.resolve({errMsg:'ok'});},
      onGyroscopeChange:function(){},offGyroscopeChange:function(){},
      setStorage:function(o){if(o&&o.success)o.success();},
      getStorage:function(o){if(o&&o.success)o.success({data:null});},
      removeStorage:function(o){if(o&&o.success)o.success();}
    }};
  }, 600);
`;

(async () => {
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-proxy-server',
    '--window-size=390,844', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + os.tmpdir() + '/cdp-cfix2-' + Date.now(), 'about:blank'], { stdio: 'ignore' });
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
  await sleep(2600);
  const ev = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }).then(r => r.result && r.result.value);

  console.log('URL', await ev('location.href'));
  console.log('TQA', await ev('typeof window.TQA'), 'reg', await ev('window.TQA?Object.keys(TQA.reg).length:-1'));

  const ak = await ev(`(function(){var k=Object.keys(TQA.reg||{}).filter(function(x){return /^char-/.test(x);});return k[0]||null;})()`);
  console.log('AK', ak);
  if (!ak) { console.log('FATAL: no TQA reg'); ws.close(); proc.kill(); return; }

  const r1 = await ev(`new Promise(function(res){TQA.resolve(${JSON.stringify(ak)},function(st){res(JSON.stringify({st:st,inImgs:!!TQA.imgs[${JSON.stringify(ak)}],lru:TQA._lru.length,src:!!TQA.srcs[${JSON.stringify(ak)}]}));});})`);
  console.log('① LRU_KEEP', r1);

  const r2 = await ev(`new Promise(function(res){
    var k=${JSON.stringify(ak)};
    TQA.status[k]='fail'; TQA._failAt[k]=Date.now()-3000; TQA._retryN[k]=1;
    TQA.resolve(k,function(st){res(JSON.stringify({after:st,inImgs:!!TQA.imgs[k],retryN:TQA._retryN[k]}));});
  })`);
  console.log('② COOLDOWN_RETRY', r2);

  await ev(`(function(){var s=document.createElement('div');s.className='sp-fig';document.body.appendChild(s);if(window.TP&&TP.bindSlot){TP.bindSlot(s);TP.show('guorong',{});}return true;})()`);
  await sleep(900);
  const r3 = await ev(`(function(){
    var pic=document.querySelector('.fig-real');
    if(!pic) return JSON.stringify({err:'no .fig-real'});
    var slot=pic.parentNode;
    pic.dispatchEvent(new Event('error'));
    return JSON.stringify({after:{real:!!slot.querySelector('.fig-real'),hasReal:slot.classList.contains('has-real'),figMiss:document.querySelectorAll('.fig-miss').length}});
  })()`);
  console.log('③ IMG_ONERROR_FALLBACK', r3);

  const r4 = await ev(`(function(){var r=document.documentElement;return JSON.stringify({
    inset:r.style.getPropertyValue('--tq-top-inset'),
    topRight:r.style.getPropertyValue('--tq-topbar-right'),
    setTop:r.style.getPropertyValue('--tq-set-top'),
    appPad:getComputedStyle(document.querySelector('.app')||document.body).paddingTop
  });})()`);
  console.log('④ TOPBAR_SAFEAREA', r4);
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  ws.close(); proc.kill();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
