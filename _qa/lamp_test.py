# -*- coding: utf-8 -*-
"""挑灯（playLamp）接入自动化测试 · 2026-11-02
------------------------------------------------
跑法：cd 仓根 && python _qa/lamp_test.py
通道：preview/dev-iv.html?cfg=lamp&… → iframe-frame 同源轮询读 __metrics。
覆盖（与校准页逐条对齐的判据）：
  T1 擦罩全净   ：五处煤垢擦净 → 自动进注油拍、罩提起（dy=-34）、油位 0
  T2 擦罩半途   ：只擦 1~2 处就停 → 留在擦罩拍、分次不清零
  T3 注油过浅   ：按 1.3s 松手 → 提示「油浅了」、留在注油拍可补注
  T4 注油入带   ：按 3.2s（≈5 分）松手 → 判过、进点灯拍
  T5 注油溢出   ：按 8s 顶到盂沿上 8px → spilled=true、仍判过（零惩罚）
  T6 点灯点空   ：芯口外 22px 外点一下 → 不计次、提示「点在芯上」
  T7 整局贯通   ：三拍走完 → 罩落回（dy=0）、hits=3、stepTag=毕、过渡条可点
  T8 民俗记注回归：观俗拖完 → 问俗点摊主出气泡台词 → 落笔按问到的顺序出字
"""
import sys, json
sys.path.insert(0, '_qa')
import tp

FAILS = []
def check(name, cond, detail=''):
    tag = 'PASS' if cond else 'FAIL'
    print('  [%s] %s %s' % (tag, name, ('— ' + str(detail)) if (detail and not cond) else ''))
    if not cond:
        FAILS.append(name)

def run(q, budget=26000, w=800, h=640):
    d = tp.run(w, h, q, budget, page='dev-iv.html')
    if d is None:
        raise SystemExit('NO-DATA for ' + q)
    return d

print('== T1 擦罩全净 → 进注油拍、罩提起 ==')
# 无头下擦除≈7帧/s（rAF被吞、140ms保险丝），一处要~2.9s，五处+rub起点≈19s
d = run('cfg=lamp&rub=lamp&wait=21000')
s = d.get('state') or {}
check('errs=[]', d.get('errs') == [], d.get('errs'))
check('五处全净', s.get('clean') == 5, s)
check('进注油拍', s.get('beat') == 1, s.get('beat'))
check('步骤条=注油', '注油' in (d.get('stepTag') or ''), d.get('stepTag'))
check('罩已提起 dy=-34', s.get('shadeDy') == -34, s.get('shadeDy'))
check('油位=空盂 0 分', s.get('oilFen') == 0.0, s.get('oilFen'))
check('svg 已渲染', (d.get('nodes') or 0) > 55, d.get('nodes'))

print('== T2 擦罩半途：分次不清零 ==')
# 第一处净于 ~3.6s，第二处 ~6.4s ⇒ 4.8s 时 clean==1
d = run('cfg=lamp&rub=lamp&wait=4800')
s = d.get('state') or {}
check('留在擦罩拍', s.get('beat') == 0, s.get('beat'))
check('已净 1~2 处', s.get('clean') in (1, 2), s.get('clean'))
check('提示条在', '擦' in (d.get('val') or '') or '处' in (d.get('val') or ''), d.get('val'))

print('== T3 注油过浅 → 可补注 ==')
d = run('cfg=lamp&force=1&hold=1300&wait=5200')
s = d.get('state') or {}
check('留在注油拍', s.get('beat') == 1, s.get('beat'))
check('提示「油浅了」', '油浅了' in (d.get('val') or ''), d.get('val'))
check('油位 < 3.5 分', (s.get('oilFen') or 0) < 3.5, s.get('oilFen'))

