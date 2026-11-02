/* 天清往事 · 瓷片查看器（独立模块，2026-11-02 从 app.js 拆出）
 *
 * 为什么单独一个文件：
 *   查看器是「点开才用」的重 UI（约 170 行 + 一套 API），和手札主流程没有共享状态，
 *   却和 app.js（1900 行）绑在一起 —— 任何一个对话框改手札，都可能把它一起覆盖。
 *   拆成独立模块后，两边各改各的文件，冲突面归零。
 *
 * 依赖注入（不反向依赖 app.js 的闭包）：
 *   TQViewer.open({ id, list, shards, sfx })
 *     id      要打开的瓷片号（1..16）
 *     list    可翻的瓷片号数组（升序，来自存档「已拾得」）
 *     shards  window.TQ_DATA.shards
 *     sfx     音效函数（可选，缺省静音）
 *   渲染仍走 frag.js 的 F.spin3d / F.shardInner，本模块只管壳与交互。
 *
 * 容器约束（小红书小工具）：
 *   零网络请求、零外部资源、零 WebGL；帧数据全部来自包内 webp。
 *   ES2017 / Chrome 61 基线：无箭头函数、无模板字符串、无 let/const、无 Object.assign。
 */
(function (global) {
  'use strict';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  /* 同一时刻只允许一个查看器：重复 open 时先关旧的，避免叠层 */
  var CURRENT = null;

  function open(opts) {
    opts = opts || {};
    var F = global.F;
    var shards = opts.shards || {};
    var srcList = opts.list && opts.list.length ? opts.list : [Number(opts.id)];
    var sfx = opts.sfx || function () {};

    var id = Number(opts.id);
    var curIdx = srcList.indexOf(id);
    if (curIdx < 0) { srcList = [id]; curIdx = 0; }
    var picked = srcList;

    if (CURRENT && CURRENT.close) { CURRENT.close(); }

    var key = String(id);
    var sh = shards[key] || {};
    sfx('tap');

    var ov = el('div', 'shv');
    var mask = el('div', 'shv-mask');
    var sheet = el('div', 'shv-sheet');
    ov.appendChild(mask);
    ov.appendChild(sheet);

    /* ---------- 头部：标题 + 计数 + 翻片 + 关闭 ---------- */
    var head = el('div', 'shv-head');
    var nm = el('div', 'shv-name', '瓷片 · ' + (sh.name || key));
    if (sh.prov) { nm.appendChild(el('span', 'shv-prov', sh.prov)); }
    nm.appendChild(el('span', 'shv-count',
      picked.length > 1 ? ' ' + (curIdx + 1) + '/' + picked.length : ''));
    head.appendChild(nm);

    /* 翻片按钮放标题行：工具条已经有 8 个，再塞两个会把「旋转」挤到第二行 */
    if (picked.length > 1) {
      var pv = el('button', 'shv-nav shv-nav-prev', '‹');
      pv.setAttribute('aria-label', '上一枚瓷片');
      pv.addEventListener('click', function () { step(-1); });
      head.appendChild(pv);
      var nx = el('button', 'shv-nav shv-nav-next', '›');
      nx.setAttribute('aria-label', '下一枚瓷片');
      nx.addEventListener('click', function () { step(1); });
      head.appendChild(nx);
    }

    var x = el('button', 'shv-x', '✕');
    x.setAttribute('aria-label', '返回手札');
    x.addEventListener('click', close);
    head.appendChild(x);
    sheet.appendChild(head);

    /* ---------- 舞台 ---------- */
    var stage = el('div', 'shv-stage');
    stage.setAttribute('data-mode', 'rot');
    sheet.appendChild(stage);

    /* ---------- HUD ---------- */
    var hud = el('div', 'shv-hud');
    var hudView = el('span', 'shv-hud-i', '视角 —');
    var hudZoom = el('span', 'shv-hud-i', '1.0×');
    var hudMode = el('span', 'shv-hud-i', '拖动旋转');
    hud.appendChild(hudView); hud.appendChild(hudZoom); hud.appendChild(hudMode);
    sheet.appendChild(hud);

    /* ---------- 工具条 ---------- */
    var bar = el('div', 'shv-bar');
    function mk(label, fn, extra) {
      var b = el('button', 'shv-b' + (extra ? ' ' + extra : ''), label);
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        sfx('tap');
        fn(b);
        sync();
      });
      bar.appendChild(b);
      return b;
    }
    var bTop = mk('俯视', function () { cmd({ pitchAbs: pmax() }); }, 'shv-b-rot');
    var bFlat = mk('平视', function () { cmd({ pitchAbs: 0 }); }, 'shv-b-rot');
    var bLow = mk('仰视', function () { cmd({ pitchAbs: -pmax() }); }, 'shv-b-rot');
    var bIn = mk('放大', function () { cmd({ zoom: zoomNow() * 1.5 }); });
    var bOut = mk('缩小', function () { cmd({ zoom: zoomNow() / 1.5 }); });
    var bInner = mk('内壁', function () { toggleInner(); }, 'shv-b-wide');
    var bAuto = mk('自动旋转', function () { cmd({ auto: !autoNow() }); }, 'shv-b-rot');
    var bReset = mk('复位', function () { cmd({ reset: true }); });
    sheet.appendChild(bar);

    var tip = el('div', 'shv-tip', '拖动旋转 · 双指或双击放大 · 点「内壁」看釉下笔触');
    sheet.appendChild(tip);
    if (sh.text) { sheet.appendChild(el('div', 'shv-quote', sh.text)); }
    if (sh.source) { sheet.appendChild(el('div', 'shv-src', '——' + sh.source)); }

    /* ---------- 状态读取 ---------- */
    function st() { return (stage && stage.__tq) ? stage.__tq() : null; }
    function pmax() { var s = st(); return s ? s.pitchMax : 45; }
    function zoomNow() { var s = st(); return s ? s.zoom : 1; }
    function autoNow() { var s = st(); return !!(s && s.auto); }
    function cmd(c) { if (stage && stage.__cmd) { stage.__cmd(c); } }

    /* ---------- 内壁 / 旋转 互切 ---------- */
    var onInner = false;
    function toggleInner() {
      if (!F) { return; }
      onInner = !onInner;
      if (bar) { bar.setAttribute('data-inner', onInner ? '1' : '0'); }
      if (onInner) {
        /* 换掉旋转实例时必须清掉旧钩子，否则 HUD 还在读上一个实例的 yaw/zoom */
        try { delete stage.__tq; delete stage.__cmd; } catch (e0) { stage.__tq = null; stage.__cmd = null; }
        stage.setAttribute('data-mode', 'inner');
        F.shardInner(stage, key);
        bInner.textContent = '旋转';
        bInner.setAttribute('data-on', '1');
        tip.textContent = '静态内壁 · 双指缩放 / 拖动平移 · 点「旋转」换角度';
      } else {
        stage.setAttribute('data-mode', 'rot');
        F.spin3d(stage, key);
        bInner.textContent = '内壁';
        bInner.removeAttribute('data-on');
        tip.textContent = '拖动旋转 · 双指或双击放大 · 点「内壁」看釉下笔触';
      }
    }

    /* ---------- HUD 同步（200ms 轮询只读状态，比每帧 setText 便宜） ---------- */
    var HUD_PITCH = ['俯视', '平视', '仰视'];
    function sync() {
      if (!ov.parentNode) { return; }
      if (!st()) {
        hudView.textContent = '静态内壁';
        hudZoom.textContent = '双指缩放';
        hudMode.textContent = onInner ? '内壁细看' : '加载中';
        return;
      }
      var s = st();
      var total = s.cols || 12;
      var pName = (s.rows === 3) ? (HUD_PITCH[Math.max(0, Math.min(2, s.pitchIdx))] || '平视') : '';
      hudView.textContent = '视角 ' + (s.yawIdx + 1) + '/' + total + (pName ? ' · ' + pName : '');
      hudZoom.textContent = s.zoom.toFixed(1) + '×';
      hudMode.textContent = s.auto ? '自动旋转中' : '拖动旋转';
      bAuto.setAttribute('data-on', s.auto ? '1' : '0');
      bTop.setAttribute('data-on', s.pitchIdx === 0 ? '1' : '0');
      bFlat.setAttribute('data-on', s.pitchIdx === 1 ? '1' : '0');
      bLow.setAttribute('data-on', s.pitchIdx === 2 ? '1' : '0');
      if (s.zoom <= 1.001) { bOut.setAttribute('data-off', '1'); } else { bOut.removeAttribute('data-off'); }
    }
    var hudTimer = setInterval(sync, 200);

    /* ---------- 关闭 ---------- */
    var closed = false;
    function close() {
      if (closed) { return; }
      closed = true;
      if (hudTimer) { clearInterval(hudTimer); hudTimer = 0; }
      document.removeEventListener('keydown', escHandler);
      if (ov.parentNode) { ov.parentNode.removeChild(ov); }
      document.body.classList.remove('shv-open');
      if (CURRENT === api) { CURRENT = null; }
    }
    function escHandler(e) {
      var k = e.key || e.keyCode;
      if (k === 'Escape' || k === 'Esc' || k === 27) { close(); }
    }
    mask.addEventListener('click', close);
    document.addEventListener('keydown', escHandler);

    /* ---------- 翻片：整层重建 ----------
     * key / sh / onInner 都是闭包变量，原地改一旦漏掉一处就会串台
     * （标题是新片、内壁还是旧片）；重建只多一次 0.22s 入场动画，
     * 手感上反而更像「翻到下一片」。 */
    function step(d) {
      if (picked.length < 2) { return; }
      var n = picked[(curIdx + d + picked.length) % picked.length];
      if (n === id) { return; }
      close();
      open({ id: n, list: picked, shards: shards, sfx: sfx });
    }

    var api = { close: close, el: ov };
    CURRENT = api;

    document.body.appendChild(ov);
    document.body.classList.add('shv-open');
    if (F) { F.spin3d(stage, key); }

    /* 默认停在旋转档：开场即 auto-rotate + 可拖拽旋转，直接满足「可旋转互动」；
     * 旋转帧为 160px/格（拖拽旋转时够用，放大看细节才糊），
     * 想看釉下笔触/清晰细节，点工具条「内壁」切到静态细看档（920px）。 */
    setTimeout(function () {
      if (!stage.isConnected) { return; }
      sync();
    }, 30);
    setTimeout(sync, 60);
    setTimeout(sync, 500);

    return api;
  }

  global.TQViewer = { open: open, version: '1.0.0' };
})(window);
