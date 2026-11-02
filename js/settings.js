/* 天清往事 · 设定页（2026-11-02 v1）
 *
 * 一、为什么单独一个模块
 *   设定页要同时改三样东西：音效（TQSFX）、各动手小节的教学（TQF.iv）、画面素材（TQA）。
 *   这三者分属三个文件，若把页面塞进 app.js，任何一处改键名都要动主流程文件。
 *   这里只做「读设置 → 画页面 → 写设置 → 通知」，不碰游戏流程。
 *
 * 二、存储口径
 *   一律 localStorage（与存档分开）。玩家换存档 / 从头再来，不该把已经关掉的音效又打开。
 *   键名：
 *     tq_sfx          'on' | 'off'   音效总开关（既有键，手札里的旧开关仍在用）
 *     tq_tut_<id>     'on' | 'off'   单个动手小节的操作教学（默认 on，缺省即开）
 *     tq_assets_mode  'auto'|'vector' 恒用预设图样（既有键）
 *   写入走 TQA.setSetting（存在时），保证与旧代码同一个落点。
 *
 * 三、小节 id 与 data.js 的 cfg 键一一对应
 *   tang / shi_food / shang / folk / shi_folk / shi_proof / lamp / touhu
 *   ★shi_* 是史官线的同名小节（配置与画面都不同），故是独立开关，不与女官线共用。
 */
