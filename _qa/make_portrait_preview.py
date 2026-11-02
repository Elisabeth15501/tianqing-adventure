# -*- coding: utf-8 -*-
"""立绘细节预览：每位角色取「头部 + 肩胸」原始像素 1:1 裁切，标注角色/槽位/系数/渲染高度。

与 lineup_full.png（全员同框对照）配套；两张都对应 commit 4c7d4ac 的运行时口径。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, '_qa'))
from measure_duo import measure  # noqa

F_T = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 30)
F_N = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 24)
F_S = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 19)

# 名称, 槽, 系数, 渲染高度(px, 390 档), 说明
LIST = [
    ('guorong',     'a1', 1.00, 487, '官家 · 基准'),
    ('zhaokuangyin', 'e3', 1.05, 512, '殿前都指挥使'),
    ('ligu',        'a1', 1.00, 487, '守司空'),
    ('guowei',      'a1', 1.00, 487, '太祖（回忆）'),
    ('fengdao',     'a1', 0.95, 463, '太师（回忆）'),
    ('zhangyongde', 'a1', 0.94, 458, '殿前都点检'),
    ('lichongjin',  'a1', 0.94, 458, '侍卫亲军'),
    ('wangpu',      'e2', 0.90, 439, '枢密使 · 立姿'),
    ('wangpu2',     'a1', 0.90, 439, '中书侍郎'),
    ('fanzhi',      'a1', 0.90, 439, '守司徒'),
    ('yinchongyi',  'e3', 0.90, 439, '江南进奉使'),
    ('fuhou',       'a1', 0.89, 325, '宣懿皇后 · 坐姿'),
    ('nvguan',      'a1', 0.86, 419, '玩家 · 女官'),
    ('shiguan',     'a1', 0.86, 419, '玩家 · 史官'),
]

CW, CH = 300, 360          # 每格画面
PAD, HDR, CAP = 10, 74, 84
COLS = 7
rows = (len(LIST) + COLS - 1) // COLS
W = COLS * (CW + PAD) + PAD
H = HDR + rows * (CH + CAP) + PAD + 26

out = Image.new('RGB', (W, H), (22, 26, 28))
d = ImageDraw.Draw(out)
d.text((PAD + 4, 12), '天清节 · 立绘细节预览（原始像素 1:1 裁切）', font=F_T, fill=(240, 234, 222))
d.text((PAD + 4, 48), 'commit 4c7d4ac · 2026-11-02 12:47 · 33 张立绘 / 20 角色 · 双人档 STATURE 口径',
       font=F_S, fill=(150, 168, 160))

for i, (key, slot, s, hpx, note) in enumerate(LIST):
    path = os.path.join(ROOT, 'assets', 'chars', 'tq_chars_%s_%s_final.webp' % (key, slot))
    im = Image.open(path).convert('RGBA')
    a = np.array(im)[:, :, 3]
    m = a > 40
    rr = np.where(m.any(axis=1))[0]
    cc = np.where(m.any(axis=0))[0]
    y0 = int(rr[0])
    cx = (int(cc[0]) + int(cc[-1])) // 2
    half = CW // 2 - 6
    box = (max(0, cx - half), max(0, y0 - 6), min(im.width, cx + half), min(im.height, y0 - 6 + CH))
    crop = im.crop(box)
    tile = Image.new('RGB', (CW, CH), (34, 38, 40))
    tile.paste(crop, ((CW - crop.width) // 2, (CH - crop.height) // 2), crop)

    r, c = divmod(i, COLS)
    x = PAD + c * (CW + PAD)
    y = HDR + r * (CH + CAP)
    out.paste(tile, (x, y))
    d.rectangle([x, y, x + CW - 1, y + CH - 1], outline=(62, 70, 72))
    mm = measure(path)
    kb = os.path.getsize(path) / 1024
    d.text((x + 2, y + CH + 4), '%s [%s]' % (note, slot), font=F_N, fill=(238, 230, 214))
    d.text((x + 2, y + CH + 34), '系数 %.2f ｜ %dpx' % (s, hpx), font=F_S, fill=(156, 186, 170))
    d.text((x + 2, y + CH + 58), '头宽 %.3f ｜ %.0fKB' % (mm['headW'], kb), font=F_S, fill=(132, 148, 142))

out.save(os.path.join(ROOT, '_qa', '立绘预览_细节.png'))
print(out.size)
