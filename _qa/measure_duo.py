# -*- coding: utf-8 -*-
"""双人同框立绘量测：alpha bbox / 头宽 / 可见带宽，用来核对 js/portraits.js 的 FIT 表。

口径（与 FIT 表注释一致）：
  y0   = 头顶（首个 alpha>阈值的行）/ 图高
  y1   = 人物底边（最后一个 alpha 行）/ 图高
  headW= 净头宽 / 图宽 —— 在「头顶下面 1/3 头高」这一带取行宽中位数，
         且只统计与中轴相连的一段（排除伸到身侧的手臂/器物，如举觞、佩剑）
  bw   = 全图 alpha 包围盒宽 / 图宽
  bwv  = 「头顶→底边上 60% 处」这一段里的最大行宽 / 图宽（双人档可见带）
"""
import sys, os, json
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TH = 24


def measure(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)[:, :, 3]
    H, W = a.shape
    mask = a > TH
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    if not len(rows):
        return None
    y0, y1 = int(rows[0]), int(rows[-1])
    x0, x1 = int(cols[0]), int(cols[-1])
    fig_h = y1 - y0 + 1
    # 逐行宽度 + 主轴连通段（从图心列向两侧扩张，遇到空列即止）
    cx = (x0 + x1) // 2

    def run_width(y):
        r = mask[y]
        if not r[cx]:
            idx = np.where(r)[0]
            if not len(idx):
                return 0
            c = idx[np.argmin(np.abs(idx - cx))]
        else:
            c = cx
        l = c
        while l - 1 >= 0 and r[l - 1]:
            l -= 1
        rr = c
        while rr + 1 < W and r[rr + 1]:
            rr += 1
        return rr - l + 1

    widths = np.array([run_width(y) for y in range(y0, y1 + 1)])
    # 头带：头顶下方 0.08~0.11 图高（约 1/3 头高），取中位数抗单个噪点
    band = widths[int(fig_h * 0.03):max(1, int(fig_h * 0.11))]
    head = float(np.median(band)) if len(band) else float(widths.max())
    bw = (x1 - x0 + 1) / W
    keep = int(fig_h * 0.60)
    bwv = float(widths[:keep].max()) / W
    return dict(W=W, H=H, y0=round(y0 / H, 3), y1=round((y1 + 1) / H, 3),
                headW=round(head / W, 3), bw=round(bw, 3), bwv=round(bwv, 3),
                heads=int(round(fig_h / (head * H / W))) if head else 0)


if __name__ == '__main__':
    pats = sys.argv[1:] or ['guorong_a1', 'wangpu_e2']
    for n in pats:
        p = os.path.join(ROOT, 'assets', 'chars', 'tq_chars_%s_final.webp' % n)
        m = measure(p)
        print('%-18s %s' % (n, json.dumps(m, ensure_ascii=False)))
