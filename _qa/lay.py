import subprocess, re, sys, json, html, os
from urllib.parse import quote
CHROME = r"C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"

def run(w, h, inner, budget=14000):
    url = "http://127.0.0.1:8765/preview/_probe_lay.html?w=%d&h=%d&u=%s" % (w, h, quote(inner, safe=''))
    p = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--window-size=%d,%d" % (w, h + 300),
        "--virtual-time-budget=%d" % budget, "--dump-dom", url],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r'<pre id="json"[^>]*>(.*?)</pre>', p.stdout, re.S)
    if not m:
        return None
    try:
        return json.loads(html.unescape(m.group(1)))
    except Exception:
        return None

def brief(d):
    if not d:
        return "NO-DATA"
    o = []
    o.append("vw=%d vh=%d wideMQ=%s midMQ=%s lift=%s" % (d["vw"], d["vh"], d["mq"]["wide"], d["mq"]["mid"], d["lift"]))
    z = d["zone"]
    o.append("zone r=%s attr=%s" % (z["r"], z["attrs"]))
    o.append("  cs: pos=%s disp=%s dir=%s ai=%s jc=%s w=%s h=%s pad=%s" % (
        z["cs"]["position"], z["cs"]["display"], z["cs"]["flex-direction"], z["cs"]["align-items"],
        z["cs"]["justify-content"], z["cs"]["width"], z["cs"]["height"], z["cs"]["padding"]))
    o.append("dlgBox=%s dock=%s" % (d["box"]["r"], d["dock"]["r"]))
    for f in d["figs"]:
        if not f["key"]:
            continue
        o.append("  FIG %s:%s %s" % (f["key"], f["slot"], f["attrs"]))
        o.append("     r=%s img=%s" % (f["r"], f["img"]))
        o.append("     cs pos=%s w=%s h=%s bottom=%s top=%s maxW=%s" % (
            f["cs"]["position"], f["cs"]["width"], f["cs"]["height"], f["cs"]["bottom"],
            f["cs"]["top"], f["cs"]["max-width"]))
        o.append("     vars scale=%s sx=%s shiftX=%s" % (f["vars"]["scale"], f["vars"]["sx"], f["vars"]["shiftX"]))
    o.append("errs=%s" % d["errs"])
    return "\n".join(o)

if __name__ == "__main__":
    w, h, inner = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    d = run(w, h, inner)
    print(brief(d))
    if "--json" in sys.argv:
        print(json.dumps(d, ensure_ascii=False, indent=1))