print('== T4 注油入带（≈5 分）→ 判过 ==')
# 无头下帧增量封顶0.1s ⇒ 有效注速≈2.29px/s；5s≈11.4px≈5.7分（带内）
d = run('cfg=lamp&force=1&hold=5000&wait=7800')
s = d.get('state') or {}
check('进点灯拍', s.get('beat') == 2, s.get('beat'))
check('步骤条=点灯', '点灯' in (d.get('stepTag') or ''), d.get('stepTag'))
check('油位落在 3.5~7 分', 3.5 <= (s.get('oilFen') or 0) <= 7, s.get('oilFen'))
check('未溢出', s.get('spilled') is False, s.get('spilled'))

print('== T5 注油溢出 → 零惩罚判过 + 油渍 ==')
# 顶到油位下限（盂沿上8px=10分）要灌28px ≈ 12.2s ⇒ hold=13.5s
d = run('cfg=lamp&force=1&hold=13500&wait=15500')
s = d.get('state') or {}
check('进点灯拍', s.get('beat') == 2, s.get('beat'))
check('spilled=true', s.get('spilled') is True, s.get('spilled'))
check('油位顶在下限 10 分', s.get('oilFen') == 10.0, s.get('oilFen'))

print('== T6 点灯点空 → 不计次 ==')
d = run('cfg=lamp&force=2&lite=far&wait=4600')
s = d.get('state') or {}
check('仍在点灯拍第一下之前', s.get('beat') == 2 and s.get('lightN') == 0, s)
check('提示「点在芯上」', '芯' in (d.get('val') or ''), d.get('val'))
check('罩仍提着 dy=-34', s.get('shadeDy') == -34, s.get('shadeDy'))

print('== T7 整局贯通（跳过前两拍直进点灯）==')
d = run('cfg=lamp&force=2&tapN=150,112,3&sheet=1&wait=9000')
s = d.get('state') or {}
check('三下点满', s.get('lightN') == 3, s)
check('罩落回 dy=0', s.get('shadeDy') == 0, s.get('shadeDy'))
check('lightDone', s.get('lightDone') is True, s)
check('本局 hits=3', d.get('hits') == 3, d.get('hits'))
check('stepTag=毕', (d.get('stepTag') or '') == '毕', d.get('stepTag'))
check('errs=[]', d.get('errs') == [], d.get('errs'))

print('== T8 民俗记注：观俗拖完 → 问俗气泡 → 落笔按问到顺序 ==')
# 观俗：从起点一路拖到最右（三程），三个观察位全入视口 → 自动进问俗
d = run('cfg=shi_folk&drag2=20,100,280,100&wait=5200', budget=30000)
s = d.get('state') or {}
check('观俗完成进问俗', s.get('beat') == 1, s.get('beat'))
check('三段都看过', s.get('seen') == [True, True, True], s.get('seen'))
check('errs=[]', d.get('errs') == [], d.get('errs'))
# 点空：问俗拍点空白处 → 方案 §5.3 气泡文案
d = run('cfg=shi_folk&force=1&tapN=60,150,1&wait=4200', budget=20000)
check('点空提示（桥上人多）', '桥上人多' in (d.get('val') or ''), d.get('val'))
# 全流程：按 2→0→1 问三位（验证落笔顺序）→ 点三笔 → 过渡条
d = run('cfg=shi_folk&folk=1&sheet=1&wait=10500', budget=34000)
s = d.get('state') or {}
check('三人问齐', (s.get('asked') or []) and len(s.get('asked')) == 3, s.get('asked'))
check('问到顺序 = 2→0→1', s.get('asked') == [2, 0, 1], s.get('asked'))
check('三笔记毕', s.get('notes') == 3, s.get('notes'))
check('本局 hits=3', d.get('hits') == 3, d.get('hits'))
check('stepTag=毕', (d.get('stepTag') or '') == '毕', d.get('stepTag'))
check('errs=[]', d.get('errs') == [], d.get('errs'))

print('')
print('RESULT: %s' % ('ALL PASS' if not FAILS else 'FAIL -> ' + ', '.join(FAILS)))
sys.exit(0 if not FAILS else 1)
