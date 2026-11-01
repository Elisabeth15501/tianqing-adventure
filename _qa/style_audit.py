# -*- coding: utf-8 -*-
"""立绘画风/色调体检：在「人物像素」上量 CIELAB / HSV / 高频能量 / 边缘密度。

用法：
    python _qa/style_audit.py                 # 全部 *_final.webp
    python _qa/style_audit.py --json out.json

口径（与 10-31 服色判据一致，避免各说各话）：
  - 只统计 alpha>=200 的像素（半透明描边会把均值拉偏）；
  - L*a*b* 用 D65 白点、sRGB 反伽马；
  - 「高频能量」= 灰度 Laplacian 的 std（先缩到统一 512 高，消除尺寸差）；
  - 「边缘密度」= Sobel 幅值 > 24 的像素占比；
  - 「线稿暗度」= L* 的 2% 分位（描边最黑处）；
  - 「暖度」= b* 均值（正=偏黄暖，负=偏蓝冷）。
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARS = os.path.join(ROOT, 'assets', 'chars')

# sRGB -> XYZ (D65) -> LAB
M_RGB2XYZ = np.array([[0.4124564, 0.3575761, 0.1804375],
                      [0.2126729, 0.7151522, 0.0721750],
                      [0.0193339, 0.1191920, 0.9503041]])
WP = np.array([0.95047, 1.00000, 1.08883])


def srgb_to_lab(rgb):
    """rgb: float array (...,3) in 0..1 -> lab"""
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    xyz = lin @ M_RGB2XYZ.T
    t = xyz / WP
    d = 6.0 / 29.0
    f = np.where(t > d ** 3, np.cbrt(t), t / (3 * d * d) + 4.0 / 29.0)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


def load(path, target_h=512):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    s = target_h / float(h)
    if abs(s - 1.0) > 1e-6:
        im = im.resize((max(1, int(round(w * s))), target_h), Image.LANCZOS)
    arr = np.asarray(im).astype(np.float32) / 255.0
    return arr[..., :3], arr[..., 3]


def sobel_mag(g):
    gx = np.zeros_like(g)
    gy = np.zeros_like(g)
    gx[:, 1:-1] = (g[:, 2:] - g[:, :-2]) * 0.5
    gy[1:-1, :] = (g[2:, :] - g[:-2, :]) * 0.5
    return np.hypot(gx, gy)


def audit(path):
    rgb, a = load(path)
    m = a >= (200 / 255.0)
    if m.sum() < 500:
        return None
    px = rgb[m]
    lab = srgb_to_lab(px)
    L, A, B = lab[:, 0], lab[:, 1], lab[:, 2]
    C = np.hypot(A, B)
    mx = px.max(axis=1)
    mn = px.min(axis=1)
    S = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    V = mx

    # 高频：只在人物内部算（腐蚀 2px，避开轮廓线本身）
    gray = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) * 255.0
    inside = m.copy()
    for _ in range(2):
        n = inside.copy()
        n[1:, :] &= inside[:-1, :]
        n[:-1, :] &= inside[1:, :]
        n[:, 1:] &= inside[:, :-1]
        n[:, :-1] &= inside[:, 1:]
        inside = n
    if inside.sum() < 400:
        inside = m
    lap = (4 * gray[inside] -
           (np.roll(gray, 1, 0)[inside] + np.roll(gray, -1, 0)[inside] +
            np.roll(gray, 1, 1)[inside] + np.roll(gray, -1, 1)[inside]))
    sob = sobel_mag(gray)
    edge_den = float((sob[m] > 24).mean())

    # 「皮肤」代理：色相 15~55° 且中等明度——用来比对肤色光照
    hue = np.degrees(np.arctan2(B, A)) % 360
    skin = (hue > 15) & (hue < 55) & (L > 45) & (L < 85) & (C > 12) & (C < 45)

    return dict(
        file=os.path.basename(path),
        px=int(m.sum()),
        L=round(float(L.mean()), 2), Lsd=round(float(L.std()), 2),
        Lp2=round(float(np.percentile(L, 2)), 1),
        Lp50=round(float(np.percentile(L, 50)), 1),
        Lp95=round(float(np.percentile(L, 95)), 1),
        C=round(float(C.mean()), 2),
        S=round(float(S.mean()), 3),
        V=round(float(V.mean()), 3),
        b=round(float(B.mean()), 2),
        hf=round(float(lap.std()), 2),
        edge=round(edge_den, 4),
        skin=round(float(skin.mean()), 3),
        skinL=round(float(L[skin].mean()), 1) if skin.sum() > 300 else None,
        skinC=round(float(C[skin].mean()), 1) if skin.sum() > 300 else None,
    )


def main():
    files = sorted(glob.glob(os.path.join(CHARS, '*_final.webp')))
    rows = []
    for f in files:
        r = audit(f)
        if r:
            rows.append(r)
    cols = ['file', 'L', 'Lsd', 'Lp2', 'Lp50', 'Lp95', 'C', 'S', 'V', 'b', 'hf', 'edge', 'skin', 'skinL', 'skinC']
    print('%-34s %6s %5s %5s %5s %5s %5s %5s %5s %5s %6s %6s %5s %5s %5s' % tuple(
        ['file', 'L', 'Lsd', 'Lp2', 'Lp50', 'Lp95', 'C', 'S', 'V', 'b*', 'HF', 'edge', 'skin', 'skL', 'skC']))
    for r in rows:
        print('%-34s %6.2f %5.2f %5.1f %5.1f %5.1f %5.2f %5.3f %5.3f %5.2f %6.2f %6.4f %5.3f %5s %5s' % tuple(
            [r[c] if r[c] is not None else '-' for c in cols]))
    out = os.path.join(ROOT, '_qa', 'style_audit.json')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(rows, fh, ensure_ascii=False, indent=1)
    print('\n->', out)


if __name__ == '__main__':
    main()
