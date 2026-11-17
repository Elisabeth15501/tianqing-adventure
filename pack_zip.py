#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 minitool/ 发布目录压成可上传 zip，并做入口/排除项自检。
用法：python pack_zip.py <输出文件名.zip>
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'minitool')


def main():
    if len(sys.argv) < 2:
        raise SystemExit('usage: python pack_zip.py <name.zip>')
    name = sys.argv[1]
    if not name.lower().endswith('.zip'):
        name += '.zip'
    out = os.path.join(ROOT, name)
    # 用 'w' 直接覆盖：不做任何删除操作
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for dp, _, fs in os.walk(SRC):
            for f in sorted(fs):
                fp = os.path.join(dp, f)
                arc = os.path.relpath(fp, SRC).replace('\\', '/')
                z.write(fp, arc)

    with zipfile.ZipFile(out) as z:
        names = z.namelist()
        htmls = [n for n in names if n.lower().endswith(('.html', '.htm'))]
        bad = [n for n in names if 'assets-check' in n or n.endswith('tilt-web.js') or n.endswith('mini_tool.json')]
        dup = len(names) - len(set(names))
        print('zip       :', out)
        print('files     :', len(names))
        print('html      :', htmls)
        print('excluded  :', bad or '(none)')
        print('duplicate :', dup)
        assert htmls == ['index.html'], '包内必须且只能有 index.html'
        assert not bad, '排除项泄漏进包: %r' % bad
        assert dup == 0, '存在重复条目'
        print('SELF-CHECK PASS')


if __name__ == '__main__':
    main()
