# -*- coding: utf-8 -*-
"""立绘原生朝向量测：皮肤重心 vs 幞头重心。

判据（避免"看小图猜"，2026-11-02 换掉肉眼判读）：
  3/4 侧脸时，**脸（皮肤）整体向鼻子那一侧偏移**，而幞头戴在头上、基本居中对准颅骨。
  取头顶往下 0~20% 头身带，分别取
    hat  = 暗部（max(R,G,B) < 96）——幞头与软脚
    skin = 暖亮部（R>105 且 R-B>26 且 G>0.72R）——脸、耳、颈
  以 hat 重心为轴，skin 重心偏右 ⇒ 脸朝右('r')，偏左 ⇒ 朝左('l')。
  偏移量按头宽归一，|dx| < 0.02 判为"正面"('')。

副判据（交叉核对，单独不可靠）：耳侧皮肤外缘比另一侧更外突。
"""
import sys, os, glob
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def facing(path):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    al = a[:, :, 3]
    m = al > 40
    rows = np.where(m.any(axis=1))[0]
    cols = np.where(m.any(axis=0))[0]
    y0 = int(rows[0]); y1 = int(rows[-1])
    cx0 = (int(cols[0]) + int(cols[-1])) // 2
    fh = y1 - y0 + 1
    band = slice(y0, y0 + int(fh * 0.20))
    sub = a[band]
    R = sub[:, :, 0].astype(int); G = sub[:, :, 1].astype(int); B = sub[:, :, 2].astype(int)
    A = sub[:, :, 3]
    mx = np.maximum(np.maximum(R, G), B)
    hat = (A > 150) & (mx < 96)
    skin = (A > 150) & (R > 105) & ((R - B) > 26) & (G > 0.72 * R) & (mx >= 96)
    if hat.sum() < 200 or skin.sum() < 200:
        return None
    hx = np.argwhere(hat)[:, 1]; hy = np.argwhere(hat)[:, 0]
    sx = np.argwhere(skin)[:, 1]; sy = np.argwhere(skin)[:, 0]
    hcx, scx = hx.mean(), sx.mean()
    # 头宽：hat 的水平跨度（避开软脚：取 hat 的 10~90 百分位）
    hw = np.percentile(hx, 90) - np.percentile(hx, 10)
    dx = (scx - hcx) / max(1.0, hw)
    # 副判据：皮肤左右外缘相对重心
    lx = np.percentile(sx, 2); rx = np.percentile(sx, 98)
    return dict(dx=round(float(dx), 3),
                face=('r' if dx > 0.02 else ('l' if dx < -0.02 else '')),
                skin_out_l=round(float((scx - lx) / max(1.0, hw)), 3),
                skin_out_r=round(float((rx - scx) / max(1.0, hw)), 3),
                hw=int(hw))


if __name__ == '__main__':
    pats = sys.argv[1:]
    files = [os.path.join(ROOT, 'assets', 'chars', 'tq_chars_%s_final.webp' % p) for p in pats] \
        if pats else sorted(glob.glob(os.path.join(ROOT, 'assets', 'chars', '*.webp')))
    for f in files:
        r = facing(f)
        n = os.path.basename(f).replace('tq_chars_', '').replace('_final.webp', '')
        if r is None:
            print('%-20s --' % n)
            continue
        print('%-20s %s  dx=%+.3f  外缘 L%.2f R%.2f  hatW=%d' %
              (n, r['face'] or '正', r['dx'], r['skin_out_l'], r['skin_out_r'], r['hw']))
