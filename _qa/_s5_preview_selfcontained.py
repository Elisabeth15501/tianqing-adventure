# -*- coding: utf-8 -*-
"""把 preview/s5_zide_layers_tilt.html 重建为完全自包含页。

背景：该页此前用相对路径（../js/*.js + SceneParallax.base='../'）取脚本与 6 张
webp。在 WorkBuddy 预览面板里页面被托管到 /static-html/<hash>/ 之下，../ 解析
到托管根之外 ⇒ 脚本与图片全部 404，页面只剩 UI 框架不出图。

修复方式（不漂移，两处改动都是生成式注入而非手抄）：
  1. <script src="../js/tilt.js"> 与 <script src="../js/scene-parallax.js">
     → 从仓内 js/ 原文内联（与游戏内共用同一份，避免复制漂移）。
  2. window.SceneParallax.base = '../' → srcMap：6 个 webp 读字节转 base64
     data URI 注入（引擎 _src 对 srcMap 缺席时行为逐字节一致）。

产物无论 file:// 双击、本地 http、还是预览面板静态托管都能出图。
HTML 模板禁用 % 格式化（CSS 的 % 与 %% 打架），一律 @@key@@ + replace()。
"""
import base64
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'preview', 's5_zide_layers_tilt.html')

SRC_MAP = {
    'assets/scenes/s5_zide_h/bg.webp': None,
    'assets/scenes/s5_zide_h/mg.webp': None,
    'assets/scenes/s5_zide_h/fg.webp': None,
    'assets/scenes/s5_zide/bg.webp': None,
    'assets/scenes/s5_zide/mg.webp': None,
    'assets/scenes/s5_zide/fg.webp': None,
}


def datauri(p):
    with open(os.path.join(ROOT, p), 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode('ascii')


def main():
    html = open(OUT, encoding='utf-8').read()

    for p in SRC_MAP:
        SRC_MAP[p] = datauri(p)

    tilt_js = open(os.path.join(ROOT, 'js', 'tilt.js'), encoding='utf-8').read()
    sp_js = open(os.path.join(ROOT, 'js', 'scene-parallax.js'), encoding='utf-8').read()

    # </script> 在 JS 字符串里出现会截断内联 script 块；本仓两份 js 不含该字面量
    for name, js in (('tilt.js', tilt_js), ('scene-parallax.js', sp_js)):
        assert '</script' not in js.lower(), '%s 含 </script，不能直接内联' % name

    # ① 脚本内联
    for tag, js in (('../js/tilt.js', tilt_js), ('../js/scene-parallax.js', sp_js)):
        old = '<script src="%s"></script>' % tag
        assert old in html, '未找到 %s 引用' % tag
        html = html.replace(old, '<script>\n%s\n</script>' % js)

    # ② base → srcMap（注入 6 个 data URI）
    old_base = "  window.SceneParallax.base = '../';"
    assert old_base in html, '未找到 base 设置行'
    lines = ['  /* 自包含：webp 内嵌为 data URI，file:// 与静态托管均可出图。',
             '     引擎 _src 对 srcMap 缺席时行为逐字节一致；此处覆盖全部 6 个路径。 */',
             '  window.SceneParallax.srcMap = {']
    for p in sorted(SRC_MAP):
        lines.append("    '%s':" % p)
        lines.append("      '%s'," % SRC_MAP[p])
    lines.append('  };')
    html = html.replace(old_base, '\n'.join(lines))

    # ③ 收尾校验：不得残留相对引用与占位符
    assert '@@' not in html, '残留 @@ 占位符'
    assert 'src="../js/' not in html, '残留相对脚本引用'
    assert '\n  window.SceneParallax.base' not in html, '残留 base 可执行行'
    # 注：引擎源码注释里有「…设 SceneParallax.base = '../'」字样（内联后随注释进页），
    # 属文档性出现，不影响执行，故不按裸字符串断言。
    for p in sorted(SRC_MAP):
        assert html.count(SRC_MAP[p]) == 1, '%s 的 data URI 注入次数异常' % p

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

    print('OK  %s  %.1fKB' % (os.path.relpath(OUT, ROOT), os.path.getsize(OUT) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
