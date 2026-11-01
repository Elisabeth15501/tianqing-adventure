# -*- coding: utf-8 -*-
"""从当前 index.html 派生验收页：注入全收集存档 → 自动进手札 → 点开第 N 枚瓷片。

为什么要脚本而不是存一份静态副本：index.html 的 script 列表会变（viewer.js 就是新加的），
静态副本一旦不同步，验收页会「跑起来像坏了一样」——实际是没加载新模块。

用法： python _qa/make_viewer_check.py [瓷片号，默认 1] [输出名，默认 _qa_viewer.html]
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = os.path.join(ROOT, 'index.html')
sid = int(sys.argv[1]) if len(sys.argv) > 1 else 1
out = os.path.join(ROOT, sys.argv[2] if len(sys.argv) > 2 else '_qa_viewer.html')

s = open(idx, encoding='utf-8').read()

INJECT = '''<script>
(function(){
  var s={v:1,role:'nv',actIndex:2,step:0,
    shards:{'1':true,'3':true,'5':true,'7':true,'10':true,'12':true,'13':true,'14':true},
    deco:{},memories:{},taskDone:{},choices:{},updated:Date.now()};
  try{ localStorage.setItem('tianqing_save_v1',JSON.stringify(s)); }catch(e){}
})();
</script>
'''

TAIL = '''<script>
(function(){
  var want=%d, st=0;
  var iv=setInterval(function(){
    if(!window.TQApp){return;}
    if(st===0){ st=1; window.TQApp.memo(); return; }
    var cells=document.querySelectorAll('.memo-cell[role="button"]');
    if(cells.length && st===1){
      var hit=null;
      for(var i=0;i<cells.length;i++){ if(cells[i].getAttribute('data-sid')===String(want)){ hit=cells[i]; } }
      st=2; (hit||cells[0]).click();
    }
  },80);
})();
</script>
''' % sid

# 存档注入必须在 app.js 读档之前（放在 data.js 之前）
s = s.replace('<script src="./js/data.js"></script>',
              INJECT + '<script src="./js/data.js"></script>', 1)
s = s.replace('</body>', TAIL + '</body>', 1)
open(out, 'w', encoding='utf-8').write(s)
print('written %s (target #%02d)' % (out, sid))
