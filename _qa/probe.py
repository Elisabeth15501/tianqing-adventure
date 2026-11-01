import subprocess, re, sys, json, html
CHROME = r"C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
def run(w, h, query, budget=16000):
    url = "http://127.0.0.1:8765/preview/dev-fig-metrics.html?" + query
    p = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--window-size=%d,%d" % (w, h),
        "--virtual-time-budget=%d" % budget, "--dump-dom", url],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r'<pre id="devlog">(.*?)</pre>', p.stdout, re.S)
    if not m:
        return None
    txt = html.unescape(m.group(1))
    try:
        return json.loads(txt.split("\nerrs=")[0])
    except Exception as e:
        return {"_raw": txt[:800], "_err": str(e)}
if __name__ == "__main__":
    w, h, q = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    d = run(w, h, q)
    print(json.dumps(d, ensure_ascii=False, indent=1))
