/* 本轮 7 问题容器桩验证（测的是重建后的 minitool 目录，经 127.0.0.1:8947 提供）
 * ① TQA.observe 统一入口存在，fail 后冷却重试成功会回调 ready
 * ② 瓷片 shard-inner fail 后不再永久钉死：observe 挂 onLate → 重试成功 ready 重画 canvas
 * ③ 时间条 _tqUpdate 能按 ratio 改进度宽度 + 节点态
 * ④ 投壶换景 s6_yujin 失败会派发 tq-scene-fail → app.js 挂矢量兜底（不留纯黑底）
 * ⑤ 顶栏：xhs 延迟注入 + 回调形态 → --tq-top-inset / topRight 生效
 * 用法：node _qa/probe_v7_verify.cjs （需先起 8947 静态服务）
 */
const { spawn } = require('child_process');
const os = require('os');
const CHROME = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const PORT = 9367;
const URL = 'http://127.0.0.1:8947/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STUB = `
  setTimeout(function(){
    window.xhs={miniTool:{
      getWindowInfo:function(o){
        var i={windowWidth:390,windowHeight:844,safeArea:{top:44,bottom:34,left:0,right:390},
          menuButtons:{me:{top:47,bottom:81,left:296,right:332,width:36,height:34},
                       share:{top:47,bottom:81,left:338,right:378,width:40,height:34}}};
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
    '--user-data-dir=' + os.tmpdir() + '/cdp-v7-' + Date.now(), 'about:blank'], { stdio: 'ignore' });
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
  console.log('TQA', await ev('typeof window.TQA'), 'observe', await ev('typeof (window.TQA&&TQA.observe)'));

  // ① observe 存在 + fail 后冷却重试成功回调 ready
  const r1 = await ev(`new Promise(function(res){
    var k='shard-inner-4';
    TQA.retry(k);
    TQA.status[k]='fail'; TQA._failAt[k]=Date.now()-3000; TQA._retryN[k]=1;
    var readyCalled=0;
    TQA.observe(k,{ready:function(){readyCalled++;res(JSON.stringify({ready:readyCalled,st:TQA.status[k],inImgs:!!TQA.imgs[k]}));},
                   fail:function(){res(JSON.stringify({ready:readyCalled,st:'fail-again'}));}});
  })`);
  console.log('① OBSERVE_FAIL_RECOVER', r1);

  // ② 瓷片加载点接入 observe（源码断言，行为验证见独立 SPECIAL 探针）
  const r2 = await ev(`(function(){
    var k='shard-inner-4';
    return JSON.stringify({
      observeExport:typeof TQA.observe==='function',
      shardInnerUsesObserve:(F.shardInner+'').indexOf('observe')>=0,
      regExists:!!TQA.reg[k]
    });
  })()`);
  console.log('② SHARD_OBSERVE_WIRED', r2);

  // ③ 时间条 _tqUpdate（frag.js 挂在 F 全局，窗口别名是 F 不是 TQ）
  const r3 = await ev(`(function(){
    var tb=F.timebar([{t:'寅'},{t:'辰'},{t:'午'},{t:'酉'},{t:'终'}],0);
    document.body.appendChild(tb);
    if(typeof tb._tqUpdate!=='function') return JSON.stringify({err:'no updater'});
    tb._tqUpdate(2,0.6);
    var prog=tb.querySelector('.prog');
    return JSON.stringify({width:prog.style.width,cur:[].slice.call(tb.querySelectorAll('.tb-node')).map(function(n){return n.className;})});
  })()`);
  console.log('③ TIMEBAR_UPDATE', r3);

  // ④ 投壶换景失败兜底：Node 侧源码断言（app.js 监听 + scenes.js 派发，CDP 无法测内部函数）
  const fs = require('fs');
  const appSrc = fs.readFileSync('minitool/js/app.js', 'utf8');
  const scenesSrc = fs.readFileSync('minitool/js/scenes.js', 'utf8');
  console.log('④ SCENE_FAIL_WIRED', JSON.stringify({
    appListens: (appSrc.match(/tq-scene-fail/g) || []).length,
    scenesDispatches: (scenesSrc.match(/tq-scene-fail/g) || []).length,
    noQueryRetry: scenesSrc.indexOf("+'r=1'") < 0
  }));

  // ⑤ 顶栏
  const r5 = await ev(`(function(){var r=document.documentElement;return JSON.stringify({
    inset:r.style.getPropertyValue('--tq-top-inset'),
    topRight:r.style.getPropertyValue('--tq-topbar-right'),
    setTop:r.style.getPropertyValue('--tq-set-top'),
    appPad:getComputedStyle(document.querySelector('.app')||document.body).paddingTop
  });})()`);
  console.log('⑤ TOPBAR_SAFEAREA', r5);

  // 源码断言：三类瓷片加载点都已接入 observe（frag.js 全局别名是 F）
  const r6 = await ev(`(function(){
    return JSON.stringify({
      shardInnerUsesObserve:(F.shardInner+'').indexOf('observe')>=0,
      shardStillUsesObserve:(F.shardStill+'').indexOf('observe')>=0,
      spin3dUsesObserve:(F.spin3d+'').indexOf('observe')>=0,
      observeExport:typeof TQA.observe==='function'
    });
  })()`);
  console.log('⑥ LOAD_POINTS_UNIFIED', r6);

  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  ws.close(); proc.kill();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
