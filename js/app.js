/* 天清往事 · 应用主体（M1 垂直切片）
 * Chrome 61 基线：ES2017、无 inline script、无 onclick 属性、无 fetch、全 addEventListener。
 * 步骤类型：narr / card / shard / choice / shangshu（四拍节奏，失败零惩罚）。
 * 场景：title → role → act（含背景画）→ memo；幕毕自动存档；手札页手动存档/清档。
 */
(function (global) {
  'use strict';

  /* ---------- 平台安全区避让（2026-10-28） ----------
   * 依据官方 §3.11 getWindowInfo（客户端 9.49+）：safeArea + menuButtons{back,me,share}，
   * 均为「容器坐标系、逻辑像素」。目标：任何自绘 UI 都不与平台原生按钮/状态栏/Home 条重叠。
   * 优先序：getWindowInfo（权威） → URL 参数（真机调试） → __TQ_HOST__ / postMessage → 0。
   * 按钮按中心点归边：上半区→顶部预留到其 bottom；下半区→底部；左/右同理。
   * 窗口形态变化（旋转/分屏）后重新取一次（文档要求，无 resize 事件可订阅）。 */
  (function () {
    var GAP = 6; /* 按钮与自绘 UI 的最小视觉间距 [PLACEHOLDER·真机可微调] */
    var root = document.documentElement;
    function setVar(name, px) {
      root.style.setProperty(name, Math.max(0, Math.round(px)) + 'px');
    }
    function apply(ins) {
      setVar('--tq-top-inset', ins.top || 0);
      setVar('--tq-bottom-inset', ins.bottom || 0);
      setVar('--tq-left-inset', ins.left || 0);
      setVar('--tq-right-inset', ins.right || 0);
      /* 顶栏右侧额外避让：小红书右上角原生按钮（分享/我的）压在顶栏右侧握点上时，
       * 让它把「差事帖/手札」推离——只在按钮确实落在右上角时才生效。 */
      setVar('--tq-topbar-right', ins.topRight || 0);
    }
    /* URL 参数覆盖（真机调试/无容器时手动指定） */
    function fromQuery() {
      var q = location.search || '';
      function num(k) {
        var m = new RegExp('[?&]' + k + '=(\\d+(?:\\.\\d+)?)').exec(q);
        return m ? Math.round(parseFloat(m[1])) : 0;
      }
      var t = num('insetTop'), b = num('insetBottom'), l = num('insetLeft'), r = num('insetRight');
      if (!t && !b && !l && !r) { return null; }
      return { top: t, bottom: b, left: l, right: r, topRight: r };
    }
    /* 从 getWindowInfo 结果算四向预留
     * 归边规则（关键）：平台按钮通常只占顶部条/底部条，故顶部按钮只推 top、底部按钮只推 bottom；
     * 只有横跨中段的悬浮按钮才推 left/right——否则会把整页内容无谓地左右缩进。 */
    function measure(info) {
      if (!info || typeof info !== 'object') { return null; }
      var W = info.windowWidth || 0, H = info.windowHeight || 0;
      var ins = { top: 0, bottom: 0, left: 0, right: 0, topRight: 0 };
      var sa = info.safeArea;
      if (sa && typeof sa === 'object') {
        if (typeof sa.top === 'number') { ins.top = Math.max(ins.top, sa.top); }
        if (typeof sa.left === 'number') { ins.left = Math.max(ins.left, sa.left); }
        if (typeof sa.right === 'number' && W) { ins.right = Math.max(ins.right, W - sa.right); }
        if (typeof sa.bottom === 'number' && H) { ins.bottom = Math.max(ins.bottom, H - sa.bottom); }
      }
      var mb = info.menuButtons || {};
      ['back', 'me', 'share'].forEach(function (k) {
        var r = mb[k];
        if (!r || typeof r.width !== 'number' || typeof r.height !== 'number' || !r.width || !r.height) { return; }
        var midY = H ? (r.top + r.bottom) / 2 : 0;
        if (H && midY < H * 0.22) {
          /* 顶部条：整页从按钮下沿开始，顶栏右侧同时让开右上角按钮 */
          if (typeof r.bottom === 'number') { ins.top = Math.max(ins.top, r.bottom + GAP); }
          if (W && typeof r.left === 'number' && (r.left + r.right) / 2 > W / 2) {
            ins.topRight = Math.max(ins.topRight, W - r.left + GAP);
          }
        } else if (H && midY > H * 0.78) {
          /* 底部条 */
          if (typeof r.top === 'number') { ins.bottom = Math.max(ins.bottom, H - r.top + GAP); }
        } else if (W) {
          /* 中段悬浮：按左右归边 */
          if ((r.left + r.right) / 2 > W / 2) {
            if (typeof r.left === 'number') { ins.right = Math.max(ins.right, W - r.left + GAP); }
          } else if (typeof r.right === 'number') {
            ins.left = Math.max(ins.left, r.right + GAP);
          }
        }
      });
      /* 防御：异常/极端数据不吞掉大半个屏 */
      if (H && ins.top > H * 0.25) { ins.top = 0; ins.topRight = 0; }
      if (H && ins.bottom > H * 0.35) { ins.bottom = 0; }
      if (W && ins.left + ins.right > W * 0.5) { ins.left = 0; ins.right = 0; }
      return ins;
    }
    function pull() {
      var mt = global.xhs && global.xhs.miniTool;
      if (!mt || typeof mt.getWindowInfo !== 'function') { return; }
      var pr;
      try { pr = mt.getWindowInfo(); } catch (e) { return; }
      if (!pr || typeof pr.then !== 'function') { return; }
      pr.then(function (info) {
        var ins = measure(info);
        if (ins) { apply(ins); }
      })['catch'](function () { /* 读取失败：保持现值（默认 0），自绘 UI 仍可用 */ });
    }
    /* 初始化顺序：查询参数 > 宿主桥 > 自动测量 */
    var q = fromQuery();
    if (q) { apply(q); }
    else if (window.__TQ_HOST__ && window.__TQ_HOST__.insetTop) {
      apply({ top: window.__TQ_HOST__.insetTop, bottom: 0, left: 0, right: 0, topRight: 0 });
    } else { apply({ top: 0, bottom: 0, left: 0, right: 0, topRight: 0 }); }
    pull();
    /* 宿主手动推送（兼容旧桥） */
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (!d) { return; }
      if (d.type === 'tq-host-inset' && typeof d.top === 'number') {
        apply({ top: Math.round(d.top), bottom: 0, left: 0, right: 0, topRight: 0 });
      } else if (d.type === 'tq-host-safearea' && d.inset) {
        apply(d.inset);
      }
    });
    /* 形态变化后重取（延迟一拍，等容器完成布局） */
    function repull() { setTimeout(pull, 120); }
    window.addEventListener('resize', repull);
    window.addEventListener('orientationchange', repull);
  })();

  var D = global.TQ_DATA;
  var F = global.TQF;
  var S = global.TQStorage;
  var app = document.getElementById('app');
  var save = null;
  var hasSave = false;
  var VNC = {}; /* VN 对话层通道（dockBox/occupy/retract/lock/stop），runSteps 内接线，小节函数经此占台 */
  var SELF_KEY = 'shiguan'; /* 玩家所扮角色的绘像 key（role=shi 史官 / nv 女官） */

  /* ---------- 立绘槽：说话人 → 程序化绘像（portraits.js · 未知 speaker 也有像，杜绝空位） ----------
   * 旁白（speaker 为空）不改立绘：保持上一说话人，避免 narr/card 相邻时的闪烁。 */
  function setPortrait(speaker) {
    if (!global.TP || !speaker) { return; }
    TP.show(TP.keyOf(speaker, SELF_KEY), { fill: true }); /* 同一角色不重绘（TP.show 内部判 key，杜绝闪烁） */
    reAnchorSoon(); /* 角色锚点可能不同（全身/半身）：重算 */
  }
  /* ---------- 立绘 ↔ 对话框 锚定（2026-10-28） ----------
   * 半身像不该被对话框压住：以「对话框上沿」为基准，锚在其上方并留 --fig-dock-gap。
   * 做法：量出舞台底到对话框顶的距离写入 --fig-dock-lift，sp-zone 据此上收，
   * 立绘容器整体变矮 ⇒ contain 的半身像自动缩到放得下的尺寸，绝不越界。
   * 可配：①全局 CSS 变量 ②每角色 FIT[key].anchor/dx/dy ③每幕 D.acts[i].figAnchor。 */
  function syncFigAnchor() {
    var stage = app.querySelector('.main.act-vn');
    if (!stage) { return; }
    var box = stage.querySelector('.dlg-box');
    var sp = stage.querySelector('.sp-zone');
    if (!box || !sp) { return; }
    var sr = stage.getBoundingClientRect();
    var br = box.getBoundingClientRect();
    var lift = Math.max(0, Math.round(sr.bottom - br.top)); /* 舞台底 → 对话框顶 */
    stage.style.setProperty('--fig-dock-lift', lift + 'px');
    /* 锚点：角色/幕可覆盖；缺省 stage-bottom（未判定角色时保持原构图，不贸然上浮） */
    var anchor = 'stage-bottom';
    if (global.TP && global.TP._slot && global.TP._slot._tqKey) {
      var a = global.TP.anchorOf(global.TP._slot._tqKey);
      if (a) { anchor = a; }
    }
    var act = D.acts[CUR_ACT];
    if (act && act.figAnchor) { anchor = act.figAnchor; }
    sp.setAttribute('data-anchor', anchor);
  }
  /* dock 结构变化（换框/尺寸变化）后重锚 */
  function reAnchorSoon() { setTimeout(syncFigAnchor, 0); }
  /* 立绘切换（含外部直调 TP.show）也重锚：角色可能从全身换到半身，停靠方位不同 */
  global.TQ_ON_FIG_CHANGE = function () { reAnchorSoon(); };

  /* 槽尺寸随断点/旋屏变化：重算立绘横向补偿（不改当前角色） */
  (function () {
    var t = 0;
    function later() {
      if (t) { clearTimeout(t); }
      t = setTimeout(function () { if (global.TP && TP.refit) { TP.refit(); } syncFigAnchor(); }, 160);
    }
    window.addEventListener('resize', later);
    window.addEventListener('orientationchange', later);
  })();

  /* ---------- 工具 ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }
  function btn(label, cls, onClick) {
    var b = el('button', 'btn ' + (cls || ''), label);
    b.addEventListener('click', onClick);
    return b;
  }
  /* ---------- 时辰节点（竖版横卡 / 横版顶栏嵌入） ---------- */
  var ACT_NODES = [
    { t: '寅', n: '万寿门' }, { t: '辰', n: '广德殿' }, { t: '午', n: '汴桥' },
    { t: '酉', n: '滋德殿' }, { t: '终', n: '合瓮' }
  ];
  var CUR_ACT = 0;

  function topbar(actName) {
    /* 简版：首屏/选角/手札（复刻设计稿 topbar(name)：幕名 + 手札，无时辰条/差事帖） */
    var bar = el('div', 'topbar');
    bar.appendChild(el('div', 'act-name', actName || '天清往事'));
    var memo = el('button', 'memo-btn', '手札');
    memo.addEventListener('click', function () { showMemo(true); });
    bar.appendChild(memo);
    return bar;
  }
  function topbarAct(actName) {
    /* 幕内完整版（复刻设计稿 topbarPost：幕名 + 时辰内嵌 + 差事帖/手札） */
    var bar = el('div', 'topbar');
    bar.appendChild(el('div', 'act-name', actName || '天清往事'));
    bar.appendChild(F.timebarInline(ACT_NODES, CUR_ACT));
    var btns = el('div', 'tb-btns');
    var cs = el('button', 'cs-btn', '差事帖');
    var doneN = 0, totalN = 5, k;
    if (save && save.role && D.tasks && D.tasks[save.role]) {
      totalN = D.tasks[save.role].list.length;
      for (k in save.taskDone) { if (save.taskDone[k]) { doneN += 1; } }
      if (doneN > totalN) { doneN = totalN; }
    }
    cs.appendChild(el('span', 'cs-dot', doneN + '/' + totalN));
    cs.addEventListener('click', function () { openChaishi(); });
    btns.appendChild(cs);
    var memo = el('button', 'memo-btn', '手札');
    memo.addEventListener('click', function () { showMemoOverlay(); });
    btns.appendChild(memo);
    bar.appendChild(btns);
    return bar;
  }
  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } node.classList.remove('ending-scene'); node.classList.remove('with-foot'); }
  function persist() {
    if (save) {
      save.updated = Date.now();
      S.saveGame(save, function () {});
      if (global.TQCloud) { global.TQCloud.markDirty(save); } /* 云镜像：防抖合并 persist 突发 */
    }
  }
  function countShards() {
    var n = 0, k;
    for (k in save.shards) { if (save.shards[k]) { n += 1; } }
    return n;
  }

  /* ---------- S9 加载页（游戏首屏 · 全构图同心于中轴） ---------- */
  function showLoad() {
    clear(app);
    if (window.TQA) { TQA.probeEnv(function () {}); } /* §10.5 L0 boot 探针：WebP/2048 纹理，一次性 */
    app.appendChild(F.buildLoad(function () { showTitle(); }, showCredits));
  }

  /* ---------- 首屏（按钮组钉底 footbar；横版归位右侧 .tr） ---------- */
  function showTitle() {
    clear(app);
    app.classList.add('with-foot');
    app.appendChild(topbar(D.title.sub));
    /* 时间条（顶栏）下沿的元信息行：史实出处贴左上、参与文档流不浮动——
     * 既不会被标题/立绘挤到，也天然落在安全区内不与平台按钮重叠。 */
    var meta = el('div', 'title-meta');
    var cr = el('button', 'credits-btn', '史实出处');
    cr.setAttribute('aria-label', '查看本作史实出处');
    cr.addEventListener('click', showCredits);
    meta.appendChild(cr);
    app.appendChild(meta);
    var main = el('div', 'main title-bottom');
    var wrap = el('div', 'title-wrap');
    var tl = el('div', 'tl');
    tl.appendChild(el('div', 'title-main', D.title.main));
    tl.appendChild(el('div', 'title-sub', D.title.sub));
    tl.appendChild(el('div', 'title-note', D.title.note));
    wrap.appendChild(tl);
    var tr = el('div', 'tr'); /* 横版：按钮居标题右侧；竖版隐藏走 footbar */
    wrap.appendChild(tr);
    main.appendChild(wrap);
    app.appendChild(main);
    var foot = el('footer', 'footbar fb-title');
    function addActions(host) {
      if (hasSave && save && save.role) {
        host.appendChild(btn('继续值守', '', function () { enterAct(save.actIndex); }));
        host.appendChild(btn('从头再来', 'ghost', function () {
          S.clearSave(function () { save = null; hasSave = false; showRole(); });
        }));
      } else {
        host.appendChild(btn('入宫当值', '', function () { showRole(); }));
      }
    }
    addActions(tr);
    addActions(foot);
    app.appendChild(foot);
  }

  /* ---------- 史实出处（鸣谢页式：瓷片/瓷心出处由数据派生，不另维护清单） ---------- */
  function showCredits() {
    var C = D.credits;
    if (!C) { return; }
    var ov = el('div', 'cr-overlay');
    var panel = el('div', 'cr-panel');
    panel.appendChild(el('div', 'cr-title', C.title));
    panel.appendChild(el('div', 'cr-sub', C.sub));
    panel.appendChild(el('div', 'cr-statement', C.statement));
    function sec(name) { panel.appendChild(el('div', 'cr-sec', name)); }
    function row(name, src) {
      var r = el('div', 'cr-row');
      r.appendChild(el('span', 'cr-name', name));
      r.appendChild(el('span', 'cr-src', src));
      panel.appendChild(r);
    }
    sec('主要史籍');
    C.books.forEach(function (b) { row(b.name, b.use); });
    sec('十六瓷片 · 游戏内史料卡');
    Object.keys(D.shards).forEach(function (k) {
      var s = D.shards[k];
      row(s.name + '（' + s.prov + '）', s.source);
    });
    sec('瓷心五段');
    Object.keys(D.memories).forEach(function (k) {
      var m = D.memories[k];
      row(m.title, m.prov + ' · ' + m.era);
    });
    C.notes.forEach(function (n) { panel.appendChild(el('div', 'cr-note', n)); });
    function close() {
      if (ov.parentNode) { ov.parentNode.removeChild(ov); }
      document.removeEventListener('keydown', escHandler);
    }
    function escHandler(e) {
      var k = e.key || e.keyCode;
      if (k === 'Escape' || k === 'Esc' || k === 27) { close(); }
    }
    panel.appendChild(btn('合上出处', 'cr-close', close));
    ov.appendChild(panel);
    ov.addEventListener('click', function (e) { if (e.target === ov) { close(); } });
    document.addEventListener('keydown', escHandler);
    app.appendChild(ov);
  }

  /* ---------- 选身份（横版两卡并排） ---------- */
  function showRole() {
    clear(app);
    app.appendChild(topbar('天清往事 · 应差'));
    var main = el('div', 'main');
    main.appendChild(el('div', 'narr', '天清节前夜，礼部来人问话：这一日，你以何职当值？'));
    var col = el('div', 'role-2col');
    D.roles.forEach(function (role) {
      var b = btn(role.name, 'ghost role-item', function () { startNew(role.id); });
      b.appendChild(el('span', 'desc', role.desc));
      col.appendChild(b);
    });
    main.appendChild(col);
    app.appendChild(main);
  }

  function startNew(roleId) {
    save = S.newSave(roleId);
    persist();
    enterAct(0);
  }

  /* ---------- 幕流程 ---------- */
  function enterAct(idx) {
    var act = D.acts[idx];
    if (!act || !act.unlocked || !act.steps.length) { showMemo(false, '此后时辰尚未开启。'); return; }
    if (save.actIndex < idx) { save.actIndex = idx; }
    // 断点续玩：同一幕内从存档步数继续；新开一幕从 0 起
    var from = (save.actIndex === idx && save.step > 0 && save.step < act.steps.length) ? save.step : 0;
    buildActShell(act, idx, from);
  }

  /* ---------- 角色分叉展开：split 步骤按 save.role 解析为线性序列 ---------- */
  function expandSteps(steps, role) {
    var out = [];
    (steps || []).forEach(function (st) {
      if (st && st.type === 'split') {
        expandSteps(st[role] || [], role).forEach(function (x) { out.push(x); });
      } else if (st) {
        out.push(st);
      }
    });
    return out;
  }

  function buildActShell(act, idx, fromStep) {
    clear(app);
    CUR_ACT = idx;
    app.appendChild(topbarAct(act.name));
    app.appendChild(F.timebar(ACT_NODES, idx));
    if (act.bg && D.bg[act.bg]) {
      var bg = el('div', 'bg-art wash');
      bg.innerHTML = D.bg[act.bg];
      app.appendChild(bg);
    }
    /* VN 结构：vn-main（横版双栏容器）> 立绘区 + 文档流；操作小节切 act-op 全宽 */
    var main = el('div', 'main act-vn');
    var vnMain = el('div', 'vn-main');
    var sp = el('div', 'sp-zone');
    /* VN 立绘舞台：无边框/无底卡/无独立名牌——立绘即画面主体，名字只在对话框名牌上出现一次 */
    var slot = el('div', 'slot sp-fig');
    SELF_KEY = save.role === 'nv' ? 'nvguan' : 'shiguan';
    if (global.TP) {
      TP.bindSlot(slot);
      TP.show(SELF_KEY, { fill: true });       /* 程序化绘像占位（素材到则原位升级真图） */
    } else {
      slot.innerHTML = F.SIL;
    }
    sp.appendChild(slot);
    vnMain.appendChild(sp);
    var doc = el('div', 'vn-doc');
    vnMain.appendChild(doc);
    main.appendChild(vnMain);
    app.appendChild(main);
    runSteps(act, idx, doc, fromStep || 0, expandSteps(act.steps, save.role));
  }

  function runSteps(act, idx, main, fromStep, steps) {
    var i = fromStep;
    var busy = false;
    steps = steps || act.steps;

    /* ---------- VN 对话 dock（单框 + 四键：自动/跳过/回看/手札 · 2026-10-23 实装） ----------
     * 推进：点框=补完/下一框（二击合一，无「继续」钮）。
     * 自动：显完停 AUTO_DELAY 自动下一框；手动点框即接管熄灭；遇选择/占台停。
     * 跳过：SKIP_STEP 连推，遇介入点（选择/史料卡/动手小节）即停。
     * 占台：交互小节 occupy 舞台并隐 dock，完成经 after/next 之 retract 退场——文档流不再堆积。
     * 回看：backlog 浮层，最新在底，默认定位到上一条；选择态置灰。
     * AUTO_DELAY / SKIP_STEP 为 [PLACEHOLDER]，真机手感再调。 */
    var backlog = [];
    var injected = []; /* 插队步骤（选择回复等），next() 优先消费 */
    var occupied = null;
    var curBox = null;
    var autoOn = false, skipOn = false;
    var autoTimer = 0, skipTimer = 0;
    var keyAuto = null, keySkip = null, keyLog = null, keyMemo = null;
    var AUTO_DELAY = 1600, SKIP_STEP = 160;

    function stopAuto() {
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = 0; }
      autoOn = false;
      if (keyAuto) { keyAuto.classList.remove('on'); }
    }
    function stopSkip() {
      if (skipTimer) { clearInterval(skipTimer); skipTimer = 0; }
      skipOn = false;
      if (keySkip) { keySkip.classList.remove('on'); }
    }
    function keysLocked(lk) {
      [keyAuto, keySkip, keyLog].forEach(function (k) {
        if (k) { k.classList[lk ? 'add' : 'remove']('dis'); }
      });
    }
    function armAuto() {
      if (autoTimer) { clearTimeout(autoTimer); }
      autoTimer = setTimeout(function () {
        autoTimer = 0;
        if (curBox && busy) { boxGo(); }
      }, AUTO_DELAY);
    }
    function boxGo() {
      if (!curBox) { return; }
      if (!curBox._tqIsFull()) { curBox._tqFinish(); if (autoOn) { armAuto(); } return; }
      curBox._tqAdvance();
    }

    function dockClear() {
      var d = main.querySelector('.dlg-dock');
      if (d && d.parentNode) { d.parentNode.removeChild(d); }
    }
    function ensureDock() {
      var dock = main.querySelector('.dlg-dock');
      if (!dock) {
        dock = el('div', 'dlg-dock');
        var strip = el('div', 'log-strip');
        keyAuto = el('span', 'log-key', '自动');
        keySkip = el('span', 'log-key', '跳过');
        keyLog = el('span', 'log-key', '回看');
        keyMemo = el('span', 'log-key', '手札');
        keyAuto.addEventListener('click', function (e) {
          e.stopPropagation();
          if (autoOn) { stopAuto(); return; }
          stopSkip();
          autoOn = true; keyAuto.classList.add('on');
          if (curBox && busy && curBox._tqIsFull()) { armAuto(); }
        });
        keySkip.addEventListener('click', function (e) {
          e.stopPropagation();
          if (skipOn) { stopSkip(); return; }
          stopAuto();
          skipOn = true; keySkip.classList.add('on');
          skipTimer = setInterval(function () {
            if (!skipOn) { return; }
            if (!curBox || !busy) { return; }
            if (!curBox._tqIsFull()) { curBox._tqFinish(); return; }
            boxGo();
          }, SKIP_STEP);
        });
        keyLog.addEventListener('click', function (e) { e.stopPropagation(); openLog(); });
        keyMemo.addEventListener('click', function (e) { e.stopPropagation(); showMemoOverlay(); });
        strip.appendChild(keyAuto); strip.appendChild(keySkip);
        strip.appendChild(keyLog); strip.appendChild(keyMemo);
        dock.appendChild(strip);
        main.appendChild(dock);
      }
      return dock;
    }
    function dockBox(speaker, text, cb) {
      retract(); /* 幂等清场：sub 分支链不经过 next()，对话框回归时统一退占台/解键锁 */
      setPortrait(speaker); /* 说话人驱动立绘（立绘槽 = 角色绘像，非静态占位） */
      var dock = ensureDock();
      var old = dock.querySelector('.dlg-box');
      if (old && old.parentNode) { old.parentNode.removeChild(old); }
      var item = { sp: speaker || '', t: text };
      function onAdv() {
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = 0; }
        backlog.push(item);
        curBox = null;
        busy = false;
        if (cb) { cb(); } else { after(); }
      }
      var card;
      if (speaker) {
        card = F.dlgCard(speaker, text, onAdv, { onFull: function () { if (autoOn) { armAuto(); } } });
      } else {
        card = F.narrCard(text, onAdv);
      }
      curBox = card;
      dock.insertBefore(card, dock.firstChild);
      reAnchorSoon(); /* 对话框高度变了：重算立绘锚点 */
      if (autoOn && card._tqIsFull()) { armAuto(); }
      main.scrollTop = main.scrollHeight;
      return dock;
    }

    /* ---------- 占台与退场（修「整个剧情 scroll」：交互小节独占舞台，完成即清场） ---------- */
    function retract() {
      if (occupied && occupied.parentNode) { occupied.parentNode.removeChild(occupied); }
      occupied = null;
      keysLocked(false);
      var dock = main.querySelector('.dlg-dock');
      if (dock) { dock.style.display = ''; }
      var vnMain = main.parentNode;
      if (vnMain && vnMain.classList) { vnMain.classList.remove('act-op'); }
    }
    function occupyNode(node, keepDock) {
      retract();
      stopAuto(); stopSkip();
      occupied = node;
      main.appendChild(node);
      var dock = main.querySelector('.dlg-dock');
      if (dock && !keepDock) { dock.style.display = 'none'; } /* 选择态 keepDock：dock 可见、三键置灰 */
      var vnMain = main.parentNode;
      if (vnMain && vnMain.classList) { vnMain.classList.add('act-op'); }
      main.scrollTop = main.scrollHeight;
    }
    VNC.dockBox = dockBox;
    VNC.occupy = occupyNode;
    VNC.retract = retract;
    VNC.lock = keysLocked;
    VNC.backlog = function () { return backlog; };
    VNC.stop = function () { stopAuto(); stopSkip(); };
    VNC.stopModes = function () { stopAuto(); stopSkip(); retract(); dockClear(); };

    function next() {
      if (busy) { return; }
      retract(); /* 上一交互小节退场（若占台）；恢复 dock 与立绘区 */
      if (injected.length) { handleStep(injected.shift()); return; }
      if (i >= steps.length) { finishAct(idx, main); return; }
      var st = steps[i];
      i += 1;
      handleStep(st);
    }

    function handleStep(st) {
      busy = true;
      if (st.type === 'narr') {
        dockBox('', st.text, null);
      } else if (st.type === 'card') {
        dockBox(st.speaker || '', st.text, null);
      } else if (st.type === 'iv') {
        var ivCfg = D.iv[st.cfg] || D.iv.tang;
        if (window.TQA && TQA.tifaJie()) { /* §10.5 L2：设置「应节」——本节直接走节奏条，判定奖励同躬行 */
          runJie(main, ivCfg, function () {
            if (st.deco && st.decoName) { awardDeco(st.deco, st.decoName, main); }
            busy = false;
            after();
          });
        } else {
        var ivWrap = F.iv(main, ivCfg, function (hits) {
          if (st.deco && st.decoName) { awardDeco(st.deco, st.decoName, main); }
          busy = false;
          after();
        }, function () {
          retract();
          runJie(main, ivCfg, function () {
            if (st.deco && st.decoName) { awardDeco(st.deco, st.decoName, main); }
            busy = false;
            after();
          });
        });
        occupyNode(ivWrap);
        }
      } else if (st.type === 'shard') {
        showShard(main, st.id, function () { busy = false; after(); });
      } else if (st.type === 'choice') {
        showChoice(main, st, function () { busy = false; after(); }, function (stp) { injected.push(stp); });
      } else if (st.type === 'shangshu') {
        runRhythm(main, D.shangshu, { deco: 'jinzang', decoName: '金觞' }, function () { busy = false; after(); });
      } else if (st.type === 'rhythm') {
        var rcfg = D[st.cfg] || D.shangshu;
        runRhythm(main, rcfg, { deco: st.deco, decoName: st.decoName }, function () { busy = false; after(); });
      } else if (st.type === 'memory') {
        /* 已想起过 → 不再重播（手札里有文字卡）；首次则播。
         * 存储节点：开播前把 step 定在本步——中途退出，重进即从这段回忆开始。 */
        if (save.memories && save.memories[st.id]) { busy = false; after(); return; }
        save.step = i - 1;
        persist();
        if (global.TQCloud) { global.TQCloud.checkpoint(save); }
        runMemory(main, st.id, function () { busy = false; after(); });
      } else if (st.type === 'tasks') {
        renderTasks(main, idx, function () { busy = false; after(); });
      } else if (st.type === 'touhu') {
        runTouhu(main, function () { busy = false; after(); });
      } else if (st.type === 'role') {
        // 角色专属支线：主线共享（碎片数一致），视角与私事因身份而异
        var sub = (st.branches && st.branches[save.role]) || [];
        var j = 0;
        (function nextSub() {
          if (j >= sub.length) { busy = false; after(); return; }
          var s2 = sub[j]; j += 1;
          if (s2.type === 'narr') {
            dockBox('', s2.text || '', nextSub);
          } else if (s2.type === 'card') {
            dockBox(s2.speaker || '', s2.text, nextSub);
          } else if (s2.type === 'iv') {
            var ivCfg2 = D.iv[s2.cfg] || D.iv.tang;
            if (window.TQA && TQA.tifaJie()) { /* §10.5 L2：应节直入 */
              runJie(main, ivCfg2, function () {
                if (s2.deco && s2.decoName) { awardDeco(s2.deco, s2.decoName, main); }
                nextSub();
              });
            } else {
            var ivWrap2 = F.iv(main, ivCfg2, function (hits2) {
              if (s2.deco && s2.decoName) { awardDeco(s2.deco, s2.decoName, main); }
              nextSub();
            }, function () {
              retract();
              runJie(main, ivCfg2, function () {
                if (s2.deco && s2.decoName) { awardDeco(s2.deco, s2.decoName, main); }
                nextSub();
              });
            });
            occupyNode(ivWrap2);
            }
          } else if (s2.type === 'rhythm') {
            runRhythm(main, D[s2.cfg] || D.shangshu, { deco: s2.deco, decoName: s2.decoName }, nextSub);
          } else if (s2.type === 'shard') {
            showShard(main, s2.id, nextSub);
          } else if (s2.type === 'choice') {
            showChoice(main, s2, nextSub, function (stp) { sub.splice(j, 0, stp); });
          } else {
            dockBox('', s2.text || '', nextSub);
          }
        })();
      } else {
        busy = false;
        after();
      }
    }

    function after() {
      save.step = i;
      if (injected.length) { next(); return; }
      if (i < steps.length) { next(); return; }
      finishAct(idx, main);
    }
    next();
  }

  /* ---------- 差事帖（常驻 dock：顶栏入口 + 卷轴浮层；完成=朱笔勾销，依勾检/朱销文簿古制） ---------- */
  var CHN_NUM = ['一', '二', '三', '四', '五', '六'];
  var csClose = null; /* 当前差事帖浮层的关闭柄（顶栏 toggle 复用，保证 onClose 不丢） */
  function openChaishi(onClose) {
    var t = D.tasks && D.tasks[save.role];
    if (!t) { if (onClose) { onClose(); } return; }
    var old = app.querySelector('.cs-ov');
    if (old) {
      if (csClose) { csClose(); } else if (old.parentNode) { old.parentNode.removeChild(old); }
      if (onClose) { onClose(); }
      return;
    }
    var ov = el('div', 'cs-ov');
    var sheet = el('div', 'cs-sheet');
    sheet.appendChild(el('div', 'cs-qian', '礼部差遣 · 天清节备礼'));
    sheet.appendChild(el('div', 'cs-title', '差事帖'));
    sheet.appendChild(el('div', 'cs-sub', '显德五年九月廿三 · 应差录'));
    sheet.appendChild(el('div', 'cs-gold'));
    t.list.forEach(function (item, i) {
      var row = el('div', 'cs-row');
      var act = D.acts[i];
      var doneNow = !!(act && save.taskDone && save.taskDone[act.id]);
      if (doneNow) { row.classList.add('done'); }
      if (i === CUR_ACT) { row.classList.add('current'); }
      row.appendChild(el('div', 'cs-num', doneNow ? '勾' : (CHN_NUM[i] || String(i + 1))));
      /* 竖列题名（验稿页 §21：逐字 span 堆叠，不用 writing-mode） */
      var vt = el('div', 'cs-vt');
      var title = (t.titles && t.titles[i]) || item.split('：')[0];
      title.split('').forEach(function (ch) { vt.appendChild(el('span', '', ch)); });
      row.appendChild(vt);
      var meta = el('div', 'cs-meta');
      var head = item.split('：')[0].replace('｜', ' · ');
      meta.appendChild(el('b', '', head));
      meta.appendChild(el('span', '', item.split('：').slice(1).join('：') || item));
      row.appendChild(meta);
      row.appendChild(el('div', 'cs-st ' + (doneNow ? 'done' : (i === CUR_ACT ? 'cur' : 'todo')),
        doneNow ? '已竣' : (i === CUR_ACT ? '进行中' : '未行')));
      sheet.appendChild(row);
    });
    var curActId = D.acts[CUR_ACT] ? D.acts[CUR_ACT].id : '';
    /* 当前差事金虚线框：验稿页 §21 格式「当前差事（N）：<内容>」；兜底去「时辰｜地点：」前缀 */
    var curTxt = (t.nudges && t.nudges[curActId]) ||
      (t.list[CUR_ACT] || '').replace(/^[^｜]+｜[^：]+：/, '');
    sheet.appendChild(el('div', 'cs-cur',
      '当前差事（' + (CHN_NUM[CUR_ACT] || String(CUR_ACT + 1)) + '）：' + curTxt));
    var tail = el('div', 'cs-tail');
    tail.appendChild(document.createTextNode('显德五年九月廿三 记'));
    tail.appendChild(el('span', 'who', save.role === 'shi' ? '随驾史官' : '宫中女官'));
    var seal = el('div', 'cs-seal');
    seal.appendChild(el('span', '', '差'));
    seal.appendChild(el('span', '', '帖'));
    tail.appendChild(seal);
    sheet.appendChild(tail);
    var fold = el('button', 'cs-fold', '收起差事帖');
    fold.addEventListener('click', close);
    sheet.appendChild(fold);
    sheet.appendChild(el('div', 'cs-fine', '收起不误值守 · 点顶栏「差事帖」随时再取出'));
    ov.appendChild(sheet);
    ov.addEventListener('click', function (e) { if (e.target === ov) { close(); } });
    document.addEventListener('keydown', escHandler);
    app.appendChild(ov);
    csClose = close;
    var closed = false;
    function escHandler(e) {
      var k = e.key || e.keyCode;
      if (k === 'Escape' || k === 'Esc' || k === 27) { close(); }
    }
    function close() {
      if (closed) { return; }
      closed = true;
      csClose = null;
      if (ov.parentNode) { ov.parentNode.removeChild(ov); }
      document.removeEventListener('keydown', escHandler);
      if (onClose) { var f = onClose; onClose = null; f(); }
    }
  }
  /* ---------- 差事帖步骤：引路人递话走对话框，随后开卷轴浮层，收起后继续 ---------- */
  function renderTasks(main, actIdx, done) {
    var t = D.tasks && D.tasks[save.role];
    var act = D.acts[actIdx];
    if (!t || !act) { done(); return; }
    var line = actIdx === 0 ? t.intro : ((t.nudges && t.nudges[act.id]) || '');
    function openSheet() {
      VNC.stop(); /* 浮层期间暂停自动/跳过 */
      openChaishi(function () { done(); });
    }
    if (line) {
      VNC.dockBox(t.guide, line, function () { openSheet(); });
    } else {
      openSheet();
    }
  }

  /* ---------- 碎片（占台：toast + 史料卡独占舞台，「收下瓷片」退场） ---------- */
  function showShard(main, id, done) {
    var sh = D.shards[id];
    if (!sh) { done(); return; }
    var first = !save.shards[id];
    if (first) {
      save.shards[id] = true;
      persist();
    }
    var wrap = el('div', 'shard-occ');
    var stage = el('div', 'shard-stage');
    wrap.appendChild(stage);
    F.shardViewer(stage, id); /* 轨③：可拖动擦洗的转台（P1 后内含暗纹）；失败自动降级到内壁静态帧 */
    var toast = el('div', 'shard-toast');
    toast.appendChild(el('div', 'got', (first ? '拾得瓷片' : '瓷片在手') + ' · 共 ' + countShards() + '/16'));
    toast.appendChild(el('div', 'name', sh.name));
    wrap.appendChild(toast);
    var card = el('div', 'shiliao');
    var head = el('div', 'head', '史料卡');
    head.appendChild(el('span', 'prov', sh.prov));
    card.appendChild(head);
    card.appendChild(el('div', 'quote', sh.text));
    card.appendChild(el('div', 'source', '——' + sh.source));
    wrap.appendChild(card);
    wrap.appendChild(btn('收下瓷片', '', function () { done(); }));
    VNC.occupy(wrap);
  }

  /* ---------- 选择（占台：选项独占舞台；选即锁定；回看/自动/跳过置灰；回复经 injected 走对话框） ---------- */
  function showChoice(main, st, done, pushStep) {
    var box = el('div', 'choice-box');
    box.setAttribute('role', 'radiogroup');
    setPortrait(st.speaker || ''); /* 选择项的视角名（多为玩家自称）也驱动立绘 */
    box.appendChild(el('div', 'speaker', st.speaker || ''));
    box.appendChild(el('div', 'prompt', st.prompt || ''));
    var picked = false;

    st.options.forEach(function (op) {
      var b = el('button', 'btn ghost opt', op.label);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.appendChild(el('span', 'desc', op.text));
      b.addEventListener('click', function () {
        if (picked || box.getAttribute('data-locked')) { return; }
        picked = true;
        box.setAttribute('data-locked', '1');
        b.classList.add('selected');
        b.setAttribute('aria-checked', 'true');
        save.choices[st.key] = op.label;
        persist();
        if (pushStep) { pushStep({ type: 'narr', text: op.reply }); }
        done(); // 选择即锁定推进：回复作为下一对话框演出
      });
      box.appendChild(b);
    });
    VNC.occupy(box, true); /* 选择态：选项占台但 dock 可见——三键置灰给玩家看 */
    VNC.lock(true);
  }

  /* ---------- 通用节奏小节（执觞/汤饼/承露囊/投壶掷矢） ----------
   * cfg: { title, beats[], hint, retry, done, beatNames? }
   * opts: { deco?, decoName?, advanceOnMiss? } —— advanceOnMiss=true 时落空也推进并计数（投壶用）
   * cb(hits)：完成回调，hits=成功拍数
   */
  function runRhythm(main, cfg, opts, cb) {
    var panel = el('div', 'panel');
    panel.appendChild(el('div', 'memo-head', cfg.title || '习礼'));
    panel.appendChild(el('div', 'memo-sub', cfg.hint));
    var beats = cfg.beatNames || cfg.beats;
    var label = el('div', 'beat-label', beats[0]);
    panel.appendChild(label);
    var track = el('div', 'meter');
    var zone = el('div', 'meter-zone');
    var cursor = el('div', 'meter-cursor');
    track.appendChild(zone);
    track.appendChild(cursor);
    panel.appendChild(track);
    var tip = el('div', 'memo-sub', '');
    panel.appendChild(tip);
    VNC.occupy(panel); /* 占台：节奏面板独占舞台，dock 暂隐 */

    var advanceOnMiss = !!(opts && opts.advanceOnMiss);
    var beat = 0, hits = 0, pos = 0, dir = 1, zoneL = 30, zoneR = 55, raf = 0, over = false;
    function placeZone() {
      zoneL = 20 + Math.random() * 56;
      zoneR = zoneL + 24; // 命中区 24% 宽，宽容判定
      zone.style.left = zoneL + '%';
      zone.style.width = (zoneR - zoneL) + '%';
    }
    function loop() {
      if (over || !panel.isConnected) { over = true; return; } // 离场即停表
      pos += dir * 0.55; // 慢速：整程约 3 秒，命中窗口约 0.9 秒
      if (pos > 100) { pos = 100; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      cursor.style.left = pos + '%';
      raf = requestAnimationFrame(loop);
    }
    function tap() {
      if (over) { return; }
      var hit = pos >= zoneL && pos <= zoneR;
      if (hit) { hits += 1; }
      if (!hit && !advanceOnMiss) {
        tip.textContent = cfg.retry;
        return;
      }
      beat += 1;
      if (beat >= beats.length) {
        over = true;
        cancelAnimationFrame(raf);
        label.textContent = cfg.done || '毕。';
        tip.textContent = '';
        if (opts && opts.deco) { awardDeco(opts.deco, opts.decoName, main); }
        setTimeout(function () { cb(hits); }, 600); /* [PLACEHOLDER] 完成停留，随后占台退场 */
        return;
      }
      label.textContent = beats[beat];
      placeZone();
      tip.textContent = hit ? '好。下一拍。' : '落了。拾起来，再来。';
    }
    panel.addEventListener('click', tap);
    placeZone();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- 应节轨（回退兜底 · 更漏/礼乐节拍器皮，10-20 增订） ----------
   * 与 runRhythm 同引擎同判定，仅换皮：十二刻线（应时辰十二刻）+ 漏箭游标 + 受箭区；
   * 由 direct2d 的「应节而动」入口切入，或设置项手动选择。 */
  function runJie(main, cfg, cb) {
    var panel = el('div', 'panel mode-jie');
    panel.appendChild(el('div', 'memo-head', cfg.title || '习礼'));
    panel.appendChild(el('div', 'memo-sub', cfg.hint || '漏箭入受箭区时下手——礼乐有节，错亦不罚。'));
    var beats = cfg.beats || cfg.beatNames || ['一', '二', '三'];
    var label = el('div', 'beat-label', beats[0]);
    label.appendChild(el('span', 'jie-chip', '以节赞礼'));
    panel.appendChild(label);
    var track = el('div', 'meter');
    var ticks = el('div', 'meter-ticks');
    for (var t = 1; t < 11; t++) {
      var ti = el('i');
      ti.style.left = (t * 100 / 12) + '%';
      ticks.appendChild(ti);
    }
    var zone = el('div', 'meter-zone');
    var cursor = el('div', 'meter-cursor');
    track.appendChild(ticks); track.appendChild(zone); track.appendChild(cursor);
    panel.appendChild(track);
    var tip = el('div', 'hit-tip', '');
    panel.appendChild(tip);
    var row = el('div', 'jie-row');
    var op1 = el('span', 'op', '躬行');
    var op2 = el('span', 'op on', '应节');
    row.appendChild(op1); row.appendChild(op2);
    panel.appendChild(row);
    panel.appendChild(el('div', 'jie-note', '此节择简——应节而动。判定与奖励同躬行轨，失败零惩罚。'));
    VNC.occupy(panel); /* 占台 */

    var beat = 0, hits = 0, pos = 0, dir = 1, zoneL = 30, zoneR = 55, raf = 0, over = false;
    function placeZone() {
      zoneL = 20 + Math.random() * 56;
      zoneR = zoneL + 24;
      zone.style.left = zoneL + '%';
      zone.style.width = (zoneR - zoneL) + '%';
    }
    function loop() {
      if (over || !panel.isConnected) { over = true; return; }
      pos += dir * 0.55;
      if (pos > 100) { pos = 100; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      cursor.style.left = pos + '%';
      raf = requestAnimationFrame(loop);
    }
    function tap() {
      if (over) { return; }
      var hit = pos >= zoneL && pos <= zoneR;
      if (hit) { hits += 1; }
      if (!hit) { tip.textContent = '落了。拾起来，再来。'; return; }
      beat += 1;
      if (beat >= beats.length) {
        over = true;
        cancelAnimationFrame(raf);
        label.textContent = cfg.done || '毕。';
        tip.textContent = '';
        setTimeout(function () { cb(hits); }, 600); /* [PLACEHOLDER] 完成停留 */
        return;
      }
      label.textContent = beats[beat];
      var chip = el('span', 'jie-chip', '以节赞礼');
      label.appendChild(chip);
      placeZone();
      tip.textContent = '好。下一拍。';
    }
    panel.addEventListener('click', tap);
    placeZone();
    raf = requestAnimationFrame(loop);
  }

  /* ---------- 瓷心回忆（叙事/对话轨 · 独立沉浸舞台 · 2026-10-28） ----------
   * 与主线 VN dock 分开：回忆有自己的暗场舞台（题签 + 立绘槽 + 单句对话 + 进度），
   * 不复用 dockBox——用户要求「不与其它剧情共用同一对话界面」。
   * 「一页文字」形式只保留在手札（lines → appendMemoCards）。
   * 存档：进入前由 runSteps 把 step 定在本步（中途退出重进即重播）；读完才置 memories[id]。 */
  function runMemory(main, id, done) {
    var m = D.memories[id];
    if (!m || !m.steps || !m.steps.length) { done(); return; }
    var steps = m.steps;
    if (VNC.stop) { VNC.stop(); } /* 回忆自带节奏：主线自动/跳过不介入 */
    var k = 0;
    var ov = el('div', 'mem-stage');
    var head = el('div', 'mem-stage-h');
    var tl = el('div', 'mem-stage-t', m.title);
    tl.appendChild(el('span', 'prov', m.prov));
    head.appendChild(tl);
    head.appendChild(el('div', 'mem-stage-e', m.era));
    var prog = el('div', 'mem-stage-prog', '');
    head.appendChild(prog);
    ov.appendChild(head);
    var body = el('div', 'mem-stage-body');
    var slot = el('div', 'mem-fig');
    var plate = el('div', 'mem-plate');
    var line = el('div', 'mem-line');
    body.appendChild(slot);
    body.appendChild(plate);
    body.appendChild(line);
    ov.appendChild(body);
    var hint = el('div', 'mem-stage-hint', '轻点继续');
    ov.appendChild(hint);

    function paint() {
      var st = steps[k];
      var nm = st.s || '';
      prog.textContent = (k + 1) + ' / ' + steps.length;
      plate.textContent = nm;
      plate.style.display = nm ? '' : 'none';
      line.textContent = st.t;
      if (nm && global.TP) {
        var key = global.TP.keyOf(nm, save && save.role === 'shi' ? 'shiguan' : 'nvguan');
        slot.innerHTML = global.TP.figure(key);
        slot.style.display = '';
        slot.className = 'mem-fig mem-fig-' + (key === 'DEFAULT' ? 'any' : key);
      } else {
        slot.innerHTML = '';
        slot.style.display = 'none';
      }
      line.classList.remove('mem-in');
      void line.offsetWidth; /* 强制重排：重放淡入 */
      line.classList.add('mem-in');
      hint.textContent = (k === steps.length - 1) ? '轻点 · 回神' : '轻点继续';
    }
    function advance() {
      if (k < steps.length - 1) { k += 1; paint(); return; }
      finish();
    }
    var finished = false;
    function finish() {
      if (finished) { return; }
      finished = true;
      if (ov.parentNode) { ov.parentNode.removeChild(ov); }
      document.removeEventListener('keydown', keyH);
      save.memories[id] = true;
      persist(); /* 存储节点：回忆读完即写档 */
      if (global.TQCloud) { global.TQCloud.checkpoint(save); }
      done();
    }
    function keyH(e) {
      var c = e.key || e.keyCode;
      if (c === ' ' || c === 'Enter' || c === 32 || c === 13) { advance(); }
    }
    ov.addEventListener('click', advance);
    document.addEventListener('keydown', keyH);
    paint();
    app.appendChild(ov);
  }

  /* ---------- 手札 · 瓷片关联回忆剧情卡（一页文字只在此处；暂不设回放入口） ----------
   * 幕归属由 acts 反查（瓷片 → 幕），回忆按 memory.act 挂靠。 */
  var SHARD_ACT = null;
  function shardActMap() {
    if (SHARD_ACT) { return SHARD_ACT; }
    SHARD_ACT = {};
    function walk(steps, actId) {
      (steps || []).forEach(function (st) {
        if (!st) { return; }
        if (st.type === 'shard' && st.id) { SHARD_ACT[st.id] = actId; }
        if (st.type === 'role' && st.branches) {
          Object.keys(st.branches).forEach(function (r) { walk(st.branches[r], actId); });
        }
        if (st.type === 'split') {
          Object.keys(st).forEach(function (kk) {
            if (kk !== 'type' && Object.prototype.toString.call(st[kk]) === '[object Array]') { walk(st[kk], actId); }
          });
        }
      });
    }
    D.acts.forEach(function (a) { walk(a.steps, a.id); });
    return SHARD_ACT;
  }
  function appendMemoCards(host, sid) {
    var actId = shardActMap()[sid];
    if (!actId) { return; }
    var keys = Object.keys(D.memories).filter(function (k) { return D.memories[k].act === actId; });
    if (!keys.length) { return; }
    keys.forEach(function (k) {
      var m = D.memories[k];
      var got = !!(save && save.memories && save.memories[k]);
      if (!got) {
        /* 未想起：只透出「此幕另有回忆」，不剧透 */
        host.appendChild(el('div', 'mem-teaser', '此幕另有一段回忆，尚未想起。'));
        return;
      }
      var card = el('div', 'mem-card');
      var h = el('div', 'mem-card-h', m.title);
      h.appendChild(el('span', 'prov', m.prov));
      card.appendChild(h);
      card.appendChild(el('div', 'mem-card-era', m.era));
      m.lines.forEach(function (t) { card.appendChild(el('div', 'mem-card-line', t)); });
      card.appendChild(el('div', 'mem-card-foot', '以上为手札记下的回忆。'));
      host.appendChild(card);
    });
  }

  /* ---------- 玉津园 · 投壶（终幕）：对白走对话框链，投壶占台，结果回对话框 ---------- */
  function runTouhu(main, done) {
    var cfg = D.touhu;
    var q = [];
    // 群臣轮番（各自两矢，命中数运行时随机，一卡带过）
    cfg.ministers.forEach(function (mst) {
      var mh = (Math.random() < 0.75 ? 1 : 0) + (Math.random() < 0.55 ? 1 : 0); // 加权 0–2 矢
      q.push({ sp: mst.speaker, t: mst.line + cfg.minResult[mh] });
    });
    q.push({ sp: '司正', t: '礼官请矢——两矢，中者为胜。' });
    (function playQ() {
      if (q.length) {
        var it = q.shift();
        VNC.dockBox(it.sp, it.t, playQ);
        return;
      }
      // 玩家两矢（回退版 · 拉弓式拖拽投壶）：落空也推进，计命中数；占台演出
      var ivWrap = F.iv(main, D.iv.touhu, function (hits) {
        playRong(hits);
      }, null);
      VNC.occupy(ivWrap);
    })();
    function playRong(hits) {
      // 压轴：官家对投（两矢各五成命中，运行时随机——与玩家 hits 比较）
      var q2 = [{ sp: '官家', t: cfg.rongIntro }];
      var rongHits = 0;
      for (var r = 0; r < 2; r++) {
        var rh = Math.random() < 0.5;
        if (rh) { rongHits += 1; }
        q2.push({ sp: '', t: cfg.rongThrow[rh ? 'hit' : 'miss'][r] });
      }
      var verdict = hits > rongHits ? cfg.verdictWin : (hits === rongHits ? cfg.verdictDraw : cfg.verdictLose);
      q2.push({ sp: '园中', t: verdict });
      (function play2() {
        if (q2.length) {
          var it2 = q2.shift();
          VNC.dockBox(it2.sp, it2.t, play2);
          return;
        }
        awardDeco('jinzhi', '金矢', main); // 胜负零惩罚，参与即纪念
        done();
      })();
    }
  }

  /* ---------- 关注作者（官方 §3.15：9.51+，无需白名单；API 缺失整组不渲染） ----------
   * getFollowStatus 渲染初态（-1 查询失败按未关注渲染，可重试）；
   * followAuthor 点击发起；errCode 20002 取消静默 / 15404 频控 toast / 10003 忽略。 */
  var followPending = false;
  function followSupported() {
    var mt = global.xhs && global.xhs.miniTool;
    return !!(mt && typeof mt.followAuthor === 'function' && typeof mt.getFollowStatus === 'function');
  }
  function transientToast(text) {
    var t = el('div', 'shard-toast tq-toast tq-text');
    t.appendChild(el('div', 'name', text));
    app.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) { t.parentNode.removeChild(t); }
    }, 1900); /* [PLACEHOLDER] 与 CSS 动画时长一致 */
  }
  function buildFollowButton() {
    if (!followSupported()) { return null; }
    var b = el('button', 'btn ghost follow-btn', '关注作者 · 更新早知道');
    var status = 0;
    function render() {
      if (followPending) { b.disabled = true; b.textContent = '处理中…'; return; }
      if (status === 1 || status === 2) {
        b.disabled = true;
        b.classList.add('follow-done');
        b.textContent = status === 2 ? '作者本人' : '已关注 · 天清节见';
      } else {
        b.disabled = false;
        b.classList.remove('follow-done');
        b.textContent = '关注作者 · 更新早知道';
      }
    }
    (function refresh() {
      var mt = global.xhs && global.xhs.miniTool;
      if (!mt || typeof mt.getFollowStatus !== 'function') { return; }
      mt.getFollowStatus().then(function (res) {
        var s = res && typeof res.follow_status === 'number' ? res.follow_status : -1;
        if (s >= 0) { status = s; } /* -1 查询失败保持常态，后续可重试 */
        render();
      }).catch(function () { /* 查询失败不缓存，保持常态 */ });
    })();
    b.addEventListener('click', function () {
      if (followPending || b.disabled) { return; }
      var mt = global.xhs && global.xhs.miniTool;
      if (!mt || typeof mt.followAuthor !== 'function') { return; }
      followPending = true;
      render();
      mt.followAuthor().then(function (res) {
        var s = res && typeof res.follow_status === 'number' ? res.follow_status : -1;
        if (s >= 0) { status = s; }
      }).catch(function (err) {
        var code = err && err.errCode;
        if (code === 15404) { transientToast('今日关注引导已达上限'); }
        /* 20002 用户取消 / 10003 流程进行中：静默 */
      }).then(function () {
        followPending = false;
        render();
      });
    });
    return b;
  }

  /* ---------- 终幕结算（合瓮长卷 · 简版） ---------- */
  function showEnding() {
    /* 自建全屏视图（修：原塞在幕壳 vn-doc 内，立绘槽遮挡标题） */
    if (VNC.stopModes) { VNC.stopModes(); }
    clear(app);
    app.classList.add('ending-scene', 'with-foot');
    var main = el('div', 'main ending-main');
    var E = D.ending;
    var wrap = el('div', 'ending');
    var inner = el('div', 'ending-wrap');
    inner.appendChild(el('div', 'ending-title', E.title));
    var svgBox = el('div', 'ending-vessel');
    svgBox.innerHTML = '<svg viewBox="0 0 220 320">'
      + '<defs><radialGradient id="eGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E9C98F" stop-opacity=".4"/><stop offset="1" stop-color="#E9C98F" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="eGlz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CAAA6"/><stop offset=".3" stop-color="#AFC7C1"/><stop offset=".6" stop-color="#9DB9B3"/><stop offset="1" stop-color="#77948F"/></linearGradient></defs>'
      + '<circle cx="110" cy="160" r="120" fill="url(#eGlow)"/>'
      + '<path d="M92 42 L91 108 Q90 116 78 120 L54 126 Q26 138 24 190 L24 222 Q24 272 46 300 Q58 314 74 318 L86 321 L134 321 L146 318 Q162 314 174 300 Q196 272 196 222 L196 190 Q194 138 166 126 L142 120 Q130 116 129 108 L128 42 Z" fill="url(#eGlz)"/>'
      + '<rect x="88" y="30" width="44" height="12" rx="3" fill="#B98F4E"/>'
      + '<ellipse cx="110" cy="35" rx="17" ry="4" fill="#2E4240"/>'
      + '<rect x="82" y="321" width="56" height="12" fill="#8A6B4A"/>'
      + '<ellipse cx="96" cy="200" rx="9" ry="46" fill="#F4F8F4" opacity=".35" transform="rotate(-8 96 200)"/>'
      + '</svg>';
    wrap.appendChild(svgBox);
    E.lines.forEach(function (t) { inner.appendChild(el('div', 'memory-line', t)); });
    if (E.roleLine && save.role && E.roleLine[save.role]) {
      inner.appendChild(el('div', 'memory-line', E.roleLine[save.role]));
    }
    var nMem = 0, k;
    for (k in save.memories) { if (save.memories[k]) { nMem += 1; } }
    var nDeco = 0;
    for (k in save.deco) { if (save.deco[k]) { nDeco += 1; } }
    var ans = save.choices && save.choices.yin_chongyi ? save.choices.yin_chongyi : '—';
    inner.appendChild(el('div', 'memo-sub',
      '瓷片 ' + countShards() + '/16 · 回忆 ' + nMem + '/5 · 装饰 ' + nDeco + '/4 · 那日的答辞：「' + ans + '」'));
    inner.appendChild(el('div', 'memo-sub', E.quote));
    wrap.appendChild(inner);
    main.appendChild(wrap);
    app.appendChild(main);
    var foot = el('footer', 'footbar fb-ending');
    /* 关注作者：底栏首位——结算内容在滚动区内，底栏是常驻可见区，CTA 放这里不依赖滚动 */
    var fbtn = buildFollowButton();
    if (fbtn) { foot.appendChild(fbtn); }
    foot.appendChild(btn('翻阅手札', '', function () { showMemo(false); }));
    foot.appendChild(btn('从头再来', 'ghost', function () {
      S.clearSave(function () { save = null; hasSave = false; showTitle(); });
    }));
    app.appendChild(foot);
  }

  function awardDeco(id, name, main) {
    if (!save.deco[id]) {
      save.deco[id] = true;
      persist();
      /* 顶部瞬态 toast：不进文档流（修「装饰件框常驻到幕末且压键条」），1.9s 自散 */
      var t = el('div', 'shard-toast tq-toast');
      t.appendChild(el('div', 'got', '长卷装饰件入手'));
      t.appendChild(el('div', 'name', name));
      app.appendChild(t);
      setTimeout(function () {
        if (t.parentNode) { t.parentNode.removeChild(t); }
      }, 1900); /* [PLACEHOLDER] 与 CSS 动画时长一致，真机手感再调 */
    }
  }

  /* ---------- 幕毕 ---------- */
  function finishAct(idx, main) {
    if (VNC.stopModes) { VNC.stopModes(); } /* 清占台/dock/自动跳过，干净进结算 */
    var act = D.acts[idx];
    if (act.shardAfter && D.shards[act.shardAfter] && !save.shards[act.shardAfter]) {
      showShard(main, act.shardAfter, function () {});
    }
    save.actIndex = Math.min(idx + 1, D.acts.length - 1);
    save.step = 0;
    // 差事帖勾销：时辰礼毕=该单差事办完，朱笔勾之（依勾检/朱销文簿古制）
    if (!save.taskDone) { save.taskDone = {}; }
    save.taskDone[act.id] = true;
    persist();
    if (global.TQCloud) { global.TQCloud.checkpoint(save); } /* 云镜像检查点：幕毕立即推 */
    if (idx === D.acts.length - 1) { showEnding(); return; } // 终幕 → 合瓮结算
    var note = el('div', 'memo-sub', act.name + '礼毕，手札已记下进度。');
    main.appendChild(note);
    app.classList.add('with-foot');
    var foot = el('footer', 'footbar fb-act');
    foot.appendChild(btn('翻阅手札', '', function () { showMemo(false); }));
    foot.appendChild(btn('继续值守', 'ghost', function () { enterAct(save.actIndex); }));
    app.appendChild(foot);
    main.scrollTop = main.scrollHeight;
  }

  /* ---------- 手札（存档中心 + 瓷片图鉴；按钮组钉底） ---------- */
  function showMemo(fromTopbar, notice) {
    clear(app);
    app.classList.add('with-foot');
    app.appendChild(topbar(D.memoCopy.title));
    var main = el('div', 'main');
    var count = save ? countShards() : 0;
    var cur = save ? D.acts[save.actIndex] : null;
    // 继续值守仅在当前幕真正可玩（已解锁且有内容）时提供，避免死端
    var canContinue = !!(cur && cur.unlocked && cur.steps.length > 0);
    /* 双路渲染（§10.5 L0 素材闸）：s8_scroll 就位 → 长卷版；未就位 → 现行网格版（零变化） */
    var route = function (st) {
      if (st === 'ok') { renderMemoScroll(main, TQA.image('s8_scroll'), { skipFooter: true }); }
      else { renderMemoGridMain(main, notice, count, cur, canContinue); }
    };
    if (window.TQA) { TQA.resolve('s8_scroll', route); }
    else { renderMemoGridMain(main, notice, count, cur, canContinue); }
    app.appendChild(main);

    var foot = el('footer', 'footbar fb-memo');
    if (save && save.role) {
      if (canContinue) {
        foot.appendChild(btn('继续值守', '', function () { enterAct(save.actIndex); }));
      } else {
        main.appendChild(el('div', 'memo-sub', '下一时辰尚未开启——今日当值至此，先歇歇。已有的瓷片随时可翻看。'));
      }
      foot.appendChild(btn(D.memoCopy.saveNow, 'ghost', function () {
        persist();
        if (global.TQCloud) { global.TQCloud.checkpoint(save); } /* 云镜像检查点：手动存档 */
        showMemo(false, D.memoCopy.saved);
      }));
      foot.appendChild(btn(D.memoCopy.restart, 'ghost', function () {
        S.clearSave(function () { save = null; hasSave = false; showTitle(); });
      }));
    } else {
      foot.appendChild(btn('入宫当值', '', function () { showRole(); }));
    }
    app.appendChild(foot);
    main.appendChild(el('div', 'memo-sub',
      '存档说明：进度自动记录于本机（每逢时辰礼毕与关键处）；手札「现在就记」可随时手动补记。'));
  }

  /* 现行网格版（手札主屏保底路径 = 今日版面，s8_scroll 未就位时渲染；视觉零变化） */
  function renderMemoGridMain(main, notice, count, cur, canContinue) {
    main.appendChild(el('div', 'memo-head', D.memoCopy.title));
    main.appendChild(el('div', 'memo-sub', notice || D.memoCopy.sub));
    var grid = el('div', 'memo-grid');
    var detail = el('div', 'shiliao shard-detail');
    function showDetail(key) {
      var sh = D.shards[key];
      if (!sh) { return; }
      while (detail.firstChild) { detail.removeChild(detail.firstChild); }
      var head = el('div', 'head', '瓷片 · ' + sh.name);
      head.appendChild(el('span', 'prov', sh.prov));
      detail.appendChild(head);
      /* 近看全方位旋转（lat-long；LL 缺失自动回退 12 帧转台，再降级内壁静态帧）
       * 增补（2026-10-28）：「内壁细看」按钮 = 切到 512px 静态内壁帧（整张画 + 双指缩放），
       * 再点回旋转。之所以要这个入口：12 档 yaw 的精灵在手机上只能看清构图，
       * 看不清笔触；静态帧才是「看细节」的那一层。 */
      var rot = el('div', 'shard-detail-rot');
      detail.appendChild(rot);
      if (window.F) { F.spin3d(rot, key); }
      var rotTag = el('div', 'shard-detail-rot-tag', '拖动旋转 · 双指放大 · 转到背面看内壁');
      detail.appendChild(rotTag);
      var innerBtn = el('button', 'shard-inner-btn', '内壁细看');
      var onInner = false;
      innerBtn.addEventListener('click', function () {
        if (!window.F) { return; }
        onInner = !onInner;
        if (onInner) {
          F.shardInner(rot, key);
          innerBtn.textContent = '回到旋转';
          rotTag.textContent = '静态内壁 · 双指缩放 / 拖动平移';
        } else {
          F.spin3d(rot, key);
          innerBtn.textContent = '内壁细看';
          rotTag.textContent = '拖动旋转 · 双指放大 · 转到背面看内壁';
        }
      });
      detail.appendChild(innerBtn);
      detail.appendChild(el('div', 'quote', sh.text));
      detail.appendChild(el('div', 'source', '——' + sh.source));
      appendMemoCards(detail, key); /* 回忆剧情卡（一页文字只在此处，暂无回放入口） */
      detail.setAttribute('data-on', '1');
      main.scrollTop = main.scrollHeight;
    }
    for (var id = 1; id <= 16; id++) {
      var key = String(id);
      var got = save && save.shards && save.shards[key];
      var cell = el('div', 'memo-cell' + (got ? ' got' : ''));
      if (got) {
        cell.innerHTML = F.FRACTURE; /* 已拾得：瓷片剪影（复刻验稿页 §6） */
      } else {
        cell.textContent = String(id);
      }
      if (got && D.shards[key]) {
        cell.setAttribute('role', 'button');
        (function (k) {
          cell.addEventListener('click', function () { showDetail(k); });
        })(key);
      }
      grid.appendChild(cell);
    }
    detail.appendChild(el('div', 'head', '瓷片图鉴'));
    detail.appendChild(el('div', 'quote', '点上方已拾得的瓷片，可随时重读记下的内容。'));
    var col = el('div', 'memo-2col');
    var mg = el('div', 'mg');
    mg.appendChild(grid);
    var md = el('div', 'md');
    md.appendChild(detail);
    md.appendChild(el('div', 'memo-sub', '瓷片 ' + count + '/16 · ' +
      (cur ? '当前：' + cur.name + (canContinue ? '' : '（尚未开启）') : '尚未入宫')));
    col.appendChild(mg);
    col.appendChild(md);
    main.appendChild(col);
    var fbtn = buildFollowButton(); /* 手札整页次入口 */
    if (fbtn) {
      fbtn.style.margin = '10px auto 0';
      main.appendChild(fbtn);
    }
    if (global.TQCloud) {
      main.appendChild(el('div', 'memo-sub', '云存档：' + global.TQCloud.statusText()));
    }
  }

  /* ---------- 回看浮层（backlog：最新在底，默认定位到上一条） ---------- */
  function openLog() {
    if (VNC.stop) { VNC.stop(); }
    var old = app.querySelector('.log-ov');
    if (old) { old.parentNode.removeChild(old); return; }
    var ov = el('div', 'log-ov');
    var panel = el('div', 'log-panel');
    var ph = el('div', 'log-ph');
    ph.appendChild(el('div', 'log-pt', '回看 · 今日对白'));
    var pc = el('button', 'log-pc', '合上');
    pc.addEventListener('click', close);
    ph.appendChild(pc);
    panel.appendChild(ph);
    var list = el('div', 'log-list');
    if (!backlogRef().length) {
      list.appendChild(el('div', 'log-item', '本场还没有对白。'));
    }
    backlogRef().forEach(function (it, ix) {
      var d = el('div', 'log-item' + (ix === backlogRef().length - 1 ? ' last' : ''));
      d.appendChild(el('b', '', it.sp || '旁白'));
      d.appendChild(document.createTextNode(it.t));
      list.appendChild(d);
    });
    panel.appendChild(list);
    ov.appendChild(panel);
    ov.addEventListener('click', function (e) { if (e.target === ov) { close(); } });
    document.addEventListener('keydown', escH);
    app.appendChild(ov);
    list.scrollTop = list.scrollHeight; /* 默认定位到上一条 */
    function escH(e) { var k = e.key || e.keyCode; if (k === 'Escape' || k === 'Esc' || k === 27) { close(); } }
    function close() { if (ov.parentNode) { ov.parentNode.removeChild(ov); } document.removeEventListener('keydown', escH); }
  }
  function backlogRef() { return (VNC.backlog && VNC.backlog()) || []; }

  /* ---------- 手札浮层（VN 状态不破坏：图鉴 + 进度 + 补记，合上回到原对话框） ----------
   * 双路渲染（§10.5 L0 素材闸）：TQA.resolve('s8_scroll') ok = 长卷版；none/fail = 现行网格版。
   * 当前 s8_scroll 生图未就位 → 一律走网格版（=今日版面，零变化）。 */
  var VP = 'M110 40 L109 150 Q107 158 99 162 L73 168 Q41 180 39 235 L39 268 Q39 320 57 352 Q67 368 87 374 L99 377 L161 377 L173 374 Q193 368 203 352 Q221 320 221 268 L221 235 Q219 180 187 168 L161 162 Q153 158 151 150 L150 40 Z';
  function showMemoOverlay() {
    if (VNC.stop) { VNC.stop(); }
    var old = app.querySelector('.memo-ov');
    if (old) { old.parentNode.removeChild(old); return; }
    var ov = el('div', 'log-ov memo-ov');
    var panel = el('div', 'log-panel');
    var ph = el('div', 'log-ph');
    ph.appendChild(el('div', 'log-pt', D.memoCopy.title));
    var pc = el('button', 'log-pc', '合上手札');
    pc.addEventListener('click', close);
    ph.appendChild(pc);
    panel.appendChild(ph);
    var body = el('div', 'log-list memo-body');
    var route = function (st) {
      if (st === 'ok') { renderMemoScroll(body, TQA.image('s8_scroll')); }
      else { renderMemoGrid(body); }
    };
    if (window.TQA) { TQA.resolve('s8_scroll', route); } else { renderMemoGrid(body); }
    panel.appendChild(body);
    ov.appendChild(panel);
    ov.addEventListener('click', function (e) { if (e.target === ov) { close(); } });
    document.addEventListener('keydown', escH);
    app.appendChild(ov);
    function escH(e) { var k = e.key || e.keyCode; if (k === 'Escape' || k === 'Esc' || k === 27) { close(); } }
    function close() { if (ov.parentNode) { ov.parentNode.removeChild(ov); } document.removeEventListener('keydown', escH); }
  }

  /* 现行网格版（手札保底路径 = 今日版面，s8_scroll 未就位时渲染；勿改其视觉） */
  function renderMemoGrid(body) {
    var list = body;
    var grid = el('div', 'memo-grid');
    var detail = el('div', 'shiliao shard-detail');
    function showDetail(key) {
      var sh = D.shards[key];
      if (!sh) { return; }
      while (detail.firstChild) { detail.removeChild(detail.firstChild); }
      var head = el('div', 'head', '瓷片 · ' + sh.name);
      head.appendChild(el('span', 'prov', sh.prov));
      detail.appendChild(head);
      var rot = el('div', 'shard-detail-rot');
      detail.appendChild(rot);
      if (window.F) { F.spin3d(rot, key); }
      var rotTagO = el('div', 'shard-detail-rot-tag', '拖动旋转 · 双指放大 · 转到背面看内壁');
      detail.appendChild(rotTagO);
      var innerBtnO = el('button', 'shard-inner-btn', '内壁细看');
      var onInnerO = false;
      innerBtnO.addEventListener('click', function () {
        if (!window.F) { return; }
        onInnerO = !onInnerO;
        if (onInnerO) {
          F.shardInner(rot, key);
          innerBtnO.textContent = '回到旋转';
          rotTagO.textContent = '静态内壁 · 双指缩放 / 拖动平移';
        } else {
          F.spin3d(rot, key);
          innerBtnO.textContent = '内壁细看';
          rotTagO.textContent = '拖动旋转 · 双指放大 · 转到背面看内壁';
        }
      });
      detail.appendChild(innerBtnO);
      detail.appendChild(el('div', 'quote', sh.text));
      detail.appendChild(el('div', 'source', '——' + sh.source));
      appendMemoCards(detail, key); /* 回忆剧情卡 */
      detail.setAttribute('data-on', '1');
      list.scrollTop = list.scrollHeight;
    }
    for (var id = 1; id <= 16; id++) {
      var key = String(id);
      var got = save && save.shards && save.shards[key];
      var cell = el('div', 'memo-cell' + (got ? ' got' : ''));
      if (got) { F.shardStill(cell, key); } else { cell.textContent = String(id); }
      if (got && D.shards[key]) {
        cell.setAttribute('role', 'button');
        (function (k) {
          cell.addEventListener('click', function () { showDetail(k); });
        })(key);
      }
      grid.appendChild(cell);
    }
    list.appendChild(grid);
    detail.appendChild(el('div', 'head', '瓷片图鉴'));
    detail.appendChild(el('div', 'quote', '点上方已拾得的瓷片，可随时重读记下的内容。'));
    list.appendChild(detail);
    var count = save ? countShards() : 0;
    var cur = save ? D.acts[save.actIndex] : null;
    list.appendChild(el('div', 'memo-sub',
      '瓷片 ' + count + '/16 · ' + (cur ? '当前：' + cur.name : '尚未入宫') + ' · 进度自动记录于本机'));
    var rec = btn(D.memoCopy.saveNow, 'ghost', function () {
      persist();
      if (global.TQCloud) { global.TQCloud.checkpoint(save); } /* 云镜像检查点：手动存档 */
      rec.textContent = D.memoCopy.saved;
    });
    rec.style.margin = '10px 0 0';
    list.appendChild(rec);
    if (window.TQA) {
      var setRow = el('div', 'memo-set');
      setRow.appendChild(el('span', 'memo-set-h', '体法与图样'));
      function mkChip(label, getV, setV, onLabel, offLabel) {
        var b = el('button', 'memo-set-chip' + (getV() ? ' on' : ''));
        function paint() {
          b.textContent = label + ' · ' + (getV() ? onLabel : offLabel);
          b.setAttribute('data-on', getV() ? '1' : '0');
        }
        b.addEventListener('click', function () { setV(!getV()); paint(); });
        paint();
        return b;
      }
      setRow.appendChild(mkChip('应节体法',
        function () { return TQA.tifaJie(); },
        function (v) { TQA.setSetting('tq_tifa', v ? 'jie' : 'gongxing'); },
        '应节', '躬行'));
      setRow.appendChild(mkChip('恒用预设图样',
        function () { return TQA.assetsMode() === 'vector'; },
        function (v) { TQA.setSetting('tq_assets_mode', v ? 'vector' : 'auto'); },
        '开', '关'));
      setRow.appendChild(el('span', 'memo-set-tip', '对新开小节生效'));
      list.appendChild(setRow);
    }
    var fbtn = buildFollowButton(); /* 手札次入口：网格版同时服务浮层与整页 */
    if (fbtn) {
      fbtn.style.margin = '8px 0 0';
      list.appendChild(fbtn);
    }
    if (global.TQCloud) {
      list.appendChild(el('div', 'memo-sub', '云存档：' + global.TQCloud.statusText()));
    }
  }

  /* 长卷版（s8_scroll 生图就位后激活；瓷居中 · 瓷片环围 · 近看可转）：满足 S8 版面图设计
   * opts.skipFooter：宿主已自带保存/设置条（如手札主屏 footbar）时，勿重复追加。 */
  function renderMemoScroll(body, img, opts) {
    body.classList.add('memo-s8');
    var scroll = el('div', 's8-scroll');
    if (img) { var bg = el('div', 's8-bg'); bg.style.backgroundImage = 'url(' + img.src + ')'; scroll.appendChild(bg); }
    scroll.appendChild(el('div', 's8-rod s8-rod-top'));
    scroll.appendChild(el('div', 's8-rod s8-rod-bot'));
    var jian = el('div', 's8-jian'); jian.appendChild(el('span', '', '合瓮圖')); scroll.appendChild(jian);
    var sb = el('div', 's8-body');
    ['tl', 'tr', 'bl', 'br'].forEach(function (s) {
      var id = TQA.DECO_SLOTS[s], got = save.deco && save.deco[id];
      var slot = el('div', 's8-slot' + (got ? ' got' : ''));
      slot.textContent = got ? TQA.DECO_NAME[id] : '挂';
      sb.appendChild(slot);
    });
    var stage = el('div', 's8-stage');
    var title = el('div', 's8-title', '合瓮圖');
    var count = el('div', 's8-count', '拾得 ' + countShards() + ' / 16');
    sb.appendChild(stage); sb.appendChild(title); sb.appendChild(count);
    scroll.appendChild(sb);
    body.appendChild(scroll);
    var viewer = el('div', 's8-viewer');
    body.appendChild(viewer);
    layoutScroll(stage, viewer);
    if (!(opts && opts.skipFooter)) {
      var rec = btn(D.memoCopy.saveNow, 'ghost', function () { persist(); rec.textContent = D.memoCopy.saved; });
      rec.style.margin = '10px 0 0';
      body.appendChild(rec);
      if (window.TQA) {
        var setRow = el('div', 'memo-set');
        setRow.appendChild(el('span', 'memo-set-h', '体法与图样'));
        function mkChip(label, getV, setV, onLabel, offLabel) {
          var b = el('button', 'memo-set-chip' + (getV() ? ' on' : ''));
          function paint() { b.textContent = label + ' · ' + (getV() ? onLabel : offLabel); b.setAttribute('data-on', getV() ? '1' : '0'); }
          b.addEventListener('click', function () { setV(!getV()); paint(); });
          paint(); return b;
        }
        setRow.appendChild(mkChip('应节体法', function () { return TQA.tifaJie(); }, function (v) { TQA.setSetting('tq_tifa', v ? 'jie' : 'gongxing'); }, '应节', '躬行'));
        setRow.appendChild(mkChip('恒用预设图样', function () { return TQA.assetsMode() === 'vector'; }, function (v) { TQA.setSetting('tq_assets_mode', v ? 'vector' : 'auto'); }, '开', '关'));
        setRow.appendChild(el('span', 'memo-set-tip', '对新开小节生效'));
        body.appendChild(setRow);
      }
      var fbtn = buildFollowButton(); /* 长卷版同样带关注次入口 */
      if (fbtn) {
        fbtn.style.margin = '8px 0 0';
        body.appendChild(fbtn);
      }
      if (global.TQCloud) {
        body.appendChild(el('div', 'memo-sub', '云存档：' + global.TQCloud.statusText()));
      }
    }
  }
  function layoutScroll(stage, viewer) {
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) { requestAnimationFrame(function () { layoutScroll(stage, viewer); }); return; }
    stage.innerHTML = '';
    var vh = Math.min(H * 0.6, W * 0.44), vw = vh * 240 / 375;
    var cx = W / 2, cy = H * 0.5;
    var rx = W * 0.46, ry = H * 0.42, nd = Math.max(30, Math.min(46, W * 0.09));
    var n16 = countShards(), gid = 's8v' + Math.floor(Math.random() * 1e6);
    var ves = '<svg viewBox="0 0 240 375" width="' + vw + '" height="' + vh + '" style="position:absolute;left:' + (cx - vw / 2) + 'px;top:' + (cy - vh / 2) + 'px;pointer-events:none">';
    if (n16 === 16) {
      ves += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9D4CF"/><stop offset=".55" stop-color="#8FB5B0"/><stop offset="1" stop-color="#5E837E"/></linearGradient>'
        + '<clipPath id="' + gid + 'c"><path d="' + VP + '"/></clipPath></defs>';
      ves += '<path d="' + VP + '" fill="url(#' + gid + ')"/>';
      ves += '<g clip-path="url(#' + gid + 'c)" stroke="#6E8E88" stroke-width="1" fill="none" opacity=".5">'
        + '<path d="M60 200 Q120 230 200 205"/><path d="M70 260 Q130 290 205 265"/><path d="M85 315 Q140 335 195 312"/>'
        + '<path d="M110 170 Q100 240 118 310"/><path d="M150 175 Q165 245 150 330"/></g>';
      ves += '<path d="' + VP + '" fill="none" stroke="#B08D46" stroke-width="3"/>';
    } else {
      var fo = (n16 / 16) * 0.12 + 0.05, op = 0.35 + 0.65 * n16 / 16;
      ves += '<path d="' + VP + '" fill="#8FB5B0" fill-opacity="' + fo.toFixed(3) + '" stroke="#4E6A66" stroke-width="1.6" stroke-opacity="' + op.toFixed(3) + '" stroke-dasharray="7 6"/>';
    }
    ves += '</svg>';
    stage.insertAdjacentHTML('beforeend', ves);
    for (var i = 0; i < 16; i++) {
      (function (i) {
        var id = i + 1, key = String(id), got = save.shards && save.shards[key];
        var a = (-90 + i * 22.5) * Math.PI / 180;
        var nx = cx + rx * Math.cos(a), ny = cy + ry * Math.sin(a);
        var node = el('div', 's8-node' + (got ? ' got' : ' ungot'));
        node.style.left = nx + 'px'; node.style.top = ny + 'px'; node.style.width = nd + 'px'; node.style.height = nd + 'px';
        node.style.margin = (-nd / 2) + 'px 0 0 ' + (-nd / 2) + 'px';
        if (got) {
          node.setAttribute('role', 'button');
          node.appendChild(el('span', 's8-dot', '✓'));
          if (window.F) { F.shardStill(node, key); }
          node.addEventListener('click', function () { openViewer(id); });
        } else { node.textContent = id; }
        stage.appendChild(node);
      })(i);
    }
    function openViewer(id) {
      while (viewer.firstChild) { viewer.removeChild(viewer.firstChild); }
      viewer.setAttribute('data-on', '1');
      var sheet = el('div', 's8-viewer-sheet');
      var x = el('button', 's8-viewer-close', '✕');
      x.addEventListener('click', function () { viewer.removeAttribute('data-on'); while (viewer.firstChild) { viewer.removeChild(viewer.firstChild); } });
      sheet.appendChild(x);
      var mv = el('div', 's8-viewer-stage'); sheet.appendChild(mv);
      var sh = D.shards[id] || {};
      var card = el('div', 's8-viewer-card');
      card.appendChild(el('div', 's8-viewer-name', sh.name || ('瓷片 ' + id)));
      card.appendChild(el('span', 's8-viewer-tag', '已归位 · 近看 · 拖动旋转 · 双指放大'));
      card.appendChild(el('div', 's8-viewer-quote', sh.text || ''));
      if (sh.source) { card.appendChild(el('div', 's8-viewer-source', '——' + sh.source)); }
      sheet.appendChild(card);
      var chip = el('button', 's8-viewer-chip', '自动旋转');
      chip.addEventListener('click', function () { if (window.F) { F.spin3d(mv, id); } });
      sheet.appendChild(chip);
      viewer.appendChild(sheet);
      if (window.F) { F.spin3d(mv, id); }
    }
  }

  /* ---------- 启动：先读档，再走 S9 加载页 ---------- */
  S.loadGame(function (obj) {
    if (obj && obj.v === 1 && obj.role) {
      save = obj; hasSave = true;
      if (!save.choices) { save.choices = {}; }
      if (!save.deco) { save.deco = {}; }
      if (!save.memories) { save.memories = {}; }
      if (!save.taskDone) { save.taskDone = {}; }
    }
    showLoad();
    /* 云存储恢复（local-first：本地档已即时可用，云端异步对账，updated 新者胜） */
    if (global.TQCloud && global.TQCloud.init()) {
      global.TQCloud.restore(save || null, function (cloud) {
        if (!cloud || typeof cloud.updated !== 'number') { return; }
        if (!save || cloud.updated > (save.updated || 0)) {
          save = cloud;
          if (!save.choices) { save.choices = {}; }
          if (!save.deco) { save.deco = {}; }
          if (!save.memories) { save.memories = {}; }
          if (!save.taskDone) { save.taskDone = {}; }
          hasSave = true;
          S.saveGame(save, function () {}); /* 云端新档回填本地三层 */
          transientToast('已从云端恢复进度');
        }
      });
    }
  });
})(window);
