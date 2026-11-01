import subprocess, sys, os
from urllib.parse import quote
from PIL import Image
CHROME = r"C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
def shot(w, h, query, out):
    u = quote("dev-scene.html?" + query, safe="")
    url = "http://127.0.0.1:8765/preview/iframe-frame.html?w=%d&h=%d&u=%s&crop=1" % (w, h, u)
    tmp = os.path.abspath("_qa/_raw_shot.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        "--window-size=%d,%d" % (w, h + 260), "--virtual-time-budget=16000",
        "--screenshot=" + tmp, url], capture_output=True)
    im = Image.open(tmp)
    im.crop((0, 0, w, h)).save(out)
    return im.size
if __name__ == "__main__":
    w, h, q, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
    print(shot(w, h, q, out), "->", out)
