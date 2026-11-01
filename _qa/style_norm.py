# -*- coding: utf-8 -*-
"""立绘「风格归一化」：把一批图往主流立绘的色调 / 光比 / 笔触质感上靠。

—— 为什么不是「调个曲线」了事（10-31 晚实测，口径见 _qa/style_audit.py）——
  主流 A 级（王朴/张永德/赵匡胤/郭威/符后）：L 34~38  Lp2 17.5~19  C 11.3~13.3  HF 19~22  edge .044~.061  肤色C 17~26  肤色h 75~78
  新批 5 张（范质/李谷/王溥/李重进/宗训）：  L 27~30  Lp2 6.5~8.8   C 11.5~12.6  HF 24~29  edge .056~.078  肤色C 21~27  肤色h 74~81
  郭荣 5 张：                                L 34     Lp2 20~23     C 11.3~12.1  HF 13~20  edge .024~.045  肤色C 10.2  肤色h 81~84

  ⇒ 新批 = 整体暗一档 + 黑位压死 + 笔触密/硬边（HF +25~45%），肤色本身没问题；
    郭荣 = 光比平（黑位抬高）+ 笔触偏软，而「灰」的真正落点是**肤色只有主流一半的彩度**（C 10.2 vs 20+）。
  两者方向相反，但可以用同一套「向目标收敛」的算子，只是各自的起点不同。

流水线（全部在 L*a*b* 上做；色相角只在肤色掩膜内动，袍色 H∈[234,292] 是品级身份，绝不旋转）：
  ① 光比曲线：L* 过 (p2→17.8)(p50→36.8)(p95→62.5) 分段线性，强制单调（非单调会翻色）。
     分位数在 **512 高代理图上**取——验收也是 512，同一把尺子；否则「全分辨率压到 15.7」在验收图上仍读 20.4。
  ② 笔触归一：以 HF 为目标（主流中位 20.2）**二分搜索** 柔化权重或锐化量，
     不是「新批一律糊、郭荣一律锐」——两边都只走到同一个 HF。
  ③ 彩度：a*b* 等比缩放（色相角恒定）。主角固定 +7%（他的均值被绛红拉高，不能按全局均值推）。
  ④ 暖度：只给 C<12 的近中性像素加 b*，紫袍不动。
  ⑤ 肤色：掩膜（h 55~115°、L 38~88、C 5~40）内把中位 C 拉到 20（主角）/ 23（新批），
     色相往暖橙挪 5°/2°，掩膜边缘 3px 羽化——否则脸颊边界会出现一圈色环。

用法：
  python _qa/style_norm.py --dry          # 只报数，不写盘
  python _qa/style_norm.py --apply        # 写盘（原件备份 _qa/_style_bak/）
  python _qa/style_norm.py --restore      # 从备份还原这批图（可反复重跑）
  python _qa/style_norm.py --only guorong --apply
"""
import argparse
import os
import shutil

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARS = os.path.join(ROOT, 'assets', 'chars')
BAK = os.path.join(ROOT, '_qa', '_style_bak')
BUDGET = 70000
PROXY_H = 512                      # 分位数与 HF 的统一量测尺度（与 style_audit.py 一致）

M_RGB2XYZ = np.array([[0.4124564, 0.3575761, 0.1804375],
                      [0.2126729, 0.7151522, 0.0721750],
                      [0.0193339, 0.1191920, 0.9503041]])
M_XYZ2RGB = np.linalg.inv(M_RGB2XYZ)
WP = np.array([0.95047, 1.00000, 1.08883])

NEW5 = ['fanzhi_a1', 'ligu_a1', 'wangpu2_a1', 'lichongjin_a1', 'zongxun_a1']
LEAD = ['guorong_a1', 'guorong_a2', 'guorong_a3', 'guorong_n1', 'guorong_t']
ALL = NEW5 + LEAD

T = dict(p2=17.8, p50=36.8, p95=62.5, C=13.3, HF=20.2)
LEAD_K = float(os.environ.get('TQ_LEAD_K') or 1.07)   # 主角整体彩度系数（绛红帝袍）
SKIN = {'lead': dict(C=float(os.environ.get('TQ_SKIN_C') or 20.0), dh=-5.0, dL=-2.0),
        'new': dict(C=23.0, dh=-2.0, dL=2.0)}


# ---------- 颜色 ----------
def rgb2lab(rgb):
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    xyz = lin @ M_RGB2XYZ.T
    t = xyz / WP
    d = 6.0 / 29.0
    f = np.where(t > d ** 3, np.cbrt(t), t / (3 * d * d) + 4.0 / 29.0)
    return np.stack([116 * f[..., 1] - 16,
                     500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])], axis=-1)


