const { chromium } = require('playwright');
const EXE='C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8951/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(800);
  const out=await p.evaluate(async()=>{
    const app=document.querySelector('.app')||document.body;
    const cases=[['s1_wanshou','v'],['s1_wanshou','h'],['s2_guangde','v'],['s5_zide','v'],['s4_pano','v']];
    const rows=[];
    for(const [k,f] of cases){
      const host=document.createElement('div');
      host.style.cssText='position:absolute;left:0;top:0;width:390px;height:844px;z-index:2';
      app.appendChild(host);
      let inst=null, err=null;
      try{ inst=window.TQScenes.mount(host,k,{form:f}); }catch(e){ err=String(e&&e.message); }
      await new Promise(r=>setTimeout(r,350));
      const bgs=[...host.querySelectorAll('.tqs-bg,.spl')].map(el=>({
        cls: el.className,
        hasImg: el.style.backgroundImage || '',
        size: getComputedStyle(el).backgroundSize
      }));
      const urls=bgs.map(x=>x.hasImg).filter(Boolean).map(v=>v.replace(/^url\("?|"?\)$/g,''));
      const stats=[];
      for(const u of urls.slice(0,4)){
        try{ const r=await fetch(u,{method:'HEAD'}); stats.push(r.status); }catch(e){ stats.push('ERR'); }
      }
      rows.push({key:k,form:f,imgCount:host.querySelectorAll('img').length,
                 layers:bgs.length, bgSize:bgs[0]?bgs[0].size:null, urls:urls.length,
                 http:stats, loaded: (inst&&typeof inst.loaded==="function")?!!inst.loaded():null, err});
      if(inst&&inst.destroy) inst.destroy();
      host.remove();
    }
    return rows;
  });
  out.forEach(r=>console.log(`${r.key}/${r.form}  img=${r.imgCount} layers=${r.layers} size=${r.bgSize} http=${r.http.join(",")} loaded=${r.loaded} err=${r.err}`));
  if(errs.length) console.log('pageerrors:',errs.slice(0,3));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
