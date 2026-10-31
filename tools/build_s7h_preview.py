# -*- coding: utf-8 -*-
"""构建 S7 横版预览页（自包含单文件）
=====================================
预览面板不带目录树，`../assets/...` 一律 404 —— 交付页必须把图片内嵌成
data URI，否则打开就是一片空白（10-31 连踩两次）。

★ 内嵌分两种，别混：
  · 静态 src   → 直接写进标签属性，**不依赖 JS**。舞台三层与两块对照图走这条，
                 就算面板把 <script> 拦掉，图也照样出得来。
  · JS 映射    → 只有「切换竖版素材」用得到（3 张），放 window.IMG，
                 不放进静态 src 是为了不让同一张图内嵌两遍。
  · 对照图一律用**缩小副本**（1100/700/900/460 宽），避免和舞台大图重复占体积。

★ 资源用 `data_uri_file` 原样取字节，不要 Pillow 读进来再存 —— webp 二次编码是
  多一代损失，体积还未必更小。

用法：C:/Python314/python.exe tools/build_s7h_preview.py
"""
import base64
import io
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s7_tone

ROOT = r'C:/Users/elisa/dev/tianqing-adventure'
TPL = os.path.join(ROOT, 'preview/_src/s7h-tilt-preview.tpl.html')
OUT = os.path.join(ROOT, 'preview/s7h-tilt-preview.html')
# 改造前的横版底图（= 用户看到的那一版：三通道均值偏移 0.75）。
# 入仓在 preview/_src/，否则从 clone 重建时 A 组对照会缺图。
OLD = os.path.join(ROOT, 'preview/_src/s7h_bg_before_20261031.webp')

REL = {'bgH': 'assets/scenes/s7_cixin_h/bg.webp',
       'mgH': 'assets/scenes/s7_cixin_h/mg.webp',
       'fgH': 'assets/scenes/s7_cixin_h/fg.webp',
       'bgV': 'assets/scenes/s7_cixin/bg.webp',
       'mgV': 'assets/scenes/s7_cixin/mg.webp',
       'fgV': 'assets/scenes/s7_cixin/fg.webp'}


def data_uri_file(path):
    """原样内嵌（★ 不要二次编码：webp 再压一遍等于多一代损失，体积还可能变大）。"""
    raw = open(path, 'rb').read()
    return 'data:image/webp;base64,' + base64.b64encode(raw).decode(), len(raw)


def data_uri_img(im, quality=88):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=quality, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), buf.tell()


