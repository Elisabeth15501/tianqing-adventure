# -*- coding: utf-8 -*-
"""S7 瓷心空间 · 横版三层（bg / mg / fg）合成
======================================================
竖版（assets/scenes/s7_cixin/）是从一张 750×1680 的 AI 大图里**真拆**出 13 片瓷片，
再分成 bg(去瓷器)/mg/fg 三层。横版没有现成同款大图，做法改为：

  ① AI 只出**纯釉面底**（不带任何物件，避免再抠一次）；
  ② 复用竖版已经精修好的 **13 片 RGBA 单片**（preview/_s7_work/sprites_final/），
     按横向构图重新布点：fg 3 片 ×1.25（下外），mg 10 片 ×0.96（上内）；
  ③ 层深沿用 6 : 26 : 64，与竖版一致，陀螺仪才有相同的视差比。

这样既保住了竖版逐片精修的成果（瓷片的金边、开片、去暗影都是当时一片片调出来的），
又不用重跑一遍抠图（那一步在竖版上耗了四轮）。
"""
import glob
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s7_tone

WORK = r'C:/Users/elisa/dev/tianqing-adventure/preview/_s7_h'
SPR = r'C:/Users/elisa/dev/tianqing-adventure/preview/_s7_work/sprites_final'
VREF = r'C:/Users/elisa/dev/tianqing-adventure/assets/scenes/s7_cixin/bg.webp'   # 竖版基准
OUT = os.path.join(WORK, 'layers')
W, H = 1500, 630
TONE_STRENGTH = 0.70   # L 直方图匹配强度（1.0 会完全套用竖版亮度分布，纹理损失）
LIGHT_K = 0.85         # 光场重定向强度（0=关；0.85 时 L 标准差 11.8 ≈ 竖版 11.7）
LIGHT_CLIP = (0.70, 1.90)

# (id, 落点cx, 落点cy, 缩放, 层, 压暗)
LAYOUT = [
    # ---- FG 前景：最大三片，靠下靠外，几乎不压暗 ----
    ('S03', 1175, 455, 1.32, 'fg', 0.00),
    ('S02', 265, 420, 1.30, 'fg', 0.00),
    ('S01', 735, 528, 1.20, 'fg', 0.00),
    # ---- MG 中景：中小片，铺在中上部，略压暗 ----
    ('S04', 420, 300, 0.96, 'mg', 0.04),
    ('S06', 690, 235, 0.96, 'mg', 0.04),
    ('S07', 985, 300, 0.96, 'mg', 0.04),
    ('S08', 1245, 245, 0.96, 'mg', 0.04),
    ('S09', 150, 205, 0.96, 'mg', 0.04),
    ('S10', 895, 425, 0.96, 'mg', 0.04),
    ('S12', 1395, 430, 0.96, 'mg', 0.04),
    ('S13', 62, 360, 0.96, 'mg', 0.04),
    ('S15', 1345, 355, 0.96, 'mg', 0.04),
    ('S17', 300, 470, 0.96, 'mg', 0.04),
]


def shift_gain(rgb, off):
    """已废弃：旧的「三通道均值朝竖版靠 off」只对得齐均值，对不齐高光色相。
    保留仅为可追溯，见 git log 987e30c 前的调用点。"""
    V = np.array([65.0, 80.0, 74.0])
    cur = rgb.reshape(-1, 3).mean(0)
    return np.clip(rgb + (V - cur) * off, 0, 255)


