import io, shutil
SRC = r'C:/Users/elisa/WorkBuddy/2026-10-06-01-43-11/游戏设计档案/01_游戏UI/B类占位_手感校准页.html'
DST = r'C:/Users/elisa/dev/tianqing-adventure/preview/_lamp_calib.html'
INJECT = """
<script>
(function(){
  var q={}; location.search.replace(/^\\?/,'').split('&').forEach(function(kv){ if(!kv){return;} var p=kv.split('='); q[decodeURIComponent(p[0])]=decodeURIComponent(p[1]||''); });
  window.__errs=[];
  window.onerror=function(m,s2,l,c){ window.__errs.push(m+' @'+l+':'+c); };
  if(!window.__tq){ document.title='NO_TQ'; return; }
  var idx=window.__tq.sections().findIndex(function(x){ return x.id==='lamp'; });
  window.__tq.pick(idx);
  var beat = q.beat ? +q.beat : 0;
  if (beat) { for (var i=0;i<beat;i++){ window.__tq.next(); } }
  if (q.oil) { setTimeout(function(){ RUN.oilY = +q.oil; draw(); }, 400); }
  if (q.auto) { setTimeout(function(){ window.__tq.auto(+q.auto); }, 500); }
  if (q.full) {
    /* 一拍一拍走：判定过了就点下一拍，没过就再演一次（步进由页面状态驱动，不靠猜时间） */
    var iv = setInterval(function(){
      var s2 = window.__tq.state();
      if (s2.finished) { clearInterval(iv); window.__done = true; return; }
      if (s2.done) { window.__tq.next(); } else { window.__tq.auto(1); }
    }, 900);
  }
  var T0=performance.now();
  setInterval(function(){
    if (performance.now()-T0 < (q.wait?+q.wait:1500)) { return; }   /* 补间/自动动作跑完再发布 */
    var st2=window.__tq.state();
    window.__metrics = { beat:st2.beat, label:st2.label, gtype:st2.gtype, prog:st2.prog,
      verdicts:st2.verdicts, grade:st2.grade, lampDy:Math.round(st2.lampDy), oilY:st2.oilY, oilFen:st2.oilFen,
      oilTxt:st2.oilTxt, spilled:st2.spilled, lightN:st2.lightN, flameK:st2.flameK,
      errs:window.__errs.slice(),
      rect:(function(){ var e=document.getElementById('stage'); if(!e){return null;} var r=e.getBoundingClientRect(); return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}; })()
    };
  }, 200);
})();
</script>
</body>"""
s = io.open(SRC, encoding='utf-8').read()
s = s.replace("</body>", INJECT, 1) if s.count("</body>")==1 else s
io.open(DST,'w',encoding='utf-8',newline='').write(s)
print('copy ok')
