# -*- coding: utf-8 -*-
"""派生捏合验证页：全收集存档 → 进手札 → 点开瓷片 → 模拟双指捏合到 ~3x → 停留。

用法： python _qa/make_viewer_pinch.py <瓷片号> <输出html> [目标倍率, 默认 3]
内壁模式 zoom 只能靠捏合/双击，HUD「放大」按钮在该模式下是 no-op，
故这里用 PointerEvent 真实地走 pinch 路径（与真机手势等价）。
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = os.path.join(ROOT, 'index.html')
sid = int(sys.argv[1]) if len(sys.argv) > 1 else 12
out = os.path.join(ROOT, sys.argv[2] if len(sys.argv) > 2 else '_qa_vp.html')
target = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0

# 让捏合中心在舞台中部，起始双指间距 100px，目标间距 = 100*target
spread = 100.0 * target

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
  var want=%d, target=%f, spread=%f, st=0;
  function pe(cv,t,id,x,y){
    var ev=new PointerEvent(t,{pointerId:id,clientX:x,clientY:y,bubbles:true,pointerType:'touch',cancelable:true});
    cv.dispatchEvent(ev);
  }
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
      var cv=document.querySelector('.shv-stage canvas');
      if(!cv){ return; }
      var r=cv.getBoundingClientRect();
      var cx=r.left+r.width/2, cy=r.top+r.height/2, half=50;
      // 起始双指间距 100（half*2）
      pe(cv,'pointerdown',1, cx-half, cy);
      pe(cv,'pointerdown',2, cx+half, cy);
      // 拉开到 spread
      var h2=spread/2;
      pe(cv,'pointermove',1, cx-h2, cy);
      pe(cv,'pointermove',2, cx+h2, cy);
      pe(cv,'pointerup',1, cx-h2, cy);
      pe(cv,'pointerup',2, cx+h2, cy);
      clearInterval(iv);
    }
  }, 700);
})();
</script>
''' % (sid, target, spread)

s = s.replace('<script src="./js/data.js"></script>',
              INJECT + '<script src="./js/data.js"></script>', 1)
s = s.replace('</body>', TAIL + '</body>', 1)
open(out, 'w', encoding='utf-8').write(s)
print('written %s (shard #%02d, pinch->%.1fx)' % (out, sid, target))