(function (global) {
  'use strict';

  /* 顺序 = 游戏内出现的顺序（寅时 → 午时 → 酉时 → 终幕） */
  var SECTIONS = [
    { id: 'tang',      name: '一碗汤饼',   where: '寅时 · 尚食局', who: '女官线' },
    { id: 'shi_food',  name: '食单记注',   where: '寅时 · 廊下',   who: '史官线' },
    { id: 'shang',     name: '执觞上寿',   where: '寅时 · 习礼',   who: '' },
    { id: 'folk',      name: '丝结承露囊', where: '午时 · 汴桥',   who: '女官线' },
    { id: 'shi_folk',  name: '民俗记注',   where: '午时 · 汴桥',   who: '史官线' },
    { id: 'shi_proof', name: '校字补阙',   where: '午时 · 滋德殿', who: '史官线' },
    { id: 'lamp',      name: '旧灯',       where: '酉时 · 滋德殿', who: '' },
    { id: 'touhu',     name: '投壶',       where: '终幕 · 玉津园', who: '' }
  ];

  var TUT_KEY = 'tq_tut_';
  var listeners = [];

  function lsGet(k, d) {
    try {
      var v = global.localStorage.getItem(k);
      return (v === null || typeof v === 'undefined') ? d : v;
    } catch (e) { return d; }
  }
  function lsSet(k, v) {
    if (global.TQA && global.TQA.setSetting) { global.TQA.setSetting(k, v); return; }
    try { global.localStorage.setItem(k, v); } catch (e) { /* 隐私模式静默 */ }
  }
  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (e) { /* 单个订阅者出错不影响其它 */ }
    }
  }

  /* ---------- 读 / 写 ---------- */
  function tutOn(id) {
    if (!id) { return true; }
    return lsGet(TUT_KEY + id, 'on') !== 'off';
  }
  function setTut(id, on) {
    if (!id) { return; }
    lsSet(TUT_KEY + id, on ? 'on' : 'off');
    emit();
  }
  function sfxOn() {
    if (global.TQSFX && global.TQSFX.isEnabled) { return !!global.TQSFX.isEnabled(); }
    return lsGet('tq_sfx', 'on') !== 'off';
  }
  function setSfx(on) {
    if (global.TQSFX && global.TQSFX.setEnabled) { global.TQSFX.setEnabled(!!on); }
    lsSet('tq_sfx', on ? 'on' : 'off');
    emit();
  }
  function assetsVector() {
    if (global.TQA && global.TQA.assetsMode) { return global.TQA.assetsMode() === 'vector'; }
    return lsGet('tq_assets_mode', 'auto') === 'vector';
  }
  function setAssetsVector(on) {
    lsSet('tq_assets_mode', on ? 'vector' : 'auto');
    emit();
  }

  /* ---------- 小工具 ---------- */
  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (typeof text === 'string') { n.textContent = text; }
    return n;
  }
  function switchBtn(getV, setV) {
    var b = h('button', 'set-sw', '');
    b.type = 'button';
    function paint() {
      var on = !!getV();
      b.textContent = on ? '开' : '关';
      b.setAttribute('data-on', on ? '1' : '0');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    b.addEventListener('click', function () {
      setV(!getV());
      paint();
      if (global.TQSFX) { try { global.TQSFX.play('tap'); } catch (e) {} }
    });
    paint();
    return b;
  }

  /* ---------- 设定页 ---------- */
  var ovEl = null;
  function close() {
    if (ovEl && ovEl.parentNode) { ovEl.parentNode.removeChild(ovEl); }
    ovEl = null;
    document.removeEventListener('keydown', escH);
  }
  function escH(e) {
    var k = e.key || e.keyCode;
    if (k === 'Escape' || k === 'Esc' || k === 27) { close(); }
  }

  function open() {
    close();                       /* 重入即重画，不叠层 */
    var host = document.getElementById('app') || document.body;
    var ov = h('div', 'set-ov');
    var panel = h('div', 'set-panel');

    /* --- 页头 --- */
    var hd = h('div', 'set-hd');
    var tt = h('div', 'set-tt');
    tt.appendChild(h('div', 'set-tt1', '设定'));
    var vs = global.TQ_VERSION || {};
    tt.appendChild(h('div', 'set-tt2', '天清往事 · ' + (vs.stage ? vs.stage : '')));
    hd.appendChild(tt);
    var x = h('button', 'set-x', '合上');
    x.type = 'button';
    x.addEventListener('click', close);
    hd.appendChild(x);
    panel.appendChild(hd);

    /* --- 声音 --- */
    panel.appendChild(h('div', 'set-sec', '声音'));
    var rSfx = h('div', 'set-row');
    var tSfx = h('div', 'set-txt');
    tSfx.appendChild(h('div', 'set-n', '音效'));
    tSfx.appendChild(h('div', 'set-d', '推进、点按、拾得时的轻响。本作无背景音乐；关掉不影响任何流程。'));
    rSfx.appendChild(tSfx);
    var tryBox = h('div', 'set-minis');
    var tryBtn = h('button', 'set-mini', '试听');
    tryBtn.type = 'button';
    tryBtn.addEventListener('click', function () {
      if (global.TQSFX && global.TQSFX.unlock) { global.TQSFX.unlock(); }
      if (!sfxOn()) { setSfx(true); refreshSfx(); }   /* 关了还试听？先打开，再响 */
      if (global.TQSFX) { try { global.TQSFX.play('bead'); } catch (e) {} }
    });
    tryBox.appendChild(tryBtn);
    rSfx.appendChild(tryBox);
    var sfxSw = switchBtn(sfxOn, setSfx);
    rSfx.appendChild(sfxSw);
    function refreshSfx() {
      var on = !!sfxOn();
      sfxSw.textContent = on ? '开' : '关';
      sfxSw.setAttribute('data-on', on ? '1' : '0');
      sfxSw.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    panel.appendChild(rSfx);

    /* --- 操作教学 --- */
    panel.appendChild(h('div', 'set-sec', '操作教学'));
    var rAll = h('div', 'set-row set-row-all');
    var tAll = h('div', 'set-txt');
    tAll.appendChild(h('div', 'set-n', '逐节开关'));
    tAll.appendChild(h('div', 'set-d', '每个动手小节一份。关掉后该小节不再显示步骤条、提示文字与手势示意，' +
      '画面只留器具本身；小节内右下角的「教学」按钮可随时改回来。'));
    rAll.appendChild(tAll);
    var miniBox = h('div', 'set-minis');
    var bOn = h('button', 'set-mini', '全部开');
    var bOff = h('button', 'set-mini', '全部关');
    bOn.type = 'button'; bOff.type = 'button';
    bOn.addEventListener('click', function () {
      for (var i = 0; i < SECTIONS.length; i++) { setTut(SECTIONS[i].id, true); }
      refreshRows();
    });
    bOff.addEventListener('click', function () {
      for (var i = 0; i < SECTIONS.length; i++) { setTut(SECTIONS[i].id, false); }
      refreshRows();
    });
    miniBox.appendChild(bOn); miniBox.appendChild(bOff);
    rAll.appendChild(miniBox);
    panel.appendChild(rAll);

    var rowSwitches = [];
    function refreshRows() {
      for (var i = 0; i < rowSwitches.length; i++) { rowSwitches[i](); }
    }
    for (var s = 0; s < SECTIONS.length; s++) {
      (function (sec) {
        var row = h('div', 'set-row set-row-sect');
        var tx = h('div', 'set-txt');
        var nm = h('div', 'set-n', sec.name);
        if (sec.who) { nm.appendChild(h('span', 'set-tag', sec.who)); }
        tx.appendChild(nm);
        tx.appendChild(h('div', 'set-d', sec.where));
        row.appendChild(tx);
        var sw = switchBtn(function () { return tutOn(sec.id); }, function (v) { setTut(sec.id, v); });
        row.appendChild(sw);
        panel.appendChild(row);
        /* 全部开/关后要重画每一行：复用 switchBtn 内部的 paint 不便，直接重设文本 */
        rowSwitches.push(function () {
          var on = tutOn(sec.id);
          sw.textContent = on ? '开' : '关';
          sw.setAttribute('data-on', on ? '1' : '0');
          sw.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }(SECTIONS[s]));
    }

    /* --- 画面 --- */
    panel.appendChild(h('div', 'set-sec', '画面'));
    var rArt = h('div', 'set-row');
    var tArt = h('div', 'set-txt');
    tArt.appendChild(h('div', 'set-n', '恒用预设图样'));
    tArt.appendChild(h('div', 'set-d', '不走 AI 素材，一律用程序绘制的图样。弱网或素材缺失时更稳，笔触会简一些。'));
    rArt.appendChild(tArt);
    rArt.appendChild(switchBtn(assetsVector, setAssetsVector));
    panel.appendChild(rArt);

    /* --- 关于 --- */
    panel.appendChild(h('div', 'set-sec', '关于'));
    var kv = h('div', 'set-kv');
    function kvRow(k, v) {
      var r = h('div', 'set-kvrow');
      r.appendChild(h('span', 'set-k', k));
      r.appendChild(h('span', 'set-v', v));
      kv.appendChild(r);
    }
    kvRow('版本', (vs.ver || '—') + (vs.stage ? '（' + vs.stage + '）' : ''));
    kvRow('构建', vs.build || '—');
    if (vs.note) { kvRow('本次', vs.note); }
    if (vs.commit) { kvRow('提交', vs.commit); }
    kvRow('藏档', '进度记于本机，清缓存会一并清除');
    panel.appendChild(kv);
    panel.appendChild(h('div', 'set-foot',
      '设定与存档分开保存：更换存档不会改动这里的开关。'));

    ov.appendChild(panel);
    ov.addEventListener('click', function (e) { if (e.target === ov) { close(); } });
    document.addEventListener('keydown', escH);
    host.appendChild(ov);
    ovEl = ov;
    if (global.TQSFX) { try { global.TQSFX.play('open'); } catch (e) {} }
  }

  global.TQSET = {
    sections: SECTIONS,
    tutOn: tutOn,
    setTut: setTut,
    sfxOn: sfxOn,
    setSfx: setSfx,
    assetsVector: assetsVector,
    setAssetsVector: setAssetsVector,
    onChange: function (fn) { if (typeof fn === 'function') { listeners.push(fn); } },
    offChange: function (fn) {
      for (var i = listeners.length - 1; i >= 0; i--) { if (listeners[i] === fn) { listeners.splice(i, 1); } }
    },
    open: open,
    close: close,
    isOpen: function () { return !!ovEl; }
  };
}(window));
