"""郭荣立绘色调/光线对齐（2026-10-31 用户要求）

实测偏差（alpha>200 像素，全 33 张统计）：
  郭荣 a1  L=0.259  S=0.373      紫袍同僚组（王朴 .350/.210、张永德 .342/.255、赵 .327/.233、李重进 .327/.220）
  中位      L=0.350  S=0.229
⇒ 郭荣「偏暗 + 明显过饱和」，并排时是一块闷暗的红，与其他人不在同一光比里。

做法：只动「明度曲线 + 饱和度」，**不动色相**（绛红 #63332A 是郭荣专属色相，不能偏）。
  1) 提亮：out = in^(1/g)，g 由「目标 L / 当前 L」反解，提亮中调不动高光，避免过曝
  2) 降饱和：s' = s * fs，向自明度混合（不改变色相角）
目标：L→0.330（紫袍同僚组），S→0.240。
"""
import os, sys
import numpy as np
from PIL import Image

TARGET_L = float(os.environ.get('TQ_L','0.330'))
TARGET_S = float(os.environ.get('TQ_S','0.240'))
SRC = 'assets/chars'
TMP = '_qa/_tone_tmp'

def lum(rgb):
    return 0.2126*rgb[...,0] + 0.7152*rgb[...,1] + 0.0722*rgb[...,2]

def stats(rgb, m):
    px = rgb[m] / 255.0
    mx = px.max(1); mn = px.min(1)
    s = np.where(mx > 0, (mx-mn)/np.maximum(mx,1e-6), 0)
    return lum(px).mean(), s.mean()

def grade(path, target_l, target_s, out_path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[...,:3], a[...,3]
    m = al > 200
    L0, S0 = stats(rgb, m)
    # ① 提亮：解 gamma
    if target_l and L0 > 0:
        k = target_l / L0
        g = 1.0
        lo, hi = 0.2, 5.0
        for _ in range(60):
            g = (lo+hi)/2
            test = np.power(np.clip(rgb/255.0, 0, 1), 1.0/g)
            if lum(test[m]).mean() < target_l: lo = g
            else: hi = g
        rgb = np.power(np.clip(rgb/255.0, 0, 1), 1.0/g) * 255.0
    # ② 降饱和：向该像素自明度混合
    if target_s and S0 > 0:
        L1, S1 = stats(rgb, m)
        fs = target_s / max(S1, 1e-6)
        fs = max(0.0, min(1.0, fs))
        l = lum(rgb)[..., None]
        rgb = l + (rgb - l) * fs
    rgb = np.clip(rgb, 0, 255)
    out = np.dstack([rgb, al]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(out_path, 'WEBP', quality=92, method=6)
    L2, S2 = stats(rgb, m)
    return (L0, S0, L2, S2, g if target_l else 0, fs if target_s else 0)

def main(apply=False):
    os.makedirs(TMP, exist_ok=True)
    jobs = [
        ('guorong_a1', TARGET_L, TARGET_S),
        ('guorong_n1', TARGET_L, TARGET_S),
        ('guorong_t',  TARGET_L, TARGET_S),
        ('guorong_a3', TARGET_L, TARGET_S),
        ('guorong_a2', None,      TARGET_S),   # 赭红庆生差分：明度已 0.34，只降饱和
    ]
    for key, tl, ts in jobs:
        src = os.path.join(SRC, 'tq_chars_%s_final.webp' % key)
        dst = os.path.join(TMP, 'tq_chars_%s_final.webp' % key)
        L0, S0, L2, S2, g, fs = grade(src, tl, ts, dst)
        print('%-12s L %.3f -> %.3f   S %.3f -> %.3f   gamma=%.3f  satx%.2f' % (key, L0, L2, S0, S2, g, fs))
        if apply:
            bak = os.path.join(TMP, 'BAK_' + os.path.basename(src))
            if not os.path.exists(bak):
                import shutil; shutil.copy2(src, bak)
            import shutil; shutil.copy2(dst, src)
    if apply: print('APPLIED')

if __name__ == '__main__':
    main('--apply' in sys.argv)
