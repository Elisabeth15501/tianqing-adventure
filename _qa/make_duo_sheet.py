# -*- coding: utf-8 -*-
"""把双人同框验收截图拼成一张带标注的对照表（供逐条确认）。"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA = os.path.join(ROOT, '_qa')
FONT = 'C:/Windows/Fonts/msyh.ttc'
F_T = ImageFont.truetype(FONT, 19)
F_S = ImageFont.truetype(FONT, 15)
F_N = ImageFont.truetype(FONT, 16)

# (文件, 场景名, 关系标注, 是否通过)
ITEMS = [
    ('v3_chen_01_王朴.png',    '辰时 · 广德殿（第 22 句）', '官家 × 王朴（跪坐 a1）0.75 体量', True),
    ('v3_final_01_王朴.png',   '终幕 · 夜宴（第 2 句）',     '官家 × 王朴（立姿 e2）1:1', True),
    ('v3_final_03_范质.png',   '终幕 · 夜宴（第 3 句）',     '官家 × 范质（基准对）1:1', True),
    ('v3_final_05_张永德.png', '终幕 · 夜宴（第 4 句）',     '官家 × 张永德 1:1（整对 94%）', True),
    ('v3_final_07_赵匡胤.png', '终幕 · 夜宴（第 5 句）',     '官家 × 赵匡胤 1:1', True),
    ('v3_final_09_殷崇义.png', '终幕 · 夜宴（第 6 句）',     '官家 × 殷崇义 1:1', True),
    ('v3_brnv_01_.png',        '终幕 · 献瓮（女官线）',      '玩家（女官）× 官家 1:1', True),
    ('v3_brshi_01_.png',       '终幕 · 献瓮（史官线）',      '玩家（史官）× 官家 1:1', True),
    ('v3_guowei_04.png',       '瓷心 · 澶州灯下（回忆）',    '郭荣 × 郭威 1:1（皆跪坐）', True),
    ('v3_fengdao_04.png',      '瓷心 · 为山（回忆）',        '郭荣 × 冯道 1:1', True),
    ('v3_suiweng_05.png',      '瓷心 · 碎瓮记（回忆）',      '符后 × 郭荣 0.75 体量（坐姿）', True),
]

CW, CH = 232, 502          # 每格内容尺寸（390×844 等比缩到 232×502）
PAD, HDR = 12, 62
COLS = 4
rows = (len(ITEMS) + COLS - 1) // COLS
W = COLS * (CW + PAD) + PAD
H = rows * (CH + HDR + PAD) + PAD + 44
out = Image.new('RGB', (W, H), (28, 32, 34))
d = ImageDraw.Draw(out)
d.text((PAD + 2, 14), '天清节 · 双人同框验收 v2（统一尺寸 + 朝向修正 · 390×844）', font=F_T, fill=(236, 232, 222))

for i, (fn, title, rel, ok) in enumerate(ITEMS):
    p = os.path.join(QA, fn)
    if not os.path.exists(p):
        print('MISS', fn)
        continue
    im = Image.open(p).convert('RGB')
    im = im.resize((CW, CH), Image.LANCZOS)
    r, c = divmod(i, COLS)
    x = PAD + c * (CW + PAD)
    y = 44 + PAD + r * (CH + HDR + PAD)
    out.paste(im, (x, y))
    d.rectangle([x, y, x + CW - 1, y + CH - 1], outline=(70, 78, 80))
    d.text((x, y + CH + 4), title, font=F_S, fill=(226, 220, 206))
    d.text((x, y + CH + 24), rel, font=F_N, fill=(150, 205, 180) if ok else (235, 150, 140))
    d.text((x, y + CH + 42), '✓ 符合' if ok else '✗ 不符', font=F_S,
           fill=(150, 205, 180) if ok else (235, 150, 140))

out.save(os.path.join(QA, 'AA_双人同框_验收_v2.png'))
print(out.size)
