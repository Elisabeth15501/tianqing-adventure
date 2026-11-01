import sys, json
sys.path.insert(0,'_qa')
from iprobe import run
cases = [("guorong:a1"),("wangpu:a1"),("fuhou:a1"),("guowei:e3"),("zhaokuangyin:e1"),("fanzhi:a1"),("zongxun:a1"),("wangpu:e2")]
for (w,h) in [(390,844),(768,1024)]:
    print("=== %dx%d" % (w,h))
    for c in cases:
        d = run(w,h,"solo="+c, 12000)
        if not d: print("  %-16s NO-DATA" % c); continue
        f = d["figs"][0]; m = f["m"]
        print("  %-16s head=%3d k=%.3f headTop=%4d bodyw=%3d zoneH=%d" % (c, m["headPx"], m["k"], m["headTop"], m["body"]["w"], d["zone"]["h"]))
