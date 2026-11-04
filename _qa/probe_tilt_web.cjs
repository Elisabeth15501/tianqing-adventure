const { chromium } = require('playwright');
const EXE='C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:390,height:844}});
  const reqs=[]; p.on('request',r=>{ if(/tilt-web\.js/.test(r.url())) reqs.push(r.url()); });
  await p.goto('http://127.0.0.1:8951/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{
    if(!window.TiltController) return {err:'no TiltController'};
    const c=new window.TiltController({onUpdate:function(){}});
    const kind=await c.start(null);
    const out={kind:kind, status:(c.status&&c.status())||null,
      webSrcLoaded:typeof window.OrientationSource==='function',
      hasDeviceOrientation:typeof window.DeviceOrientationEvent!=='undefined'};
    try{c.stop();}catch(e){}
    return out;
  });
  console.log('tilt-web requested:',reqs.length, reqs[0]?reqs[0].split('/').pop():'-');
  console.log(JSON.stringify(r));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