def main():
    imgs, total = {}, [0]

    def shot(im, q=88):
        u, n = data_uri_img(im, q)
        total[0] += n
        return u

    def wide(path, w):
        im = Image.open(path).convert('RGB')
        return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)

    # ① 静态：舞台（横版三层，原样字节）
    for k in ('bgH', 'mgH', 'fgH'):
        imgs[k], n = data_uri_file(os.path.join(ROOT, REL[k]))
        total[0] += n
        print('  %-8s 原样内嵌  %-22s %6.1fKB' % (k, REL[k].split('/')[-1], n / 1024))

    # ② JS 映射：竖版三层（原样字节），供切换用
    for k in ('bgV', 'mgV', 'fgV'):
        imgs[k], n = data_uri_file(os.path.join(ROOT, REL[k]))
        total[0] += n
        print('  %-8s 原样内嵌(JS) %-18s %6.1fKB' % (k, REL[k].split('/')[-1], n / 1024))

    # ③ 静态：对照区缩小副本
    imgs['BG_OLD'] = shot(wide(OLD, 1100))
    imgs['BG_H_S'] = shot(wide(os.path.join(ROOT, REL['bgH']), 700))
    imgs['BG_H_B'] = shot(wide(os.path.join(ROOT, REL['bgH']), 900))
    imgs['BG_V_S'] = shot(wide(os.path.join(ROOT, REL['bgV']), 460))

    # ④ 三层缩略图
    for k in ('bgH', 'mgH', 'fgH'):
        im = Image.open(os.path.join(ROOT, REL[k]))
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA') else im.convert('RGB')
        imgs['T_' + k] = shot(im.resize((420, round(im.height * 420 / im.width)), Image.LANCZOS))
    print('  对照图/缩略图 缩小副本：1100 / 700 / 900 / 460 / 420 宽')

    # ---- 色调对照表：全部取仓内实测 ----
    new = np.asarray(Image.open(os.path.join(ROOT, REL['bgH'])).convert('RGB'), np.float32)
    ref = np.asarray(Image.open(os.path.join(ROOT, REL['bgV'])).convert('RGB'), np.float32)
    old = np.asarray(Image.open(OLD).convert('RGB'), np.float32)

    def stats(a):
        L, A, B = s7_tone.rgb2lab(a)
        hi = L > 50
        return dict(L=L.mean(), Ls=L.std(), a=A.mean(), b=B.mean(),
                    C=np.hypot(A, B).mean(), ha=A[hi].mean(), hb=B[hi].mean())

    sn, sr, so = stats(new), stats(ref), stats(old)

    def row(name, key, fmt='%.1f'):
        d = abs(sn[key] - sr[key])
        mark = ('<td class="n ok">%.2f</td>' % d) if d < 0.5 else ('<td class="n">%.2f</td>' % d)
        return ('<tr><td>%s</td><td class="n">%s</td><td class="n">%s</td>'
                '<td class="n">%s</td>%s</tr>') % (name, fmt % so[key], fmt % sn[key], fmt % sr[key], mark)

    table = '\n    '.join([
        row('L* 均值（亮度）', 'L'),
        row('L* 标准差（层次）', 'Ls'),
        row('a* 均值（红绿）', 'a'),
        row('b* 均值（黄蓝）', 'b'),
        row('C* 均值（彩度）', 'C', '%.2f'),
        row('高光段 a*（L*>50）', 'ha'),
        row('高光段 b*（L*>50）', 'hb'),
    ])

    # ---- 三层缩略图卡 ----
    thumbs = []
    for key, label, desc in [
            ('bgH', 'BG 背景', 'd=6 · 不透明'),
            ('mgH', 'MG 中景', 'd=26 · 10 片 ×0.96 · 压暗 4%'),
            ('fgH', 'FG 前景', 'd=64 · 3 片 ×1.20–1.32')]:
        kb = os.path.getsize(os.path.join(ROOT, REL[key])) / 1024
        thumbs.append('<div class="thumb"><img src="@@T_%s@@" alt="%s">'
                      '<div class="cap"><b>%s</b> · %s · %.1fKB</div></div>'
                      % (key, label, label, desc, kb))
    thumbs = '\n    '.join(thumbs)

    html = open(TPL, encoding='utf-8').read()
    html = html.replace('@@ROWS@@', table)
    html = html.replace('@@THUMBS@@', thumbs)
    html = html.replace('@@IMGMAP@@', 'window.IMG=' + '{' + ','.join(
        '%s:"%s"' % (k, imgs[k]) for k in ('bgV', 'mgV', 'fgV')) + '};')
    html = html.replace('@@TILTJS@@', open(os.path.join(ROOT, 'js/tilt.js'), encoding='utf-8').read())
    for k in ('BG_H', 'MG_H', 'FG_H', 'BG_OLD', 'BG_H_S', 'BG_H_B', 'BG_V_S',
              'T_bgH', 'T_mgH', 'T_fgH'):
        if k in imgs:
            html = html.replace('@@%s@@' % k, imgs[k])
    # 舞台三层的静态 src 复用 ① 的三张原样字节
    for tok, key in (('BG_H', 'bgH'), ('MG_H', 'mgH'), ('FG_H', 'fgH')):
        html = html.replace('@@%s@@' % tok, imgs[key])
    html = html.replace('<th>结论</th>', '<th>与竖版差</th>')

    if '@@' in html:
        i = html.index('@@')
        raise SystemExit('模板还有未替换的占位符：' + html[i:i + 30])
    open(OUT, 'w', encoding='utf-8').write(html)
    print('\n输出 %s  %.1fKB（内嵌图片 %.1fKB）' % (
        os.path.basename(OUT), os.path.getsize(OUT) / 1024, total[0] / 1024))
    print('对照：旧 L*,a*,b* = %.1f, %.1f, %.1f ｜ 新 = %.1f, %.1f, %.1f ｜ 竖版 = %.1f, %.1f, %.1f'
          % (so['L'], so['a'], so['b'], sn['L'], sn['a'], sn['b'], sr['L'], sr['a'], sr['b']))


if __name__ == '__main__':
    main()
