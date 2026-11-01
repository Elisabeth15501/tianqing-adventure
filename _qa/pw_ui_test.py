# -*- coding: utf-8 -*-
"""横版立绘排布 · UI 回归测试（Playwright 内置 Chromium · headless）

跑法：python _qa/pw_ui_test.py            # 全矩阵
      python _qa/pw_ui_test.py --only wide  # 只跑横版

判定口径全部走 DOM（getComputedStyle / getBoundingClientRect），不看截图：
截图只能看"糊不糊"，位置错位必须量。视口用固定尺寸 iframe 造（Chrome for Windows
最小窗宽约 500px，直接 --window-size=390 会量到 500 宽，竖版断点全失真）。
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lay

BASE = "dev-scene.html?act=chen&step=12&next=2&noanim=1"

CASES = [
    # (视口, 标签, 场景, 是否横版基线)
    ((1080, 536), "单人·全身", "&solo=ligu:a1", "wide"),
    ((1080, 536), "双人·全身", "&duo=fanzhi:a1,ligu:a1", "wide"),
    ((1080, 536), "双人·立+跪", "&duo=guorong:a1,fuhou:a1", "wide"),
    ((1080, 536), "单人·胸像", "&solo=shangshiling:a1", "wide"),
    ((1280, 720), "单人·全身", "&solo=ligu:a1", "wide"),
    ((1280, 720), "双人·全身", "&duo=fanzhi:a1,ligu:a1", "wide"),
    ((1280, 720), "双人·立+跪", "&duo=guorong:a1,fuhou:a1", "wide"),
    ((1440, 800), "双人·全身", "&duo=fanzhi:a1,ligu:a1", "wide"),
    ((390, 740), "竖版·单人（基线不变）", "&solo=ligu:a1", "port"),
    ((390, 740), "竖版·双人（基线不变）", "&duo=fanzhi:a1,ligu:a1", "port"),
    ((768, 1024), "中屏·单人（基线不变）", "&solo=ligu:a1", "mid"),
    ((768, 1024), "中屏·双人（基线不变）", "&duo=fanzhi:a1,ligu:a1", "mid"),
]

# 竖版/中屏基线：头宽沿用 2026-11-01 实测（本轮未动 k 归一化）。
# 中缝 11-02 更新：双人镜像由「右位一律翻」改为「按 FACE 原生朝向翻」后，
# 左位角色（原生朝左）镜像包围盒重心翻向中缝 ⇒ 两人自然拉开（30→46 / 82→98），
# 头宽逐像素不变。此为本轮有意变更，非回归。
BASELINE = {
    ("port", "竖版·单人（基线不变）"): dict(head=[83], gap=None),
    ("port", "竖版·双人（基线不变）"): dict(head=[73, 73], gap=46),
    ("mid", "中屏·单人（基线不变）"): dict(head=[116], gap=None),
    ("mid", "中屏·双人（基线不变）"): dict(head=[103, 103], gap=98),
}

TOL_HEAD = 0.08   # 双人头宽相对差上限（8%）
TOL_GAP  = 24     # 双人中缝下限（px）
TOL_FLOOR = 8     # 脚底与列底允许的误差（px）


def _load_face():
    """从 js/portraits.js 解析 FACE 原生朝向表（'l'/'r'/''），与运行时同源。"""
    import re
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "js", "portraits.js")
    src = open(p, encoding="utf-8").read()
    m = re.search(r"var FACE = \{(.*?)\};", src, re.S)
    face = {}
    if m:
        for k, v in re.findall(r"(\w+):\s*'([lre]*)'", m.group(1)):
            face[k] = v
    return face


FACE = _load_face()


def _need_mir(key, side):
    """双人档镜像判据（与 portraits.js applyFit 同规则）：左槽翻 'l'、右槽翻 'r'。"""
    nf = FACE.get(key, "")
    if side == "l":
        return nf == "l"
    if side == "r":
        return nf == "r"
    return False


def body_gap(l, r):
    """人物本体间距（不是槽间距）：两人 alpha bbox 之间的空档，负值=重叠"""
    a, b = l.get("body"), r.get("body")
    if not a or not b:
        return None
    return max(a["x"], b["x"]) - min(a["x"] + a["w"], b["x"] + b["w"])


def fig_rows(d):
    # 隐藏槽（display:none）rect 为全 0，不算「在场」
    return [f for f in d["figs"] if f["key"] and f["r"]["w"] > 0]


def check(d, tag, scene):
    """返回 (ok, 说明列表)"""
    errs, notes = [], []
    ok = True
    if d["errs"]:
        ok = False
        errs.append("JS 报错: %s" % d["errs"])

    zone = d["zone"]["r"]
    figs = fig_rows(d)
    if not figs:
        return False, ["没有立绘（槽位空）"]

    if tag == "wide":
        if not d["mq"]["wide"]:
            ok = False
            errs.append("横版媒体查询未命中")
        # ① 双栏主轴必须是 row（曾因继承 column 导致立绘垂直居中悬空）
        if d["zone"]["cs"]["flex-direction"] != "row":
            ok = False
            errs.append("zone flex-direction=%s（应为 row）" % d["zone"]["cs"]["flex-direction"])
        # ② 每条立绘都要贴列底
        for f in figs:
            gap_bottom = zone["bottom"] - f["r"]["bottom"]
            if abs(gap_bottom) > TOL_FLOOR:
                ok = False
                errs.append("%s 未贴列底（差 %dpx）" % (f["key"], gap_bottom))
        # ③ 头顶不能钻到顶栏里
        for f in figs:
            if f["r"]["y"] < 34:
                ok = False
                errs.append("%s 顶部侵入顶栏（y=%d）" % (f["key"], f["r"]["y"]))
        # ④ 两人都在立绘列内，左右分置
        if len(figs) >= 2:
            l, r = figs[0], figs[1]
            if not (l["r"]["x"] < r["r"]["x"]):
                ok = False
                errs.append("左右槽顺序错乱")
            if abs(l["lay"]["w"] - r["lay"]["w"]) > 2:
                ok = False
                errs.append("两槽宽不等（%d vs %d）" % (l["lay"]["w"], r["lay"]["w"]))
            # 中缝
            gap = body_gap(l, r)
            slot_gap = r["lay"]["x"] - (l["lay"]["x"] + l["lay"]["w"])
            notes.append("人物间距 %dpx（槽缝 %dpx）" % (gap, slot_gap))
            if gap < TOL_GAP:
                ok = False
                errs.append("中缝过窄 %dpx" % gap)
            # 镜像（2026-11-02 v2 朝向规则）：sx<0 当且仅当该侧按 FACE 需要翻转——
            # 旧规则「右位一律镜像」会把原生朝左的角色翻成朝外（两人背对背），已废。
            for f in figs:
                side = (f.get("attrs") or {}).get("side") or "main"
                need = _need_mir(f["key"], side)
                sxv = float(f["vars"]["sx"] or 1)
                if need and sxv >= 0:
                    ok = False
                    errs.append("%s（%s位·原生朝%s）应镜像未镜像（sx=%s）" % (f["key"], side, FACE.get(f["key"], ""), f["vars"]["sx"]))
                if (not need) and sxv < 0 and side in ("l", "r"):
                    ok = False
                    errs.append("%s（%s位·原生朝%s）不应镜像（sx=%s）" % (f["key"], side, FACE.get(f["key"], "") or "正", f["vars"]["sx"]))

    # ⑤ 双人头宽一致
    if len(figs) >= 2:
        hs = []
        for f in figs:
            z = f.get("_head")
            if z:
                hs.append(z)
        if len(hs) == 2 and min(hs) > 0:
            rel = abs(hs[0] - hs[1]) / max(hs)
            notes.append("头宽 %d/%d（差 %.1f%%）" % (hs[0], hs[1], rel * 100))
            if rel > TOL_HEAD:
                ok = False
                errs.append("两人头宽相差 %.1f%%" % (rel * 100))

    # ⑥ 竖版/中屏：基线回归
    b = BASELINE.get((tag, scene))
    if b:
        hs = [f["_head"] for f in figs if f.get("_head")]
        if len(hs) == len(b["head"]):
            for got, want in zip(hs, b["head"]):
                if abs(got - want) > 2:
                    ok = False
                    errs.append("基线漂移：头宽 %d，应为 %d" % (got, want))
        if b["gap"] is not None and len(figs) >= 2 and body_gap(figs[0], figs[1]) is not None:
            l, r = figs[0], figs[1]
            gap = body_gap(l, r)
            if abs(gap - b["gap"]) > 2:
                ok = False
                errs.append("基线漂移：中缝 %d，应为 %d" % (gap, b["gap"]))
    return ok, errors_of(errs) + notes if errs else notes


def errors_of(l):
    return l


def head_of(d):
    """头宽（px）由探针页按 FIT 反算：headW × contain 宽 × k"""
    return [f["head"] for f in d["figs"] if f["key"] and f.get("head")]


def main():
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    total = passed = 0
    rows = []
    for (w, h), scene, q, tag in CASES:
        if only and tag != only:
            continue
        total += 1
        d = lay.run(w, h, BASE + q)
        if not d:
            rows.append((w, h, scene, "NO-DATA", ["页面没量到"]))
            continue
        hs = head_of(d)
        need = 2 if "双人" in scene or "立+跪" in scene else 1
        if len(hs) < need:
            rows.append((w, h, scene, "NO-DATA", ["立绘数不足 %d" % need]))
            continue
        for f, hh in zip(fig_rows(d), hs):
            f["_head"] = hh
        ok, notes = check(d, tag, scene)
        passed += 1 if ok else 0
        rows.append((w, h, scene, "PASS" if ok else "FAIL", notes))

    print("\n%-11s %-14s %-22s %-6s %s" % ("视口", "类型", "场景", "结果", "备注"))
    print("-" * 96)
    for w, h, scene, res, notes in rows:
        print("%-11s %-14s %-22s %-6s %s" % ("%dx%d" % (w, h), "", scene, res, "；".join(notes)))
    print("-" * 96)
    print("%d/%d PASS" % (passed, total))
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
