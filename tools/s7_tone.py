# -*- coding: utf-8 -*-
"""S7 色调公共库：LAB 换算 / 逐 L 段色度迁移 / L 直方图匹配 / 光场重定向
=====================================================================
横版底图是另一次生图（竖版那张没法直接裁成 16:9），所以「看着像同一个地方」
不能靠肉眼调，只能把竖版的**统计特征**搬到横版上，三层：

  ① match_tone   逐 L 段的 a/b 均值 + 离散度对齐（色相、饱和度）
  ② match_lum    L 直方图匹配，强度不足 1（亮度分布）
  ③ light_shape  用竖版的低频光场当遮罩，把「顶部横带光」掰成「中心涡心光」

★ 顺序不能反：先做 ① 再 ②，色度会按 remap 前的 L 分段，贴合度差一档；
  实测反顺序后高光段 a 偏 −3 左右（高光仍是冷青色）。
★ 色度必须用「逐 L 仿射」A' = tgt_a(L) + (A − src_a(L))·k，
  先平移再乘 C 比值会二次缩水：均值会被压到 C 5.0，竖版是 7.7。
★ light_shape 是乘法增益，做完要把整体 L 均值守回竖版，否则亮度整体漂移。
"""
import numpy as np
from PIL import Image, ImageFilter

M_XYZ = np.array([[0.4124, 0.3576, 0.1805],
                  [0.2126, 0.7152, 0.0722],
                  [0.0193, 0.1192, 0.9505]])
M_RGB = np.linalg.inv(M_XYZ)
WP = np.array([0.95047, 1.0, 1.08883])

BANDS = [(0, 20), (20, 35), (35, 50), (50, 65), (65, 101)]


def rgb2lab(a):
    x = np.asarray(a, np.float32) / 255.0
    x = np.where(x > 0.04045, ((x + 0.055) / 1.055) ** 2.4, x / 12.92)
    xyz = x @ M_XYZ.T / WP
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return (116 * f[:, :, 1] - 16, 500 * (f[:, :, 0] - f[:, :, 1]),
            200 * (f[:, :, 1] - f[:, :, 2]))


def lab2rgb(L, A, B):
    fy = (L + 16) / 116
    f = np.stack([fy + A / 500, fy, fy - B / 200], 2)
    xyz = np.where(f ** 3 > 0.008856, f ** 3, (f - 16 / 116) / 7.787) * WP
    rgb = np.clip(xyz @ M_RGB.T, 0, None)
    rgb = np.where(rgb > 0.0031308, 1.055 * rgb ** (1 / 2.4) - 0.055, 12.92 * rgb)
    return np.clip(rgb * 255, 0, 255).astype(np.float32)


def band_stats(L, A, B):
    """每 L 段：(a均值, b均值, C均值, a标准差, b标准差)"""
    out = []
    for lo, hi in BANDS:
        m = (L >= lo) & (L < hi)
        out.append(None if m.sum() < 500 else
                   (float(A[m].mean()), float(B[m].mean()),
                    float(np.hypot(A[m], B[m]).mean()),
                    float(A[m].std()), float(B[m].std())))
    return out


def match_lum(L, Lref, strength=0.7):
    q = np.linspace(0, 100, 257)
    s = np.maximum.accumulate(np.percentile(L, q))
    r = np.maximum.accumulate(np.percentile(Lref, q))
    return L * (1 - strength) + np.interp(L, s, r) * strength


def match_tone(src, ref, strength=0.7, verbose=False):
    """把 src(RGB uint8/float) 的色调对齐到 ref。返回 float RGB。"""
    Ls, As, Bs = rgb2lab(src)
    Lr, Ar, Br = rgb2lab(ref)
    # ① 先按 ref 的 L 直方图重排亮度
    L2 = match_lum(Ls, Lr, strength)
    # ② 再按「重排后」的 L 做逐段色度仿射（用 ref 的 L 分段统计更稳）
    ss, sr = band_stats(L2, As, Bs), band_stats(Lr, Ar, Br)
    ok = [i for i in range(len(BANDS)) if ss[i] and sr[i]]
    cs = np.array([(BANDS[i][0] + BANDS[i][1]) / 2 for i in ok])
    tgt_a = np.array([sr[i][0] for i in ok]); src_a = np.array([ss[i][0] for i in ok])
    tgt_b = np.array([sr[i][1] for i in ok]); src_b = np.array([ss[i][1] for i in ok])
    ka = np.clip(np.array([sr[i][3] / max(ss[i][3], 0.5) for i in ok]), 0.55, 1.5)
    kb = np.clip(np.array([sr[i][4] / max(ss[i][4], 0.5) for i in ok]), 0.55, 1.5)
    A2 = np.interp(L2, cs, tgt_a) + (As - np.interp(L2, cs, src_a)) * np.interp(L2, cs, ka)
    B2 = np.interp(L2, cs, tgt_b) + (Bs - np.interp(L2, cs, src_b)) * np.interp(L2, cs, kb)
    if verbose:
        print('  k_a', dict(zip([int(c) for c in cs], np.round(ka, 2))))
        print('  k_b', dict(zip([int(c) for c in cs], np.round(kb, 2))))
    # ③ 最后把 L 均值守回 ref（色度迁移会轻微牵动亮度观感）
    out = lab2rgb(L2, A2, B2)
    Lo, _, _ = rgb2lab(out)
    out *= Lr.mean() / max(Lo.mean(), 1e-3)
    return np.clip(out, 0, 255)


def light_shape(rgb, ref, k=0.55, clip=(0.72, 1.38), blur_frac=0.05):
    """用 ref 的低频光场做乘法增益，让亮部落在与竖版相同的位置。"""
    h, w = rgb.shape[:2]
    r = Image.fromarray(np.asarray(ref, np.uint8)).convert('L')
    r = r.filter(ImageFilter.GaussianBlur(max(6, blur_frac * max(r.size))))
    field = np.asarray(r.resize((w, h), Image.BICUBIC), np.float32)
    g = np.clip((field / max(field.mean(), 1e-3)) ** k, clip[0], clip[1])
    return np.clip(rgb * g[:, :, None], 0, 255)


def report(tag, rgb, ref=None):
    L, A, B = rgb2lab(rgb)
    line = '%-10s L=%5.1f±%4.1f  a=%6.1f  b=%6.1f  C=%5.2f' % (
        tag, L.mean(), L.std(), A.mean(), B.mean(), np.hypot(A, B).mean())
    if ref is not None:
        Lr, Ar, Br = rgb2lab(ref)
        line += '   | 竖版 L=%5.1f±%4.1f a=%6.1f b=%6.1f C=%5.2f' % (
            Lr.mean(), Lr.std(), Ar.mean(), Br.mean(), np.hypot(Ar, Br).mean())
    print(line)
    return L, A, B
