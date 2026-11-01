# -*- coding: utf-8 -*-
"""S5 三层实跑验收：截图 + 两姿态 diff + 静止态 vs 原图(overscan 期望)。

★ overscan 必须算进去：层容器是舞台的 114%、img 用 object-fit:cover 填满，
  所以「静止态」在屏幕上是**原图放大 1.14 倍后中心裁切**，不是原图本身。
  拿原图直接和截图逐像素比，会得到一个漂亮但错误的 Δ18 —— 那是裁边造成的错位，
  不是画质问题。正确比法是先把原图按同样规则 cover 一遍。

判据（四条一起过才算三层真生效）：
  1. 静止态 vs 原图(overscan) —— 均值偏差 <1.5、p50/p95 偏差 <3、平均 Δ <6。
     ★ 不能用「平均 Δ <2」当线：浏览器用双线性把 1500×630 放大 1.14 倍，
       PIL 换任何核（LANCZOS/BICUBIC/BILINEAR/NEAREST，实测 4.79~5.71）都对不齐，
       这是重采样的固有不一致，不是画质问题。真正要证的是「没增亮、没压暗、没偏色」，
       所以看的是均值与分位，不是逐像素。
  2. 静止态 vs 仅 BG      —— p95 Δ < 8（加色层不破坏画面），max Δ > 15（层里确实有东西）
  3. 正姿态 vs 负姿态      —— 平均 Δ > 3（位移真的发生）
  4. 正姿态 vs 正姿态仅BG  —— max Δ 明显大于 2 的静止值（位移时加色层开始显形）
"""
import os
import subprocess

import numpy as np
from PIL import Image

CHROME = r"C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
BASE = 'http://127.0.0.1:8765/preview/s5_zide_layers_tilt.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_s5_layers')
os.makedirs(OUT, exist_ok=True)


def shot(query, w, h, name):
    path = os.path.join(OUT, name + '.png')
    url = BASE + '?bare=1&manual=1&' + query
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
                    '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--window-size=%d,%d' % (w, h),
                    '--virtual-time-budget=9000',
                    '--screenshot=' + path, url], capture_output=True)
    im = Image.open(path).convert('RGB')
    print('  %-20s %s' % (name, im.size))
    return im


def overscan(ref, s=1.14):
    """原图按 114% 等比放大后中心裁回原尺寸（= 层容器 + object-fit:cover 的期望结果）。"""
    w, h = ref.size
    W, H = int(round(w * s)), int(round(h * s))
    im = ref.resize((W, H), Image.LANCZOS)
    x0, y0 = (W - w) // 2, (H - h) // 2
    return im.crop((x0, y0, x0 + w, y0 + h))


def diff(a, b, label, expect=''):
    x = np.asarray(a, np.float32)
    y = np.asarray(b, np.float32)
    if x.shape != y.shape:
        y = np.asarray(b.resize(a.size, Image.LANCZOS), np.float32)
    d = np.abs(x - y)
    print('  %-34s 平均 Δ%5.2f  p95 Δ%5.2f  最大 Δ%3.0f   %s'
          % (label, d.mean(), np.percentile(d, 95), d.max(), expect))
    return d.mean(), np.percentile(d, 95), d.max()


def band(a, b, label):
    """只在暗部（原图 L<70）统计，这才是浮尘/暖光应该显形的区域。"""
    x = np.asarray(a, np.float32)
    y = np.asarray(b, np.float32)
    m = x.mean(2) < 70
    d = np.abs(x - y)[m]
    print('  %-34s 暗部平均 Δ%5.2f  暗部 max Δ%3.0f  （%d 像素）'
          % (label, d.mean(), d.max(), d.size))


def head(a, b, label):
    """均值与分位是否一致（重采样无法对齐时，这是「没增亮/没压暗/没偏色」的正确判据）。"""
    x = np.asarray(a, np.float32)
    y = np.asarray(b, np.float32)
    if x.shape != y.shape:
        y = np.asarray(b.resize(a.size, Image.LANCZOS), np.float32)
    dm = x.mean() - y.mean()
    p50 = np.percentile(x, 50) - np.percentile(y, 50)
    p95 = np.percentile(x, 95) - np.percentile(y, 95)
    print('  %-34s 均值 %+.2f  p50 %+.1f  p95 %+.1f   （三项都要接近 0）'
          % (label, dm, p50, p95))


if __name__ == '__main__':
    print('横版 1500x630')
    still = shot('tx=0&ty=0', 1500, 630, 'h_still')
    pos = shot('tx=0.6&ty=0.3', 1500, 630, 'h_pos')
    neg = shot('tx=-0.6&ty=-0.3', 1500, 630, 'h_neg')
    still_bg = shot('tx=0&ty=0&layers=bg', 1500, 630, 'h_still_bgonly')
    pos_bg = shot('tx=0.6&ty=0.3&layers=bg', 1500, 630, 'h_pos_bgonly')

    src = Image.open('assets/scenes/s5_zide_h/bg.webp').convert('RGB')
    print('—— 判据 ——')
    head(overscan(src), still, '① 静止 vs 原图(overscan) 色阶')
    diff(overscan(src), still, '① 静止 vs 原图(overscan) 逐像素', '<6')
    diff(still, still_bg, '② 静止 三层 vs 仅BG', 'p95<8')
    diff(pos, neg, '③ 正姿态 vs 负姿态', '>3')
    diff(pos, pos_bg, '④ 正姿态 三层 vs 仅BG', 'max 应更大')
    band(pos, pos_bg, '  同上 · 暗部统计')

    print('竖版 750×1080')
    vstill = shot('form=v&tx=0&ty=0', 750, 1080, 'v_still')
    vsrc = Image.open('assets/scenes/s5_zide/bg.webp').convert('RGB')
    head(overscan(vsrc), vstill, '① 竖版静止 vs 原图(overscan) 色阶')
    diff(overscan(vsrc), vstill, '① 竖版静止 vs 原图(overscan) 逐像素', '<6')
    print('done ->', OUT)
