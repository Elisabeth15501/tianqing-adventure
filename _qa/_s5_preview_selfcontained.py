# -*- coding: utf-8 -*-
"""把 preview/s5_zide_layers_tilt.html 重建为完全自包含页（v3 真·物体分层）。

页面可能处于两种状态，本脚本都处理：
  A. 源状态：引擎用 <script src="../js/*.js"> 引用（首次构建前）
  B. 自包含状态：引擎已内联（重跑本脚本升级引擎/资产）

注入内容：
  1. tilt.js / scene-parallax.js 从仓内 js/ 原文内联（与游戏内共用同一份）
  2. 6 张 webp（assets/scenes/s5_zide{,_h}/{bg,mg,fg}.webp，v3 物体分层版）
     以 base64 data URI 注入 SceneParallax.srcMap（引擎 _src 缺席时逐字节一致）

产物无论 file:// 双击、本地 http、还是预览面板静态托管都能出图。
HTML 模板禁用 % 格式化。
"""
import base64
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'preview', 's5_zide_layers_tilt.html')

ASSETS = [
    'assets/scenes/s5_zide_h/bg.webp',
    'assets/scenes/s5_zide_h/mg.webp',
    'assets/scenes/s5_zide_h/fg.webp',
    'assets/scenes/s5_zide/bg.webp',
    'assets/scenes/s5_zide/mg.webp',
    'assets/scenes/s5_zide/fg.webp',
]


def datauri(p):
    with open(os.path.join(ROOT, p), 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode('ascii')


def inline_block(js):
    return '<script>\n' + js + '\n</script>'


def replace_inline(html, name, js):
    """按「<script>…* name…</script>」整块替换（状态 B），或替换 src 引用（状态 A）。"""
    assert '</script' not in js.lower(), '%s 含 </script，不能直接内联' % name
    pat = re.compile(r'<script>\s*/\*[^\n]*\n \* ' + re.escape(name) + r'[\s\S]*?</script>')
    m = pat.search(html)
    if m:
        return html[:m.start()] + inline_block(js) + html[m.end():]
    old = '<script src="../js/%s"></script>' % name
    if old in html:
        return html.replace(old, inline_block(js))
    raise AssertionError('未找到 %s 的内联块或 src 引用' % name)


def replace_srcmap(html, uris):
    pat = re.compile(r'window\.SceneParallax\.srcMap = \{[\s\S]*?\n  \};')
    lines = ['  /* 自包含：webp 内嵌为 data URI，file:// 与静态托管均可出图。',
             '     引擎 _src 对 srcMap 缺席时行为逐字节一致；此处覆盖全部 6 个路径。 */',
             '  window.SceneParallax.srcMap = {']
    for p in sorted(uris):
        lines.append("    '%s':" % p)
        lines.append("      '%s'," % uris[p])
    lines.append('  };')
    block = '\n'.join(lines)
    if pat.search(html):
        return pat.sub(lambda _: block, html, count=1)
    old_base = "  window.SceneParallax.base = '../';"
    assert old_base in html, '既无 srcMap 块也无 base 行'
    return html.replace(old_base, block)


def main():
    html = open(OUT, encoding='utf-8').read()
    uris = {p: datauri(p) for p in ASSETS}
    tilt_js = open(os.path.join(ROOT, 'js', 'tilt.js'), encoding='utf-8').read()
    sp_js = open(os.path.join(ROOT, 'js', 'scene-parallax.js'), encoding='utf-8').read()

    html = replace_inline(html, 'tilt.js', tilt_js)
    html = replace_inline(html, 'scene-parallax.js', sp_js)
    html = replace_srcmap(html, uris)

    # 收尾校验
    assert '@@' not in html, '残留 @@ 占位符'
    assert 'src="../js/' not in html, '残留相对脚本引用'
    assert '\n  window.SceneParallax.base' not in html, '残留 base 可执行行'
    assert 'additive: false' in html, '引擎未启用 v3 物体分层（additive:false）'
    for p in sorted(uris):
        assert html.count(uris[p]) == 1, '%s 的 data URI 注入次数异常' % p

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('OK  %s  %.1fKB' % (os.path.relpath(OUT, ROOT), os.path.getsize(OUT) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
