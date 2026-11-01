# -*- coding: utf-8 -*-
"""派生放大验证页：全收集存档 → 自动进手札 → 点开指定瓷片 → 连点「放大」到 ~3x → 停留。

用法： python _qa/make_viewer_zoom.py <瓷片号> <输出html> [放大次数, 默认 3]
依赖当前 index.html（含 viewer.js），故永远跑的是最新代码。
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = os.path.join(ROOT, 'index.html')
sid = int(sys.argv[1]) if len(sys.argv) > 1 else 12
out = os.path.join(ROOT, sys.argv[2] if len(sys.argv) > 2 else '_qa_vz.html')
clicks = int(sys.argv[3]) if len(sys.argv) > 3 else 3

s = open(idx, encoding='utf-8').read()
INJECT = '''<script>
(function(){
  var sv={v:1,role:'nv',actIndex:2,step:0,
    shards:{'1':true,'3':true,'5':true,'7':true,'10':true,'12':true,'13':true,'14':true},
    deco:{},memories:{},taskDone:{},choices:{},updated:Date.now()};
  try{localStorage.setItem('tianqing_save_v1',JSON.stringify(sv));}catch(e){}
})();
</script>
'''
TAIL = '''<script>
(function(){
  var want=%d, clicks=%d, st=0;
  var iv=setInterval(function(){
    if(!window.TQApp){return;}
    if(st===0){ st=1; window.TQApp.memo(); return; }
    var cells=document.querySelectorAll('.memo-cell[role="button"]');
    if(cells.length && st===1){
      var hit=null;
      for(var i=0;i<cells.length;i++){ if(cells[i].getAttribute('data-sid')===String(want)){ hit=cells[i]; } }
      st=2; (hit||cells[0]).click();
    }
    if(st===2){
      var btn=document.querySelector('.shv-bar .shv-b');
      // 找到「放大」按钮
      var bs=document.querySelectorAll('.shv-bar .shv-b');
      for(var k=0;k<bs.length;k++){ if(bs[k].textContent==='放大'){ btn=bs[k]; break; } }
      if(btn && clicks>0){ btn.click(); clicks-=1; }
      if(clicks<=0){ clearInterval(iv); }
    }
  }, 700);
})();
</script>
''' % (sid, clicks)

s = s.replace('<script src="./js/data.js"></script>',
              INJECT + '<script src="./js/data.js"></script>', 1)
s = s.replace('</body>', TAIL + '</body>', 1)
open(out, 'w', encoding='utf-8').write(s)
print('written %s (shard #%02d, zoom clicks=%d)' % (out, sid, clicks))