def build_base():
    """AI 纯釉面底 → 对齐竖版色调与光场。

    ★ 底图必须从 bg_nowm.png（已去水印的 AI 原稿，1536×640）重新走一遍，
      不能拿 assets 里那张已经调过色的 webp 当输入 —— 二次匹配会把
      上一轮的增益叠上去，颜色越调越灰（这也是「旧横版发闷」的成因之一）。
    """
    raw = Image.open(os.path.join(WORK, 'work/bg_nowm.png')).convert('RGB')
    src = np.asarray(raw.resize((W, H), Image.LANCZOS), np.float32)
    ref = np.asarray(Image.open(VREF).convert('RGB'), np.float32)

    out = s7_tone.match_tone(src, ref, TONE_STRENGTH, verbose=True)
    print('=== 色调链路 ===')
    s7_tone.report('AI 原稿', src)
    s7_tone.report('色调对齐后', out, ref)
    out = s7_tone.light_shape(out, ref, k=LIGHT_K, clip=LIGHT_CLIP)
    # 光场是乘法，均值守回竖版，避免整体亮度漂移
    L, _, _ = s7_tone.rgb2lab(out)
    Lr, _, _ = s7_tone.rgb2lab(ref)
    out = np.clip(out * (Lr.mean() / max(L.mean(), 1e-3)), 0, 255)
    s7_tone.report('光场重定向后', out, ref)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    bg = build_base()
    bg_img = Image.fromarray(bg.clip(0, 255).astype(np.uint8), 'RGB')

    mg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    fg = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    for sid, cx, cy, k, layer, dark in LAYOUT:
        p = os.path.join(SPR, sid + '.png')
        sp = Image.open(p).convert('RGBA')
        nw, nh = max(1, int(sp.width * k)), max(1, int(sp.height * k))
        sp = sp.resize((nw, nh), Image.LANCZOS)
        arr = np.asarray(sp).astype(np.float32)
        alpha = arr[:, :, 3] > 128

        # ★光照归位：瓷片原本是从另一张图抠的，亮度与这里的环境无关。
        #   实测直接贴会达到「瓷片/底图 = 1.2–3.4」，暗涡中心那几片甚至 3.36，
        #   看着就是贴在画上的浅色纸片。改为按**该片所在位置的底图亮度**重定标，
        #   目标比值 1.55（瓷面朝向光源，比环境亮半档），并夹住上下限防止失真。
        bx0, by0 = int(cx - nw / 2), int(cy - nh / 2)
        bx1, by1 = min(W, bx0 + nw), min(H, by0 + nh)
        bx0c, by0c = max(0, bx0), max(0, by0)
        bg_loc = float(bg[by0c:by1, bx0c:bx1].mean()) if bx1 > bx0c and by1 > by0c else 70.0
        sp_l = float(arr[:, :, :3].mean(2)[alpha].mean()) if alpha.any() else 128.0
        gain = np.clip(1.55 * bg_loc / max(sp_l, 1.0), 0.42, 1.55)
        arr[:, :, :3] = np.clip(arr[:, :, :3] * gain * (1 - dark), 0, 255)
        sp = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA')

        tgt = fg if layer == 'fg' else mg
        # 落地阴影：同形压暗 + 偏移 + 模糊，先画在目标层，让瓷片有"悬在釉面上"的投影
        sh = np.zeros((nh, nw, 4), np.float32)
        sh[:, :, :3] = 0
        sh[:, :, 3] = (alpha * 105.0)
        sh_img = Image.fromarray(sh.astype(np.uint8), 'RGBA')
        from PIL import ImageFilter as IF
        sh_img = sh_img.filter(IF.GaussianBlur(max(2.0, 0.055 * max(nw, nh))))
        tgt.alpha_composite(sh_img, (max(0, bx0 + 5), max(0, by0 + 9)))
        tgt.alpha_composite(sp, (bx0, by0))

    bg_img.save(os.path.join(OUT, 'bg.png'))
    mg.save(os.path.join(OUT, 'mg.png'))
    fg.save(os.path.join(OUT, 'fg.png'))

    # ---- 导出到仓（跟 compose_s7_layers.py 同一组参数，别各写一套）----
    dst = r'C:/Users/elisa/dev/tianqing-adventure/assets/scenes/s7_cixin_h'
    os.makedirs(dst, exist_ok=True)
    bg_img.save(os.path.join(dst, 'bg.webp'), 'WEBP', quality=92, method=6)
    mg.save(os.path.join(dst, 'mg.webp'), 'WEBP', quality=92, alpha_quality=100, method=6)
    fg.save(os.path.join(dst, 'fg.webp'), 'WEBP', quality=92, alpha_quality=100, method=6)

    comp = Image.alpha_composite(Image.alpha_composite(bg_img.convert('RGBA'), mg), fg).convert('RGB')
    comp.save(os.path.join(WORK, 'composite.png'))

    # ---- 校验 ----
    print('=== 输出 ===')
    for n in ('bg', 'mg', 'fg'):
        q = os.path.join(OUT, n + '.png')
        print('  %-3s %s %.1fKB' % (n, Image.open(q).size, os.path.getsize(q) / 1024))
    print('\n=== 自检 ===')
    m = np.asarray(mg)[:, :, 3] > 8
    f = np.asarray(fg)[:, :, 3] > 8
    print('  MG 覆盖 %.1f%%  FG 覆盖 %.1f%%' % (100 * m.mean(), 100 * f.mean()))
    print('  FG∩MG 重叠像素 %d（应 >0，制造前后遮挡）' % int((m & f).sum()))
    print('  FG 分片数 %d / MG 分片数 %d' % (
        sum(1 for r in LAYOUT if r[4] == 'fg'), sum(1 for r in LAYOUT if r[4] == 'mg')))
    # 越界检查
    ys, xs = np.where(f | m)
    print('  内容 bbox x[%d–%d] y[%d–%d]' % (xs.min(), xs.max(), ys.min(), ys.max()))
    over = ((xs < 2) | (xs > W - 3) | (ys < 2) | (ys > H - 3)).sum()
    print('  贴边像素 %d（过大说明有片被裁）' % over)


if __name__ == '__main__':
    main()
