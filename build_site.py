#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the static deploy bundle for GitHub Pages.

Runtime set (verified against assets.js / portraits.js / scenes.js):
  index.html
  css/app.css
  js/*.js                 (exclude *.bak* backups)
  assets/shards/*         16 atlas + 16 ll + 16 inner + vessel_ll + json
  assets/chars/*          33 portrait webp (20 角色)
  assets/scenes/*         ★全部十目录（2026-11-02 起场景素材正式接入：寅 S1 / 辰 S3 / 午 S4 /
                          酉 S5 / 终幕 S3→S6 / 瓷心 S7）。旧白名单只放 s5，其余场景在 Pages
                          上会 404 —— 素材入库了但没进部署包，等于没接。
The app uses only relative paths (./css ./js ./assets) so it works under the
GitHub Pages subpath /tianqing-adventure/ with no base href.
"""
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, 'dist')

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


def copy_dir(src_rel, dst_rel):
    src = os.path.join(ROOT, src_rel)
    dst = os.path.join(DIST, dst_rel)
    if not os.path.isdir(src):
        print('WARN skip missing:', src_rel)
        return
    shutil.copytree(src, dst)


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(os.path.join(DIST, 'css'))
    os.makedirs(os.path.join(DIST, 'js'))

    # index.html
    shutil.copy(os.path.join(ROOT, 'index.html'), os.path.join(DIST, 'index.html'))
    # 素材自检页（2026-11-02）：真机排障时要在手机上直接看「哪张图没下来、解码尺寸多少」，
    # 之前它只躺在仓库根目录、从没进过 dist，线上访问是 404。它只依赖 ./js/assets.js
    # 与 ./assets/**（本包都已带），所以原样拷到根就行。
    chk = os.path.join(ROOT, 'assets-check.html')
    if os.path.exists(chk):
        shutil.copy(chk, os.path.join(DIST, 'assets-check.html'))
    else:
        print('WARN missing assets-check.html')
    # css
    shutil.copy(os.path.join(ROOT, 'css', 'app.css'),
                os.path.join(DIST, 'css', 'app.css'))
    # js (exclude backups)
    js_src = os.path.join(ROOT, 'js')
    n_js = 0
    for f in sorted(os.listdir(js_src)):
        if f.endswith('.js') and '.bak' not in f:
            shutil.copy(os.path.join(js_src, f), os.path.join(DIST, 'js', f))
            n_js += 1
    # assets
    for src_rel, dst_rel in RUNTIME_DIRS:
        copy_dir(src_rel, dst_rel)

    # size report
    total = 0
    n_files = 0
    for dp, _, fs in os.walk(DIST):
        for f in fs:
            total += os.path.getsize(os.path.join(dp, f))
            n_files += 1
    print('dist built -> %d files, %.2f MB' % (n_files, total / 1024.0 / 1024.0))

    # sanity checks
    assert os.path.exists(os.path.join(DIST, 'index.html'))
    assert os.path.exists(os.path.join(DIST, 'js', 'viewer.js'))
    assert os.path.exists(os.path.join(DIST, 'js', 'frag.js'))
    assert os.path.exists(os.path.join(DIST, 'assets', 'shards', 'vessel_ll.webp'))
    assert os.path.exists(os.path.join(DIST, 'assets', 'chars'))
    for d in ('s1_wanshou', 's1_wanshou_p', 's2_guangde', 's3_banquet', 's4_pano',
              's5_zide', 's5_zide_h', 's6_yujin', 's7_cixin', 's7_cixin_h'):
        assert os.path.exists(os.path.join(DIST, 'assets', 'scenes', d)), d
    assert n_js >= 10
    print('sanity OK (%d js files)' % n_js)
    return 0


if __name__ == '__main__':
    sys.exit(main())