def lab2rgb(lab):
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    fy = (L + 16) / 116.0
    fx = fy + a / 500.0
    fz = fy - b / 200.0
    d = 6.0 / 29.0
    f = np.stack([fx, fy, fz], axis=-1)
    t = np.where(f > d, f ** 3, 3 * d * d * (f - 4.0 / 29.0))
    lin = np.clip(t * WP @ M_XYZ2RGB.T, 0.0, 1.0)
    rgb = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return np.clip(rgb, 0.0, 1.0)


# ---------- 量测（512 代理） ----------
def to_proxy(L, alpha):
    """把 L 与 alpha 一起缩到 PROXY_H，返回代理 L 与代理掩膜。"""
    h, w = L.shape
    s = PROXY_H / float(h)
    li = Image.fromarray(np.clip(L / 100.0 * 255, 0, 255).astype(np.uint8))
    li = li.resize((max(1, int(round(w * s))), PROXY_H), Image.LANCZOS)
    ai = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8))
    ai = ai.resize(li.size, Image.LANCZOS)
    return (np.asarray(li).astype(np.float32) / 255.0 * 100,
            np.asarray(ai).astype(np.float32) / 255.0 >= 200 / 255.0)


def hf_of(L, alpha):
    """灰度 Laplacian 的 std（只在人物内部），与 style_audit 同口径。"""
    lp, mp = to_proxy(L, alpha)
    if mp.sum() < 400:
        return 0.0
    inside = mp.copy()
    for _ in range(2):
        n = inside.copy()
        n[1:, :] &= inside[:-1, :]
        n[:-1, :] &= inside[1:, :]
        n[:, 1:] &= inside[:, :-1]
        n[:, :-1] &= inside[:, 1:]
        inside = n
    if inside.sum() < 300:
        inside = mp
    g = lp * 2.55
    lap = (4 * g[inside] - (np.roll(g, 1, 0)[inside] + np.roll(g, -1, 0)[inside] +
                            np.roll(g, 1, 1)[inside] + np.roll(g, -1, 1)[inside]))
    return float(lap.std())


# ---------- 笔触 ----------
def soften(L, w):
    """减笔触密度：高频层按 (1-w) 保留，中频层只轻压 30%。w=0 必须严格等于原图。

    ★ 这里踩过一次：初版写 form + (fine-form)*(1-w)*0.55 + (L-fine)*0.30，
      在 w=0 时也把中频砍 45%、高频砍 70% ⇒ 二分搜索「找一个最柔的权重」时，
      报告 w=0.00 却已经整张糊掉（HF 30.8→12.9、p95 62.5→57.6）。
      恒等式 w=0 ⇒ 输出==输入 是这类参数化滤波器的硬要求，否则二分搜的是假零点。
    """
    if w <= 0:
        return L
    im = Image.fromarray(np.clip(L / 100.0 * 255, 0, 255).astype(np.uint8))
    fine = np.asarray(im.filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32) / 255.0 * 100
    form = np.asarray(im.filter(ImageFilter.GaussianBlur(9.0))).astype(np.float32) / 255.0 * 100
    return form + (fine - form) * (1.0 - 0.30 * w) + (L - fine) * (1.0 - w)


def sharpen(L, amt):
    if amt <= 0:
        return L
    im = Image.fromarray(np.clip(L / 100.0 * 255, 0, 255).astype(np.uint8))
    b = np.asarray(im.filter(ImageFilter.GaussianBlur(1.4))).astype(np.float32) / 255.0 * 100
    return L + (L - b) * amt


def match_hf(L, alpha, target):
    """二分找柔化/锐化参数，使 HF 落到 target 附近。返回 (L', 说明)。"""
    hf0 = hf_of(L, alpha)
    if abs(hf0 - target) <= target * 0.06:
        return L, 'hf %.1f 已达标' % hf0
    if hf0 > target:                      # 太硬太密 → 柔化
        lo, hi = 0.0, 0.60
        for _ in range(7):
            mid = (lo + hi) / 2
            if hf_of(soften(L, mid), alpha) > target:
                lo = mid
            else:
                hi = mid
        w = (lo + hi) / 2
        return soften(L, w), 'soften w=%.2f  %.1f→%.1f' % (w, hf0, hf_of(soften(L, w), alpha))
    lo, hi = 0.0, 0.70                    # 太软 → 锐化
    for _ in range(7):
        mid = (lo + hi) / 2
        if hf_of(sharpen(L, mid), alpha) < target:
            lo = mid
        else:
            hi = mid
    a = (lo + hi) / 2
    return sharpen(L, a), 'sharpen a=%.2f  %.1f→%.1f' % (a, hf0, hf_of(sharpen(L, a), alpha))


