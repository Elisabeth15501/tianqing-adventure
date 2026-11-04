const { chromium } = require('playwright');
const EXE='C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto('http://127.0.0.1:8951/_qa/folk_probe.html',{waitUntil:'load'});
  await p.waitForTimeout(300);
  await p.evaluate(()=>window.TQM.cur.beat(2));
  await p.waitForTimeout(120);
  const r=await p.evaluate(()=>{
    const st=document.querySelector('#stage'); const rect=st.getBoundingClientRect();
    const at=(x,y)=>({clientX:rect.left+x, clientY:rect.top+y});
    const P=(t,x,y)=>st.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',isPrimary:true,buttons:t==='pointerup'?0:1,...at(x,y)}));
    const out={};
    // A) 远离丝头（40,40）按下：应提示、不记进度
    P('pointerdown',40,40); P('pointerup',40,40);
    out.afterFarDown={wound:window.__st().wound, acc:window.__st().acc, down:window.__st().down, tips:window.__tips.slice(-1)};
    // B) 捏住丝头（182,106）绕一圈
    P('pointerdown',182,106);
    for(let i=0;i<=40;i++){ const a=i/40*Math.PI*2; P('pointermove',182+34*Math.cos(a),106+34*Math.sin(a)); }
    out.afterGrab={wound:window.__st().wound, acc:window.__st().acc, down:window.__st().down, pts:window.__st().pts};
    P('pointerup',216,106);
    out.afterUp={wound:window.__st().wound, down:window.__st().down, grabReleased:true};
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
