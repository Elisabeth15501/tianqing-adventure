const { chromium } = require('playwright');
const EXE='C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const URL='http://127.0.0.1:8951/_qa/touhu_ptr_test.html?m=aim&qhide=1';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const p=await ctx.newPage();
  await p.goto(URL,{waitUntil:'load'});
  for(let i=0;i<60;i++){ const s=await p.evaluate(()=>window.TQM&&window.TQM.cur?window.TQM.cur.state():null); if(s&&s.ph==='aim')break; await p.waitForTimeout(150); }
  const r=await p.evaluate(()=>{
    const st=document.querySelector('.iv-stage'); const rect=st.getBoundingClientRect();
    const P=(t,x,y)=>st.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:5,pointerType:'touch',isPrimary:true,buttons:t==='pointerup'?0:1,clientX:rect.left+x,clientY:rect.top+y}));
    const out={};
    out.before=!!document.querySelector('#stage svg g[transform*="scale(-1,1)"]');
    // 右手：按在右半屏（220），向左上拖 → 镜像世界里的"向右上"
    P('pointerdown',220,168);
    out.afterDownMirror=!!document.querySelector('#stage svg g[transform*="scale(-1,1)"]');
    const hint=document.querySelector('#stage svg text[text-anchor="end"]');
    out.hint=(hint&&hint.textContent)||null;
    P('pointermove',130,80); P('pointermove',70,40);
    out.aim=window.TQM.cur.state().aim;
    P('pointerup',70,40);
    out.phAfterUp=window.TQM.cur.state().ph;
    out.fly=window.TQM.cur.state().fly;
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