# ---------- 主流程 ----------
def process(path, preset, dry=False):
    im = Image.open(path).convert('RGBA')
    arr = np.asarray(im).astype(np.float32) / 255.0
    rgb, alpha = arr[..., :3], arr[..., 3]
    m = alpha >= (200 / 255.0)
    if m.sum() < 500:
        return None
    name = os.path.basename(path).replace('tq_chars_', '').replace('_final.webp', '')

    lab = rgb2lab(rgb)
    L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(A, B)
    lp0, mp0 = to_proxy(L, alpha)

    # ① 光比曲线（分位数取自 512 代理，与验收同尺）
    p2, p50, p95 = [float(np.percentile(lp0[mp0], q)) for q in (2, 50, 95)]
    t50 = p50 + max(-4.0, min(8.0, T['p50'] - p50))
    t95 = p95 + max(-9.0, min(10.0, T['p95'] - p95))
    t2 = min(T['p2'], t50 - 8.0)
    ys = np.maximum.accumulate(np.array([0.0, t2, t50, t95, 100.0]))
    L = np.interp(L, [0.0, p2, p50, p95, 100.0], ys)

    # ② 笔触归一（目标 HF 与验收同尺）
    L, hfNote = match_hf(L, alpha, T['HF'])
    L = np.clip(L, 0, 100)

    # ③ 彩度
    cNow = float(np.hypot(A[m], B[m]).mean())
    k = LEAD_K if preset == 'lead' else max(0.90, min(1.30, T['C'] / max(1e-6, cNow)))
    A2, B2 = A * k, B * k

    # ④ 暖度（只动近中性）
    wN = np.clip((12.0 - C) / 12.0, 0.0, 1.0) * m
    B2 = B2 + wN * (2.4 if preset == 'new' else 0.8)

    # ⑤ 肤色
    sk = SKIN[preset]
    hue = np.degrees(np.arctan2(B2, A2)) % 360
    C2 = np.hypot(A2, B2)
    smask = ((hue > 55) & (hue < 115) & (L > 38) & (L < 88) & (C2 > 5) & (C2 < 40) & m)
    cSkin0 = float(np.median(C2[smask])) if smask.sum() > 400 else float('nan')
    if smask.sum() > 400:
        wt = np.asarray(Image.fromarray((smask.astype(np.float32) * 255).astype(np.uint8))
                        .filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255.0
        wt = np.clip(wt * 1.6, 0.0, 1.0)
        f = max(0.9, min(2.2, sk['C'] / max(1e-6, cSkin0)))
        dh = np.deg2rad(sk['dh']) * wt
        cMul = 1.0 + (f - 1.0) * wt
        cos, sin = np.cos(dh), np.sin(dh)
        A3 = (A2 * cos - B2 * sin) * cMul
        B3 = (A2 * sin + B2 * cos) * cMul
        A2, B2 = A3, B3
        L = L + sk['dL'] * wt

    out_lab = np.stack([np.clip(L, 0, 100), A2, B2], axis=-1)
    rgb2 = lab2rgb(out_lab)
    rgb2 = np.where((alpha > 0)[..., None], rgb2, rgb)   # 全透明像素不动

    Lp, Cp = to_proxy(out_lab[..., 0], alpha)
    cSkinN = float(np.median(np.hypot(A2, B2)[smask])) if smask.sum() > 400 else float('nan')
    if dry:
        print('%-13s %-4s L %5.1f→%5.1f  Lp2 %5.1f→%5.1f  Lp95 %5.1f→%5.1f  C %5.2f→%5.2f  肤色C %5.1f→%5.1f | %s'
              % (name, preset, float(Lp[mp0].mean()), float(Lp[mp0].mean()),
                 p2, float(np.percentile(Lp[mp0], 2)), p95, float(np.percentile(Lp[mp0], 95)),
                 cNow, float(np.hypot(A2[m], B2[m]).mean()), cSkin0, cSkinN, hfNote))
        return True

    if not os.path.isdir(BAK):
        os.makedirs(BAK, exist_ok=True)
    bak = os.path.join(BAK, os.path.basename(path))
    if not os.path.exists(bak):
        shutil.copy2(path, bak)

    out = np.concatenate([rgb2, alpha[..., None]], axis=-1)
    img = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
    q = 82
    while q >= 45:
        img.save(path, 'WEBP', quality=q, method=6)
        if os.path.getsize(path) <= BUDGET:
            break
        q -= 4
    print('%-13s %-4s L→%5.1f  q=%d %5.1fKB  | %s'
          % (name, preset, float(Lp[mp0].mean()), q, os.path.getsize(path) / 1024, hfNote))
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--restore', action='store_true')
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    keys = [k for k in ALL if (not a.only or a.only in k)]
    if a.restore:
        for k in keys:
            b = os.path.join(BAK, 'tq_chars_%s_final.webp' % k)
            if os.path.exists(b):
                shutil.copy2(b, os.path.join(CHARS, 'tq_chars_%s_final.webp' % k))
                print('restored', k)
        return
    for k in keys:
        p = os.path.join(CHARS, 'tq_chars_%s_final.webp' % k)
        if not os.path.exists(p):
            print('missing', p)
            continue
        process(p, 'new' if k in NEW5 else 'lead', dry=(not a.apply))


if __name__ == '__main__':
    main()
