import sys, os, subprocess, json
sys.path.insert(0,'_qa')
import tp
from PIL import Image
from urllib.parse import quote
def run(w,h,query,budget=20000):
    u = quote("_lamp_calib.html?"+query, safe="")
    url = "http://127.0.0.1:8765/preview/iframe-frame.html?w=%d&h=%d&u=%s&crop=1"%(w,h,u)
    p = subprocess.run([tp.CHROME,"--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
        "--window-size=%d,%d"%(max(w+40,560),h+120),"--virtual-time-budget=%d"%budget,"--dump-dom",url],
        capture_output=True,text=True,encoding="utf-8",errors="replace")
    import re, html
    m = re.search(r'<pre id="json"[^>]*>(.*?)</pre>', p.stdout, re.S)
    if not m: return None
    txt = html.unescape(m.group(1))
    body,_,errs = txt.partition("|errs=")
    d = json.loads(body); d["_errs"]=json.loads(errs) if errs else []
    return d
def shot(w,h,query,out,budget=20000,pad=8):
    d = run(w,h,query,budget)
    u = quote("_lamp_calib.html?"+query, safe="")
    url = "http://127.0.0.1:8765/preview/iframe-frame.html?w=%d&h=%d&u=%s&crop=1"%(w,h,u)
    tmp = os.path.abspath("_qa/_raw_lamp.png")
    subprocess.run([tp.CHROME,"--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
        "--window-size=%d,%d"%(max(w+40,560),h+120),"--virtual-time-budget=%d"%budget,"--screenshot="+tmp,url],
        capture_output=True)
    im = Image.open(tmp)
    box=(0,0,w,min(im.height,h))
    if d and d.get('rect'):
        r=d['rect']; box=(max(0,r['x']-pad),max(0,r['y']-pad),min(im.width,r['x']+r['w']+pad),min(im.height,r['y']+r['h']+pad))
    im.crop(box).save(out)
    return box, (d if d else 'NO-DATA')
if __name__=="__main__":
    print(shot(int(sys.argv[1]),int(sys.argv[2]),sys.argv[3],sys.argv[4],int(sys.argv[5]) if len(sys.argv)>5 else 20000))
