#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the 小红书小工具 (mini-tool) offline zip artifact for tianqing-adventure.

与 build_site.py (GitHub Pages) 的区别 —— 小红书容器合规专用：
  1. 排除 js/tilt-web.js（含 DeviceOrientationEvent / requestPermission，属 §4.1 容器内禁用；
     tilt.js 在容器内 inContainer() 直接返回、绝不请求该文件，排除零风险）。
  2. ★排除 assets-check.html / assets-check.js：小红书打包器要求 zip 根目录「有且只有一个」
     入口 html，且必须先于其他 html 命中 index.html。诊断页与 index.html 同在根目录时，
     assets-check.html 按字母序排在前面，会被打包器当成入口并报
     「入口 html 文件必须…命名为 index.html，当前文件为 assets-check.html」。
     诊断页仍保留在仓库/Pages 供真机排障，但不进发布包。
  3. 写 mini_tool.json（高消耗能力标记：本项目无 Worker / WebAssembly / 离屏渲染 / 游戏引擎
     → is_high_consumption_scene: false）。
其余沿用 build_site.py 的素材清单与相对路径约定（容器离线 zip 根为 /）。
"""
import os
import shutil
import sys
import json

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, 'minitool')

RUNTIME_DIRS = [
    ('assets/shards', 'assets/shards'),
    ('assets/chars', 'assets/chars'),
    ('assets/scenes/s1_wanshou', 'assets/scenes/s1_wanshou'),
    ('assets/scenes/s1_wanshou_p', 'assets/scenes/s1_wanshou_p'),
    ('assets/scenes/s2_guangde', 'assets/scenes/s2_guangde'),
    ('assets/scenes/s3_banquet', 'assets/scenes/s3_banquet'),
    ('assets/scenes/s4_pano', 'assets/scenes/s4_pano'),
    ('assets/scenes/s5_zide', 'assets/scenes/s5_zide'),
    ('assets/scenes/s5_zide_h', 'assets/scenes/s5_zide_h'),
    ('assets/scenes/s6_yujin', 'assets/scenes/s6_yujin'),
    ('assets/scenes/s7_cixin', 'assets/scenes/s7_cixin'),
    ('assets/scenes/s7_cixin_h', 'assets/scenes/s7_cixin_h'),
]

# 容器禁用 / Pages-only / 非入口页：禁止打进小工具包
EXCLUDE_JS = {'tilt-web.js', 'assets-check.js'}
# 发布包只允许一个 html 入口：index.html（诊断页 assets-check.html 不进包）
EXCLUDE_HTML = {'assets-check.html'}


def copy_dir(src_rel, dst_rel):
    src = os.path.join(ROOT, src_rel)
    dst = os.path.join(DIST, dst_rel)
    if not os.path.isdir(src):
        print('WARN skip missing:', src_rel)
        return
    shutil.copytree(src, dst)


def write_manifest():
    path = os.path.join(DIST, 'mini_tool.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'is_high_consumption_scene': False}, f, ensure_ascii=False)
    print('wrote mini_tool.json (is_high_consumption_scene=false)')


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(os.path.join(DIST, 'css'))
    os.makedirs(os.path.join(DIST, 'js'))

    # 唯一入口：index.html（必须在根、且是包内唯一 html）
    shutil.copy(os.path.join(ROOT, 'index.html'), os.path.join(DIST, 'index.html'))

    shutil.copy(os.path.join(ROOT, 'css', 'app.css'), os.path.join(DIST, 'css', 'app.css'))

    js_src = os.path.join(ROOT, 'js')
    n_js = 0
    for f in sorted(os.listdir(js_src)):
        if not f.endswith('.js') or '.bak' in f or f in EXCLUDE_JS:
            continue
        shutil.copy(os.path.join(js_src, f), os.path.join(DIST, 'js', f))
        n_js += 1
    print('js files copied: %d (excluded: %s)' % (n_js, ', '.join(sorted(EXCLUDE_JS))))

    # 诊断页不随发布包分发：清理所有指向 assets-check.html 的引用，避免 404。
    # 只改发布副本；源码 / Pages 仍保留诊断页。
    PATCHES = [
        (os.path.join(DIST, 'js', 'app.js'), [
            ("    if (/[?&]assets=1/.test(location.search)) {\n      location.replace('./assets-check.html');\n      return;\n    }",
             "    /* 诊断页不随发布包分发：?assets=1 排障入口在小工具内禁用 */"),
            ("diag.setAttribute('href', './assets-check.html');",
             "diag.setAttribute('href', '#');"),
        ]),
        (os.path.join(DIST, 'js', 'portraits.js'), [
            ("a.setAttribute('href', './assets-check.html');",
             "a.removeAttribute('href');"),
        ]),
    ]
    for path, pairs in PATCHES:
        s = open(path, encoding='utf-8').read().replace('\r\n', '\n')
        for old, new in pairs:
            if old not in s:
                raise SystemExit('PATCH FAILED (%s): 未找到 %r' % (os.path.basename(path), old[:48]))
            s = s.replace(old, new)
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(s)
    print('patched assets-check.html references -> removed')

    for src_rel, dst_rel in RUNTIME_DIRS:
        copy_dir(src_rel, dst_rel)

    write_manifest()

    total = 0
    n_files = 0
    htmls = []
    for dp, _, fs in os.walk(DIST):
        for f in fs:
            fp = os.path.join(dp, f)
            total += os.path.getsize(fp)
            n_files += 1
            if f.lower().endswith(('.html', '.htm')):
                htmls.append(os.path.relpath(fp, DIST).replace('\\', '/'))
    print('minitool built -> %d files, %.2f MB' % (n_files, total / 1024.0 / 1024.0))

    assert os.path.exists(os.path.join(DIST, 'index.html'))
    assert os.path.exists(os.path.join(DIST, 'js', 'viewer.js'))
    assert os.path.exists(os.path.join(DIST, 'js', 'frag.js'))
    assert not os.path.exists(os.path.join(DIST, 'js', 'tilt-web.js')), 'tilt-web.js 不得进容器包'
    assert not os.path.exists(os.path.join(DIST, 'assets-check.html')), '诊断页不得进发布包'
    assert os.path.exists(os.path.join(DIST, 'mini_tool.json'))
    assert htmls == ['index.html'], '发布包必须且只能有 index.html 一个 html，实际: %r' % htmls
    print('sanity OK (%d js files, html=%r)' % (n_js, htmls))
    return 0


if __name__ == '__main__':
    sys.exit(main())
