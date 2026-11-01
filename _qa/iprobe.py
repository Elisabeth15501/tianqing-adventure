import subprocess, re, sys, json, html
CHROME = r"C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
def run(w, h, query, budget=22000):
    from urllib.parse import quote
    u = quote("dev-fig-metrics.html?" + query, safe="")
    url = "http://127.0.0.1:8765/preview/iframe-frame.html?w=%d&h=%d&u=%s&crop=1" % (w, h, u)
    p = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--window-size=%d,%d" % (max(w+40,520), h+80),
        "--virtual-time-budget=%d" % budget, "--dump-dom", url],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r'<pre id="json"[^>]*>(.*?)</pre>', p.stdout, re.S)
    if not m:
        return None
    txt = html.unescape(m.group(1))
    body, _, errs = txt.partition("|errs=")
    d = json.loads(body)
    d["_errs"] = json.loads(errs) if errs else []
    return d
def brief(d):
    if not d: return "NO-DATA"
    out = ["vw=%d vh=%d zone=%s dlg=%s" % (d["vw"], d["vh"], d["zone"], d["dlgBox"])]
    for f in d["figs"]:
        m = f["m"]
        out.append("  %-2s %-14s %-4s head=%3d body x=%4d w=%3d (r=%4d) headTop=%4d k=%.3f mir=%s"
                   % (f["side"], f["key"], f["slot"], m["headPx"], m["body"]["x"], m["body"]["w"],
                      m["body"]["x"]+m["body"]["w"], m["headTop"], m["k"], m["mir"]))
    if len(d["figs"]) > 1:
        a, b = d["figs"][0]["m"]["body"], d["figs"][1]["m"]["body"]
        gap = max(a["x"], b["x"]) - min(a["x"]+a["w"], b["x"]+b["w"])
        out.append("  gap=%d" % gap)
    out.append("  errs=%s" % d["_errs"])
    return "\n".join(out)
if __name__ == "__main__":
    w, h, q = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    d = run(w, h, q)
    print(brief(d))
    if "--json" in sys.argv: print(json.dumps(d, ensure_ascii=False, indent=1))
