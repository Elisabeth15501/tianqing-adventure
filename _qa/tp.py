import subprocess, re, json, html, sys
from urllib.parse import quote
CHROME = r"C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
def run(w,h,query,budget=18000,page="dev-touhu.html"):
    u = quote(page+"?"+query, safe="")
    url = "http://127.0.0.1:8765/preview/iframe-frame.html?w=%d&h=%d&u=%s&crop=1"%(w,h,u)
    p = subprocess.run([CHROME,"--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
        "--window-size=%d,%d"%(max(w+40,520),h+80),"--virtual-time-budget=%d"%budget,"--dump-dom",url],
        capture_output=True,text=True,encoding="utf-8",errors="replace")
    m = re.search(r'<pre id="json"[^>]*>(.*?)</pre>', p.stdout, re.S)
    if not m: return None
    txt = html.unescape(m.group(1))
    body,_,errs = txt.partition("|errs=")
    d = json.loads(body); d["_errs"]=json.loads(errs) if errs else []
    return d
if __name__=="__main__":
    w,h,q = int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]
    b = int(sys.argv[4]) if len(sys.argv)>4 else 18000
    pg = sys.argv[5] if len(sys.argv)>5 else "dev-touhu.html"
    d = run(w,h,q,b,pg)
    print(json.dumps(d,ensure_ascii=False,indent=1) if d else "NO-DATA")

def shot(w,h,query,out,budget=20000,ch=300,page="dev-touhu.html"):
    import os
    u = quote(page+"?"+query, safe="")
    url = "http://127.0.0.1:8765/preview/iframe-frame.html?w=%d&h=%d&u=%s&crop=1"%(w,h,u)
    tmp = os.path.abspath("_qa/_raw_touhu.png")
    subprocess.run([CHROME,"--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
        "--window-size=%d,%d"%(max(w+40,520),h+120),"--virtual-time-budget=%d"%budget,
        "--screenshot="+tmp,url],capture_output=True)
    from PIL import Image
    im = Image.open(tmp)
    im.crop((0,0,w,ch)).save(out)
    return im.size
