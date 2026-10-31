# -*- coding: utf-8 -*-
"""构建 S7 横版预览页（自包含单文件）
=====================================
预览面板不会给 HTML 附带目录树，`../assets/...` 一律 404 —— 所以交付页
必须把图片全部内嵌成 data URI，否则打开就是一片空白（10-31 踩过）。

做法：`preview/_src/s7h-tilt-preview.tpl.html` 是唯一源文件（可读、可改），
本脚本负责三件事，输出 `preview/s7h-tilt-preview.html`：

  ① 把 6 张三层 webp + 1 张旧横版底图写成 `window.IMG` 映射（每张只内嵌一次，
     页面上多处引用同一个 key，不重复占体积）；
  ② 内联 js/tilt.js；
  ③ 按**仓内实测**算色调对照表（不手抄数值，避免文档漂移）。

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


def data_uri_file(path):
    """原样内嵌（★ 不要二次编码：webp 再压一遍等于多一代损失，体积还可能变大）。"""
    raw = open(path, 'rb').read()
    return 'data:image/webp;base64,' + base64.b64encode(raw).decode(), len(raw)


def data_uri(im, quality=92):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=quality, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), buf.tell()


def main():
    src = {'bgH': 'assets/scenes/s7_cixin_h/bg.webp',
           'mgH': 'assets/scenes/s7_cixin_h/mg.webp',
           'fgH': 'assets/scenes/s7_cixin_h/fg.webp',
           'bgV': 'assets/scenes/s7_cixin/bg.webp',
           'mgV': 'assets/scenes/s7_cixin/mg.webp',
           'fgV': 'assets/scenes/s7_cixin/fg.webp'}
    imgs, total = {}, 0
    for k, rel in src.items():
        p = os.path.join(ROOT, rel)
        imgs[k], n = data_uri_file(p)
        im = Image.open(p)
        total += n
        print('  %-5s %-34s %s %.1fKB' % (k, rel.split('/')[-1], im.size, n / 1024))

    if os.path.exists(OLD):
        im = Image.open(OLD).convert('RGB')
        im = im.resize((1100, int(im.height * 1100 / im.width)), Image.LANCZOS)
        imgs['bgOld'], n = data_uri(im, 88)
        total += n
        print('  %-5s %-34s %s %.1fKB' % ('old', '_bg_old.webp', im.size, n / 1024))

    # ---- 色调对照表：全部取仓内实测 ----
    new = np.asarray(Image.open(os.path.join(ROOT, src['bgH'])).convert('RGB'), np.float32)
    ref = np.asarray(Image.open(os.path.join(ROOT, src['bgV'])).convert('RGB'), np.float32)
    old = np.asarray(Image.open(OLD).convert('RGB'), np.float32) if os.path.exists(OLD) else None

    def stats(a):
        L, A, B = s7_tone.rgb2lab(a)
        hi = L > 50
        return dict(L=L.mean(), Ls=L.std(), a=A.mean(), b=B.mean(),
                    C=np.hypot(A, B).mean(),
                    ha=A[hi].mean(), hb=B[hi].mean())

    sn, sr = stats(new), stats(ref)
    so = stats(old) if old is not None else sr

    def row(name, key, fmt='%.1f', tag=''):
        v_o, v_n, v_r = so[key], sn[key], sr[key]
        d = abs(v_n - v_r)
        mark = ('<td class="n ok">%.2f</td>' % d) if d < 0.5 else ('<td class="n">%.2f</td>' % d)
        return ('<tr><td>%s</td><td class="n">%s</td><td class="n">%s</td>'
                '<td class="n">%s</td>%s</tr>') % (name, fmt % v_o, fmt % v_n, fmt % v_r, mark)

    rows = [
        row('L* 均值（亮度）', 'L'),
        row('L* 标准差（层次）', 'Ls'),
        row('a* 均值（红绿）', 'a'),
        row('b* 均值（黄蓝）', 'b'),
        row('C* 均值（彩度）', 'C', '%.2f'),
        row('高光段 a*（L*>50）', 'ha'),
        row('高光段 b*（L*>50）', 'hb'),
    ]
    # 结论列改成「差值」列更好读：表头写「与竖版差」
    table = '\n    '.join(rows).replace('</table>', '')

    # ---- 三层缩略图 ----
    def kb(rel):
        return os.path.getsize(os.path.join(ROOT, rel)) / 1024

    thumbs = []
    for key, label, desc in [
            ('bgH', 'BG 背景', 'd=6 · 不透明'),
            ('mgH', 'MG 中景', 'd=26 · 10 片 ×0.96 · 压暗 4%'),
            ('fgH', 'FG 前景', 'd=64 · 3 片 ×1.20–1.32')]:
        rel = src[key]
        thumbs.append('<div class="thumb"><img data-img="%s" alt="%s">'
                      '<div class="cap"><b>%s</b> · %s · %.1fKB</div></div>'
                      % (key, label, label, desc, kb(rel)))
    thumbs = '\n    '.join(thumbs)

    html = open(TPL, encoding='utf-8').read()
    imgmap = 'window.IMG=' + '{' + ','.join(
        '%s:"%s"' % (k, v) for k, v in imgs.items()) + '};'
    tilt = open(os.path.join(ROOT, 'js/tilt.js'), encoding='utf-8').read()

    html = html.replace('@@ROWS@@', table)
    html = html.replace('@@THUMBS@@', thumbs)
    html = html.replace('@@IMGMAP@@', imgmap)
    html = html.replace('@@TILTJS@@', tilt)

    # 表头补「与竖版差」列（模板里是 4 列）
    html = html.replace('<th>结论</th>', '<th>与竖版差</th>')

    assert '@@' not in html, '模板还有未替换的占位符'
    open(OUT, 'w', encoding='utf-8').write(html)
    print('\n输出 %s  %.1fKB（图片 %.1fKB）' % (
        os.path.basename(OUT), os.path.getsize(OUT) / 1024, total / 1024))
    print('对照：旧 L*,a*,b* = %.1f, %.1f, %.1f ｜ 新 = %.1f, %.1f, %.1f ｜ 竖版 = %.1f, %.1f, %.1f'
          % (so['L'], so['a'], so['b'], sn['L'], sn['a'], sn['b'], sr['L'], sr['a'], sr['b']))


if __name__ == '__main__':
    main()
