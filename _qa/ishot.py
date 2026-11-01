import sys, os, subprocess
sys.path.insert(0,'_qa')
import tp
from PIL import Image
from urllib.parse import quote
def shot(q,out,budget=20000,w=390,h=844):
    u = quote("dev-iv.html?"+q, safe="")
    url = "http://127.0.0.1:8765/preview/iframe-frame.html?w=%d&h=%d&u=%s&crop=1"%(w,h,u)
    tmp = os.path.abspath("_qa/_raw_iv.png")
    subprocess.run([tp.CHROME,"--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
        "--window-size=%d,%d"%(max(w+40,520),h+120),"--virtual-time-budget=%d"%budget,"--screenshot="+tmp,url],capture_output=True)
    im = Image.open(tmp); im.crop((0,0,w,min(im.height,560))).save(out)
    return im.size
if __name__=="__main__":
    print(shot(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv)>3 else 20000,
               int(sys.argv[4]) if len(sys.argv)>4 else 390,
               int(sys.argv[5]) if len(sys.argv)>5 else 844))
