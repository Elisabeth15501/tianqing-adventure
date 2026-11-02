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
  var ACT_KEY_HANDLER = null; /* 当前幕的键盘推进处理器（换幕/幕毕时摘掉，避免叠加） */

  /* ---------- 音效（2026-11-01 v1 · 无 BGM） ----------
   * 只做「动作反馈」：推进/按钮/确认/浮层/获得/笔触。
   * TQSFX 未加载或浏览器不支持 AudioContext 时全函数静默 no-op，不影响任何流程。 */
  function sfx(name) {
    if (global.TQSFX) { try { global.TQSFX.play(name); } catch (e) {} }
  }
  /* 启动即应用上次的音效开关（默认开） */
  (function initSfx() {
    if (!global.TQSFX) { return; }
    try {
      var v = null;
      try { v = localStorage.getItem('tq_sfx'); } catch (err) {}
      global.TQSFX.setEnabled(v !== 'off');
    } catch (e) {}
  }());
  var SELF_KEY = 'shiguan'; /* 玩家所扮角色的绘像 key（role=shi 史官 / nv 女官） */

  /* ---------- 立绘槽：说话人 → 程序化绘像（portraits.js · 未知 speaker 也有像，杜绝空位） ----------
   * 旁白（speaker 为空）不改立绘：保持上一说话人，避免 narr/card 相邻时的闪烁。
   * slot（2026-10-31 接线）：指定表情/姿态派生档，如「符后 e2 正色质问」。
   * 不传、或该槽还没出图，都由 TP.show → pickSlot 回落默认锚点，与接线前完全一致。
   * 双人（2026-10-31 v2）：st.pair 带第二个在场角色 ⇒ 左右两槽同框，说话的一方 data-st=on。
   *   分边是「黏住」的：同一场里谁在哪边定下来就不再换，只在换人说话时切换明暗与前后。 */
  var figL = null, figR = null, zoneEl = null;   /* 左槽 / 右槽（单人时右槽即 main） */
  var duoOn = false;
  var duoCast = { l: null, r: null };            /* 当前双人场：{ key, slot } */

  function toDuo() {
    if (duoOn || !figL || !figR) { return; }
    duoOn = true;
    figL.style.display = '';
    figL.setAttribute('data-side', 'l');
    figR.setAttribute('data-side', 'r');
    figL.setAttribute('data-duo', '1');
    figR.setAttribute('data-duo', '1');
    if (zoneEl) { zoneEl.setAttribute('data-duo', '1'); }
    duoCast = { l: null, r: null };
    if (global.TP && TP.bindStage) { TP.bindStage(zoneEl); }
    if (global.TP && TP.refit) { TP.refit(); }   /* 槽宽 88%→50%，必须重算归一化 */
  }
  function toSingle() {
    if (!duoOn || !figL || !figR) { return; }
    duoOn = false;
    figL.style.display = 'none';
    figL.setAttribute('data-side', 'off');
    figL.removeAttribute('data-duo');
    figL.removeAttribute('data-st');
    figR.setAttribute('data-side', 'main');
    figR.removeAttribute('data-duo');
    figR.removeAttribute('data-st');
    if (zoneEl) { zoneEl.removeAttribute('data-duo'); }
    duoCast = { l: null, r: null };
    if (global.TP && TP.bindStage) { TP.bindStage(zoneEl); }
    if (global.TP && TP.refit) { TP.refit(); }
  }

  function setPortrait(speaker, slot, pair, pairSlot) {
    if (!global.TP || !speaker || !figR) { return; }
    var sk = TP.keyOf(speaker, SELF_KEY);
    var pk = pair ? TP.keyOf(pair, SELF_KEY) : null;
    if (pk === sk) { pk = null; }   /* 同一人不出两张像 */
    if (!pk) {
      toSingle();
      TP.show(sk, { fill: true, slot: slot });
      reAnchorSoon(); /* 角色锚点可能不同（全身/半身）：重算 */
      return;
    }
    toDuo();
    var sSide = { key: sk, slot: slot }, pSide = { key: pk, slot: pairSlot };
    if (!duoCast.l || !duoCast.r) {
      duoCast = { l: pSide, r: sSide };          /* 新开一对：听者左、说者右 */
    } else if (duoCast.l.key === sk) {
      duoCast.l.slot = slot; duoCast.r = pSide;  /* 说话人已在左：左侧续用，右侧换成听者 */
    } else if (duoCast.r.key === sk) {
      duoCast.r.slot = slot; duoCast.l = pSide;
    } else {
      duoCast = { l: pSide, r: sSide };          /* 换了个第三人：重排 */
    }
    TP.show(duoCast.l.key, { fill: true, slot: duoCast.l.slot, side: 'l' });
    TP.show(duoCast.r.key, { fill: true, slot: duoCast.r.slot, side: 'r' });
    /* 两人共用一个 k（等高）：任一侧换人都会改变对方的 k，必须两边一起重算 */
    if (TP.refit) { TP.refit(); }
    if (figL) { figL.setAttribute('data-st', duoCast.l.key === sk ? 'on' : 'off'); }
    if (figR) { figR.setAttribute('data-st', duoCast.r.key === sk ? 'on' : 'off'); }
    reAnchorSoon();
  }
  /* ---------- 旁白双人同框（2026-11-02） ----------
   * narr 步可带 figs:['@self','官家'] —— 玩家与官家同台（官家抚瓮一节）。
   * 左=第一人（玩家），右=第二人（官家，提亮）；叙述不属于任何一方，
   * 但「看瓮」的主语是官家，故右侧亮。与 setPortrait 的 duoCast 各走各的，
   * 下一个带 speaker 的 card 会照常重排。 */
  function setFigs(pair) {
    if (!global.TP || !figR || !pair || pair.length < 2) { return; }
    var kl = TP.keyOf(pair[0], SELF_KEY);
    var kr = TP.keyOf(pair[1], SELF_KEY);
    if (!kl || !kr) { return; }
    toDuo();
    TP.show(kl, { fill: true, side: 'l' });
    TP.show(kr, { fill: true, side: 'r' });
    if (TP.refit) { TP.refit(); }
    figL.setAttribute('data-st', 'off');
    figR.setAttribute('data-st', 'on');
    reAnchorSoon();
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
    var zp = sp.getBoundingClientRect();
    var lift = Math.max(0, Math.round(sr.bottom - br.top)); /* 舞台底 → 对话框顶 */
    /* ★双栏判定（2026-11-01 实机定位）：宽屏横版把「立绘列」和「对话栏」并排放，
     * 对话框在立绘列的**右边**而不是下边。此时「舞台底→对话框顶」量出来的
     * 是整列高度（实测 617px），dock-top 槽的 bottom:calc(lift+gap) 会变成
     * 相对上移 617px —— 半身像整块飞出画面顶、height 被算成十几像素。
     * 判定：对话框左缘 ≥ 立绘列右缘 −2 ⇒ 并排 ⇒ 不需要「避让下沿」，lift 归零。 */
    var beside = br.left >= zp.right - 2;
    stage.style.setProperty('--fig-dock-lift', (beside ? 0 : lift) + 'px');
    sp.setAttribute('data-layout', beside ? 'beside' : 'stack');
    var act = D.acts[CUR_ACT];
    var forced = (act && act.figAnchor) ? act.figAnchor : null; /* 每幕可强指定构图 */
    /* 双人时两个槽可能一个是全身（踩底）、一个是半身（浮框上沿）——
     * 锚点必须逐槽判定，写在 .sp-zone 上只能有一份，混排时必错一个。 */
    var map = (global.TP && global.TP._sides) || {};
    Object.keys(map).forEach(function (side) {
      var n = map[side];
      if (!n || !n._tqKey) { return; }
      var a = forced || global.TP.anchorOf(n._tqKey, n._tqSlot) || 'stage-bottom';
      n.setAttribute('data-anchor', a);
    });
    /* 兼容：舞台上保留主槽那一份（旧样式/验收脚本仍读 .sp-zone[data-anchor]） */
    var main = map.main || map.r || map.l;
    if (main) { sp.setAttribute('data-anchor', main.getAttribute('data-anchor') || 'stage-bottom'); }
    /* ★重锚会改槽高（--fig-dock-lift / data-anchor 都直接影响 slot 的 height），
     *   而 k 是按槽高算的 —— 尺寸真变了就补一次归一化，否则这一场的身高比停在旧高度上。 */
    if (global.TP && TP.refitIfResized) { TP.refitIfResized(); }
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

  /* ---------- S9 加载页（游戏首屏 · 全构图同心于中轴） ----------
   * ★2026-11-02 改成**真素材加载页**：旧版这里是「装饰性首屏」——按钮立刻可点，
   *   立绘一张都没预载，进幕第一句台词那一帧才发请求（4G 340ms / 慢 3G 1.7s 的占位窗口）。
   *   现在：
   *     ① 进度条 = **真实的逐张解码进度**（不是假动画）；
   *     ② 失败会显示「n 项素材未载入 · 点此重试」，并且把环境问题（WebP 不支持等）
   *        明说出来——旧版 `TQA.env.webp` 探测完从未被使用，不支持 WebP 的环境里
   *        33 张图会全部 onerror 静默变成矢量占位，玩家只看到「立绘没出来」；
   *     ③ 硬上限 10s：宁可带着未完成的预载进幕，也绝不把玩家锁在加载页。 */
  function showLoad() {
    clear(app);
    var ld = F.buildLoad(function () { showTitle(); }, showCredits);
    app.appendChild(ld);
    if (window.TQA) { TQA.probeEnv(function () { paint(); }); } /* §10.5 L0 boot 探针 */

    /* ---- 进度 UI（插在「入宫当值」按钮上方，跟随 .lt 居中） ---- */
    var lt = ld.querySelector('.lt');
    var enterBtn = lt ? lt.querySelector('.btn') : null;
    var bar = el('div', 'ld-bar');
    var fill = el('i');
    bar.appendChild(fill);
    var note = el('div', 'ld-note', '正在备置素材');
    /* 排障入口：只有真的失败时才露出来，正常玩家看不到它。
     * 自检页把 33 个资源键逐张真实加载，一眼能分清「资源没发布」和「渲染层问题」。 */
    var diag = el('a', 'ld-diag', '素材自检');
    diag.setAttribute('href', './assets-check.html');
    diag.style.display = 'none';
    if (lt && enterBtn) {
      lt.insertBefore(bar, enterBtn);
      lt.insertBefore(note, enterBtn);
      lt.insertBefore(diag, enterBtn);
      enterBtn.disabled = true;
    }

    /* ---- 预载清单：玩家绘像 + 辰时前 3 位不同说话人（约 5 张 ≈ 260KB） ----
     * 为什么不整库预热：33 张 1.72MB，慢网会把加载页拖到几十秒。
     * 辰时是第一个有 card 的幕（寅时全是叙述＋小游戏），所以预热到它就够首屏无占位。 */
    var want = [];
    if (global.TP && TP.keyOf) {
      var selfKey = (save && save.role === 'nv') ? 'nvguan' : 'shiguan';
      want.push(selfKey);
      if (!hasSave) { want.push(selfKey === 'nvguan' ? 'shiguan' : 'nvguan'); }
      var seen = {};
      var chenSteps = (D.acts[1] && D.acts[1].steps) || [];
      for (var si = 0; si < chenSteps.length; si += 1) {
        if (want.length >= 4) { break; }
        var stp = chenSteps[si];
        if (!stp || stp.type !== 'card') { continue; }
        var sps = [stp.speaker, stp.pair];
        for (var sj = 0; sj < sps.length; sj += 1) {
          if (!sps[sj] || want.length >= 4) { continue; }
          var kk = TP.keyOf(sps[sj], selfKey);
          if (kk && kk !== 'DEFAULT' && !seen[kk] && want.indexOf(kk) < 0) { seen[kk] = 1; want.push(kk); }
        }
      }
    }

    var total = want.length, settled = 0, missKeys = [], released = false, timer = 0;

    function release(msg) {
      if (released) { return; }
      released = true;
      if (timer) { clearTimeout(timer); }
      if (enterBtn) {
        enterBtn.disabled = false;
        enterBtn.textContent = '入宫当值';
        if (msg) { note.className = 'ld-note'; note.textContent = msg; }
      }
    }

    function paint(done) {
      var pc = total ? Math.round(settled / total * 100) : 100;
      fill.style.width = (released && total ? 100 : pc) + '%';
      bar.className = 'ld-bar' + (missKeys.length ? ' fail' : '');
      diag.style.display = missKeys.length ? '' : 'none';
      var env = (window.TQA && TQA.envNote) ? TQA.envNote() : '';
      if (env) { diag.style.display = ''; note.className = 'ld-note err'; note.textContent = env; return; }
      if (missKeys.length) {
        /* 把失败的具体文件名报出来（最多 2 个）——实机上玩家截一张加载页的图，
         * 就能直接看出是「整包资源缺失」还是「个别文件坏了」，不用再猜。 */
        var nm = missKeys.slice(0, 2).map(function (k) {
          var p = (window.TQA && TQA.reg[k] && TQA.reg[k].src) ? TQA.reg[k].src.split('/').pop() : k;
          return p.replace(/^tq_chars_/, '').replace(/_final\.webp$/, '');
        });
        note.className = 'ld-note err';
        note.textContent = missKeys.length + ' 项素材未载入（' + nm.join('、')
          + (missKeys.length > 2 ? ' 等' : '') + '）· 点此重试';
        return;
      }
      note.className = 'ld-note';
      if (done || (total && settled >= total)) {
        note.textContent = '素材已就绪';
        release('入宫当值');
      } else {
        note.textContent = '正在备置素材 ' + settled + '/' + total;
      }
    }

    function run() {
      if (!global.TP || !TP.prefetch || !total) { release(''); paint(true); return; }
      if (window.TQA && TQA.env && TQA.env.webp === false) { paint(); release('入宫当值'); return; }
      note.className = 'ld-note';
      note.textContent = '正在备置素材 0/' + total;
      TP.prefetch(want, {
        conc: 2,
        tick: function (n, t, key, stt) {
          settled = n;
          if (stt === 'fail') { missKeys.push(key); }
          paint();
        },
        done: function () { paint(true); }
      });
    }

    /* 重试：清掉失败缓存再拉一次（真 404 重试也没用，但慢网超时的能救回来） */
    note.addEventListener('click', function () {
      if (!missKeys.length || !window.TQA) { return; }
      missKeys.forEach(function (k) { TQA.reset(k); });
      missKeys = [];
      settled = 0;
      fill.style.width = '0%';
      run();
      if (enterBtn) { enterBtn.disabled = true; }
      armTimeout();
    });

    function armTimeout() {
      if (timer) { clearTimeout(timer); }
      /* 硬上限：慢网下宁可先进幕（占位会晚到补图），也不能把人锁在加载页 */
      timer = setTimeout(function () { release('素材仍在后台载入'); }, 10000);
    }

    if (enterBtn) { enterBtn.disabled = true; }
    armTimeout();
    run();
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
    if (ACT_KEY_HANDLER) { document.removeEventListener('keydown', ACT_KEY_HANDLER); ACT_KEY_HANDLER = null; }
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
    /* VN 立绘舞台：无边框/无底卡/无独立名牌——立绘即画面主体，名字只在对话框名牌上出现一次。
     * 2026-10-31：两槽（左/右）。单人时左槽 off、右槽 main；双人时 l + r 同时在场。 */
    var slotL = el('div', 'slot sp-fig');
    var slotR = el('div', 'slot sp-fig');
    slotL.setAttribute('data-side', 'off');
    slotL.style.display = 'none';
    slotR.setAttribute('data-side', 'main');
    figL = slotL; figR = slotR; zoneEl = sp;
    duoOn = false; duoCast = { l: null, r: null };
    SELF_KEY = save.role === 'nv' ? 'nvguan' : 'shiguan';
    sp.appendChild(slotL);                     /* 先入树再绑定：bindStage 靠 querySelectorAll 收槽 */
    sp.appendChild(slotR);
    if (global.TP) {
      TP.bindStage(sp);
      TP.show(SELF_KEY, { fill: true });       /* 程序化绘像占位（素材到则原位升级真图） */
    } else {
      slotR.innerHTML = F.SIL;
    }
    vnMain.appendChild(sp);
    var doc = el('div', 'vn-doc');
    vnMain.appendChild(doc);
    main.appendChild(vnMain);
    app.appendChild(main);
    var seq = expandSteps(act.steps, save.role);
    runSteps(act, idx, doc, fromStep || 0, seq);
    /* ★滚动预取（2026-11-02）：立绘是**按需下载**的，旧版只有角色开口那一帧才发请求
     *   （实测 4G 340~420ms、慢 3G 1.7~3.1s 的占位窗口）。这里只提前拉「接下来 3 个」，
     *   不整幕预取——整幕 8 人 = 458KB，慢网会反过来把当前这张拖慢（实测 15KB/s 时
     *   当前图从 6s 拖到 20s+）。后续每一步由 prefetchAhead 继续往前滚。 */
    setTimeout(function () {
      if (global.TP && TP.prefetch) {
        TP.prefetch(castKeysOf(seq.slice(fromStep || 0, (fromStep || 0) + 3)), { conc: 1 });
      }
    }, 900);
  }

  /* 一幕里所有会露脸的说话人（含双人同框的第二人）→ 角色 key 列表（去重、保持出场顺序） */
  function castKeysOf(steps) {
    var out = [], seen = {};
    (steps || []).forEach(function (st) {
      if (!st || (st.type !== 'card' && st.type !== 'choice' && st.type !== 'role')) { return; }
      [st.speaker, st.pair].forEach(function (sp) {
        if (!sp || !global.TP) { return; }
        var k = TP.keyOf(sp, SELF_KEY);
        if (k && !seen[k]) { seen[k] = 1; out.push(k); }
      });
    });
    return out;
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
      if (!autoOn || occupied) { return; }   /* 占台（选择/差事帖/动手小节）期间不排自动拍 */
      autoTimer = setTimeout(function () {
        autoTimer = 0;
        if (!autoOn || occupied) { return; } /* 期间被占台：不推进，等玩家手动完成 */
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
          sfx('tap');
          if (autoOn) { stopAuto(); return; }
          stopSkip();
          autoOn = true; keyAuto.classList.add('on');
          if (curBox && busy && curBox._tqIsFull()) { armAuto(); }
        });
        keySkip.addEventListener('click', function (e) {
          e.stopPropagation();
          sfx('tap');
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
        keyLog.addEventListener('click', function (e) { e.stopPropagation(); sfx('tap'); openLog(); });
        keyMemo.addEventListener('click', function (e) { e.stopPropagation(); sfx('tap'); showMemoOverlay(); });
        strip.appendChild(keyAuto); strip.appendChild(keySkip);
        strip.appendChild(keyLog); strip.appendChild(keyMemo);
        dock.appendChild(strip);
        main.appendChild(dock);
      }
      return dock;
    }
    function dockBox(speaker, text, cb, slot, pair, pairSlot) {
      retract(); /* 幂等清场：sub 分支链不经过 next()，对话框回归时统一退占台/解键锁 */
      setPortrait(speaker, slot, pair, pairSlot); /* 说话人驱动立绘；pair = 同框的第二人 */
      var dock = ensureDock();
      var old = dock.querySelector('.dlg-box');
      if (old && old.parentNode) { old.parentNode.removeChild(old); }
      var item = { sp: speaker || '', t: text };
      function onAdv() {
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = 0; }
        sfx('advance');
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
      /* 退占台：自动档若仍开启，恢复推进（占台期间是暂停而非关闭） */
      if (autoOn && curBox && busy && curBox._tqIsFull()) { armAuto(); }
    }
    function occupyNode(node, keepDock) {
      retract();
      /* 2026-11-01：占台不再关闭「自动」——自动是玩家设的常开档，
       * 差事帖/动手小节/选择等需要玩家亲自操作的环节只是「暂停自动推进」，
       * 完成退场后自动继续（见 retract 末尾的续排）。「跳过」仍然停。 */
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = 0; }
      stopSkip();
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

    /* ---------- 键盘推进（2026-11-01 · 电脑端） ----------
     * 空格 / 回车 = 点对话框（补完打字 → 下一框，二击合一）。
     * 三条硬约束：
     *  ① 占台中（选择/差事帖/动手小节）不响应——这些必须玩家亲手完成；
     *  ② 焦点在按钮上时 preventDefault，避免「空格触发按钮 click」与推进并存；
     *  ③ 输入类元素内放行，不抢空格。
     * 自动档开着时也允许空格手动加速（不关自动）。 */
    function onKeyAdvance(e) {
      var k = e.key || e.keyCode;
      if (!(k === ' ' || k === 'Spacebar' || k === 'Enter' || k === 32 || k === 13)) { return; }
      var tag = ((e.target && e.target.tagName) || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') { return; }
      if (e.repeat) { return; }            /* 长按不连发，避免一路冲过去 */
      if (occupied) { return; }            /* 占台：交给玩家手动 */
      if (!busy || !curBox) { return; }
      e.preventDefault();
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = 0; }
      boxGo();
      if (autoOn) { armAuto(); }           /* 手动推进后仍续排自动拍 */
    }
    ACT_KEY_HANDLER = onKeyAdvance;
    document.addEventListener('keydown', onKeyAdvance);

    function next() {
      if (busy) { return; }
      retract(); /* 上一交互小节退场（若占台）；恢复 dock 与立绘区 */
      if (injected.length) { handleStep(injected.shift()); return; }
      if (i >= steps.length) { finishAct(idx, main); return; }
      var st = steps[i];
      i += 1;
      handleStep(st);
    }

    var prefT = 0;
    function prefetchAhead(from, n) {
      if (!global.TP || !TP.prefetch) { return; }
      if (prefT) { clearTimeout(prefT); }
      prefT = setTimeout(function () {
        prefT = 0;
        TP.prefetch(castKeysOf(steps.slice(from, from + n)), { conc: 1 });
      }, 160);
    }

    function handleStep(st) {
      busy = true;
      /* 只对「会露脸」的步骤滚动预取：narr/交互小节不改变 cast，预取也是白拉 */
      if (st.type === 'card') { prefetchAhead(i, 4); }
      if (st.type === 'narr') {
        if (st.figs) { setFigs(st.figs); }
        dockBox('', st.text, null);
      } else if (st.type === 'card') {
        /* st.slot：该句该用哪一档表情；st.pair / st.pairSlot：第二在场者及其表情（双人同框） */
        dockBox(st.speaker || '', st.text, null, st.slot, st.pair, st.pairSlot);
      } else if (st.type === 'iv') {
        var ivCfg = D.iv[st.cfg] || D.iv.tang;
        /* ★单轨闸门（11-01）：动手小节一律走小游戏，不再按「体法」在两套系统间切换。
           应节轨保留在下面这一支里：GSYS.jie.on 置真 + gameSystem() 改回读 tq_tifa 即恢复。
           第四参 onJie（小节内「应节而动」入口）传 null —— 入口本身由 frag.js 按闸门决定挂不挂。 */
        if (window.TQA && TQA.gameSystem() === 'jie') {
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
        }, (window.TQA && TQA.modeOpen('jie')) ? function () {
          retract();
          runJie(main, ivCfg, function () {
            if (st.deco && st.decoName) { awardDeco(st.deco, st.decoName, main); }
            busy = false;
            after();
          });
        } : null);
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
            if (s2.figs) { setFigs(s2.figs); }
            dockBox('', s2.text || '', nextSub);
          } else if (s2.type === 'card') {
            dockBox(s2.speaker || '', s2.text, nextSub, s2.slot, s2.pair, s2.pairSlot);
          } else if (s2.type === 'iv') {
            var ivCfg2 = D.iv[s2.cfg] || D.iv.tang;
            if (window.TQA && TQA.gameSystem() === 'jie') { /* 应节轨保留（第一版不进这里） */
              runJie(main, ivCfg2, function () {
                if (s2.deco && s2.decoName) { awardDeco(s2.deco, s2.decoName, main); }
                nextSub();
              });
            } else {
            var ivWrap2 = F.iv(main, ivCfg2, function (hits2) {
              if (s2.deco && s2.decoName) { awardDeco(s2.deco, s2.decoName, main); }
              nextSub();
            }, (window.TQA && TQA.modeOpen('jie')) ? function () {
              retract();
              runJie(main, ivCfg2, function () {
                if (s2.deco && s2.decoName) { awardDeco(s2.deco, s2.decoName, main); }
                nextSub();
              });
            } : null);
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
    if (first) { sfx('bead'); }  /* 首次拾得：三音上行的获得音 */
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
    /* 细看入口（P1-6）：拾得时就能拉近看釉下笔触，不必先收下再翻手札。
     * 两条路都通：显式按钮（可发现性）+ 在转台上轻点一下（手势）。
     * 判据用位移与时长：转台本身要拖拽擦洗，抬手时刻不能和拖动混淆。 */
    var acts = el('div', 'shard-acts');
    acts.appendChild(btn('细看', 'ghost', function () { openShardViewer(id); }));
    acts.appendChild(btn('收下瓷片', '', function () { done(); }));
    wrap.appendChild(acts);
    var px0 = 0, py0 = 0, pt0 = 0;
    stage.addEventListener('pointerdown', function (e) {
      px0 = e.clientX; py0 = e.clientY; pt0 = Date.now();
    });
    stage.addEventListener('pointerup', function (e) {
      if (Math.abs(e.clientX - px0) + Math.abs(e.clientY - py0) < 9 && Date.now() - pt0 < 420) {
        openShardViewer(id);
      }
    });
    VNC.occupy(wrap);
  }

  /* ---------- 选择（占台：选项独占舞台；选即锁定；回看/自动/跳过置灰；回复经 injected 走对话框） ---------- */
  function showChoice(main, st, done, pushStep) {
    var box = el('div', 'choice-box');
    box.setAttribute('role', 'radiogroup');
    setPortrait(st.speaker || '', st.slot, st.pair, st.pairSlot); /* 选择项的视角名（多为玩家自称）也驱动立绘 */
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
        sfx('select');
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
   * 由 direct2d 的「应节而动」入口切入，或设置项手动选择。
   * ★11-01：第一版不进此轨（动手小节单轨走小游戏）。**整段原样保留**，
   *   恢复方式见 js/assets.js 的 GSYS 注释，不需要改这个函数。 */
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
    /* 双人同场（2026-11-02）：回忆里的对话不再是「每句换一张立绘」——
     * 两个槽常驻，角色首次开口入场并留在台上，说话方全彩、在听方压暗（主线同款语义）。
     * 郭威↔郭荣、冯道↔郭荣、符后↔郭荣三段回忆由此获得标准 VN 对话演出。 */
    var figs = el('div', 'mem-figs');
    var slotL = el('div', 'mem-fig');
    var slotR = el('div', 'mem-fig');
    slotL.setAttribute('data-side', 'l');
    slotR.setAttribute('data-side', 'r');
    figs.appendChild(slotL);
    figs.appendChild(slotR);
    var plate = el('div', 'mem-plate');
    var line = el('div', 'mem-line');
    body.appendChild(figs);
    body.appendChild(plate);
    body.appendChild(line);
    ov.appendChild(body);
    var hint = el('div', 'mem-stage-hint', '轻点继续');
    ov.appendChild(hint);

    /* 台上名册：side → {key, slot}。角色不换槽（避免左右乱跳）；同名不同档（郭荣 a3/n1）
     * 只在档位变化时原位换图。 */
    var castL = null, castR = null;
    function slotOf(side) { return side === 'L' ? slotL : slotR; }
    function castOf(side) { return side === 'L' ? castL : castR; }
    function setCast(side, v) { if (side === 'L') { castL = v; } else { castR = v; } }
    function sideOfKey(key) {
      if (castL && castL.key === key) { return 'L'; }
      if (castR && castR.key === key) { return 'R'; }
      return null;
    }
    function paintSide(side, key, slotArt) {
      var ent = castOf(side);
      var s = slotOf(side);
      if (!ent || ent.key !== key || ent.slot !== slotArt) {
        s.innerHTML = global.TP.figure(key);
        s.className = 'mem-fig mem-fig-' + side.toLowerCase()
          + (key === 'DEFAULT' ? ' mem-fig-any' : ' mem-fig-' + key);
        if (global.TP.realInto) { global.TP.realInto(s, key, slotArt); }
        setCast(side, { key: key, slot: slotArt });
      }
      /* 面向彼此（2026-11-02 三版）：按原生朝向判定 —— 左位要朝右（原生朝左的翻），
       * 右位要朝左（原生朝右的翻）。★朝向必须**带槽**查：郭荣跪坐档 a2/a3 与站姿档
       * 是反着画的，只按角色查表会把它们翻到画外。 */
      if (global.TP.faceOf) {
        var nf = global.TP.faceOf(key, slotArt);
        var mir = (side === 'L') ? (nf === 'l') : (nf === 'r');
        s.setAttribute('data-mir', mir ? '1' : '0');
        s.setAttribute('data-st', s.getAttribute('data-st') || 'off');
        s.style.setProperty('--mem-sx', mir ? -1 : 1);
      }
      s.style.display = '';
    }
    /* 回忆舞台的尺寸（2026-11-02 下午口径）：统一 1.0（以郭荣为准），
     * 只有「跪姿 + 同框里有人站着」时按跪姿体量打折（见 TP.frameScale）。
     * 必须等两人都在台上再算 —— 单侧 paintSide 时还不知道对面跪不跪。 */
    function applyMemScale() {
      var list = [[slotL, castL], [slotR, castR]];
      var anyStanding = false;
      list.forEach(function (t) {
        var e = t[1];
        var f = e && global.TP.fitOf ? global.TP.fitOf(e.key, e.slot) : null;
        if (e && !(f && f.kneel)) { anyStanding = true; }
      });
      list.forEach(function (t) {
        var n = t[0], e = t[1];
        if (!e) { return; }
        var sv = (global.TP.frameScale ? global.TP.frameScale(e.key, e.slot, anyStanding) : 1) || 1;
        n.style.setProperty('--mem-s', sv);
      });
    }
    function paint() {
      var st = steps[k];
      var nm = st.s || '';
      prog.textContent = (k + 1) + ' / ' + steps.length;
      plate.textContent = nm;
      plate.style.display = nm ? '' : 'none';
      line.textContent = st.t;
      if (nm && global.TP) {
        /* fig 显式立绘键优先于 MAP 映射：用于「同名不同龄」——
         * 少年茶一幕说话人是「郭荣」，但立绘须取少年档 shaonian（见 data.js 该步注释）。 */
        var key = st.fig || global.TP.keyOf(nm, save && save.role === 'shi' ? 'shiguan' : 'nvguan');
        var on = sideOfKey(key);
        if (!on) {
          /* 首次开口：先到先占左位；另一人随后入右位。两位都在场而第三人开口
           * （本作回忆不存在，防御一下）→ 换掉左位。 */
          on = !castL ? 'L' : (!castR ? 'R' : 'L');
        }
        paintSide('L', on === 'L' ? key : castL && castL.key, on === 'L' ? st.slot : castL && castL.slot);
        if (on === 'R' || castR) {
          paintSide('R', on === 'R' ? key : castR && castR.key, on === 'R' ? st.slot : castR && castR.slot);
        }
        figs.setAttribute('data-n', (castL && castR) ? '2' : '1');
        slotL.setAttribute('data-st', on === 'L' ? 'on' : 'off');
        slotR.setAttribute('data-st', on === 'R' ? 'on' : 'off');
      } else {
        /* 旁白：台上的人留在原地一起压暗（VN 惯例：旁白不属于任何人），
         * 不再清空立绘——正是「切换生硬」的来源。在途真图继续放行（cast 未变）。 */
        slotL.setAttribute('data-st', 'off');
        slotR.setAttribute('data-st', 'off');
      }
      line.classList.remove('mem-in');
      void line.offsetWidth; /* 强制重排：重放淡入 */
      line.classList.add('mem-in');
      hint.textContent = (k === steps.length - 1) ? '轻点 · 回神' : '轻点继续';
      applyMemScale();   /* 台上名册定了才算尺寸（要知道对面跪不跪） */
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
  /* ---------- 手札 · 瓷片查看器（薄壳） ----------
   * 实现在 js/viewer.js（独立模块，2026-11-02 拆出）：查看器与手札主流程没有共享状态，
   * 绑在 1900 行的 app.js 里只会让两边改动的冲突面无限大。
   * 这里只负责把「已拾得清单」喂进去 —— 只有 app.js 知道存档。
   * viewer.js 放在 index.html 末尾加载，点击时必然已就绪；万一没有则静默降级（不白屏）。
   */
  function openShardViewer(id) {
    if (!window.TQViewer) { return; }
    var list = [];
    for (var i = 1; i <= 16; i += 1) {
      if (save && save.shards && save.shards[String(i)] && D.shards[String(i)]) { list.push(i); }
    }
    if (!list.length) { list = [Number(id)]; }
    window.TQViewer.open({ id: Number(id), list: list, shards: D.shards, sfx: sfx });
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

  /* ---------- 玉津园 · 投壶（终幕）：整局都在台上 ----------
   * 2026-11-02 起，投壶不再"对话框里报结果、台上只投两矢"：
   *   群臣四人各二矢 → 礼官两矢 → 官家压轴两矢 → 结算，全部在 minigame 的台上演完，
   *   台词走画内提示条（同演示页：一句台词与一矢进程交替推进）。
   * 这里只做三件事：注入台词表、占台、收尾发金矢。
   * ★台词表用 cfg.story 注入（幂等，只注一次）——D.iv.touhu 与 D.touhu 在 data.js 里同级，
   *   字面量内没法互相引用，故在运行时挂上，避免把台词抄进 minigame.js。 */
  function runTouhu(main, done) {
    var ivc = D.iv.touhu;
    if (!ivc.story) { ivc.story = D.touhu; }
    var ivWrap = F.iv(main, ivc, function () {
      awardDeco('jinzhi', '金矢', main); // 胜负零惩罚，参与即纪念
      done();
    }, null);
    VNC.occupy(ivWrap);
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
    if (window.F) {
      /* 终幕合瓮：用 3D 纸槌瓶（vessel-LL 多向图集）替代 2D 矢量瓶 ——
       * 贴合「合瓮」这一动作，且给出可拖动 / 自转的实体感。
       * 不做合瓷动画，仅以 3D 实瓶作为合瓮完成后的「成品」呈现。 */
      var v3d = el('div', 'ending-vessel-3d');
      svgBox.appendChild(v3d);
      F.spin3d(v3d, 'vessel');
    } else {
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
    }
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

  /* ---------- 幕毕结算卡片（2026-11-01 排版重构） ----------
   * ★为什么不能再用 .memo-sub 直接塞进 main：
   *   finishAct 收到的 main 实参其实是**对话文档容器 .vn-doc**
   *   （实测 DOM 链：div.memo-sub < div.vn-doc < div.vn-main < div.main.act-vn）。
   *   而 .vn-doc 在竖版是 `margin-top:auto / max-height:46% / min-height:120px`
   *   的贴底对话区，立绘 .sp-zone 又是绝对定位 inset:0 铺满舞台 ⇒ 结算文字
   *   必然落在人物胸口上（实测 390×844：文字 y601~618，立绘 y208~717，完全重叠）；
   *   宽屏 .vn-doc 是 row 分栏，同一行字又会漂到舞台左上（实测 y=73）。
   *   即位置由「对话布局」决定，与「本章结束」这一状态毫无关系，且 12px 灰字
   *   没有任何层级，玩家看不出这一幕已经结束。
   * ★现在：结算层挂到舞台（.main.act-vn）上，绝对定位铺满、纸卡居中。
   *   位置与层级固定，排版规则与对话彻底解耦；断点只调字号与内边距。 */
  function showActSettle(host, idx, act) {
    var T = D.actEndCopy || {};
    var fill = function (fmt, o) {
      return String(fmt == null ? '' : fmt).replace(/\{(\w+)\}/g, function (m, k) {
        return (o && o[k] != null) ? String(o[k]) : '';
      });
    };
    var ov = el('div', 'act-settle');
    var card = el('div', 'as-card');
    card.appendChild(el('div', 'as-kicker', T.kicker || '时辰礼毕'));
    card.appendChild(el('div', 'as-title', fill(T.titleFmt || '{act}', { act: act.name })));
    card.appendChild(el('div', 'as-rule'));
    var body = el('div', 'as-body', fill(T.body || '', { act: act.name }));
    card.appendChild(body);
    var next = D.acts[idx + 1];
    if (next) { card.appendChild(el('div', 'as-next', fill(T.nextFmt || '下一时辰 · {next}', { next: next.name }))); }
    ov.appendChild(card);
    host.appendChild(ov);
    /* 多语言自适应：正文按实际渲染行数判定——超过 3 行改左对齐（居中长段难读），
     * 字号行距由 CSS 断点决定；卡片自身 max-height:100% + overflow-y:auto，
     * 极长译文滚动查看，不会被截断或顶出屏幕。 */
    (function () {
      var raf = global.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
      raf(function () {
        var cs = global.getComputedStyle(body);
        var lh = parseFloat(cs.lineHeight) || 20;
        var lines = Math.round(body.getBoundingClientRect().height / lh);
        if (lines >= 3) { body.classList.add('is-long'); }
      });
    }());
    return ov;
  }

  /* ---------- 幕毕 ---------- */
  function finishAct(idx, main) {
    if (ACT_KEY_HANDLER) { document.removeEventListener('keydown', ACT_KEY_HANDLER); ACT_KEY_HANDLER = null; }
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
    /* 结算层挂在舞台上（.main.act-vn），不放 .vn-doc —— 后者与立绘重叠，见 showActSettle 注释 */
    var host = (main && main.closest && main.closest('.main.act-vn')) || null;
    showActSettle(host || app, idx, act);
    app.classList.add('with-foot');
    var foot = el('footer', 'footbar fb-act');
    foot.appendChild(btn('翻阅手札', '', function () { showMemo(false); }));
    foot.appendChild(btn('继续值守', 'ghost', function () { enterAct(save.actIndex); }));
    app.appendChild(foot);
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
  /* ---------- 合瓷归位图（手札拼合进度盘） ----------
   * 瓶形轮廓 = 合瓮的「目标态」；16 枚碎片按位置标在瓶身上，
   * 已拾得的发光实填、未拾得的虚线幽灵；瓶内按已归位比例从底填起「水位」。
   * 与「位置图」区别：位置图标的是「在哪捡」，归位图标的是「拼回瓶上第几片」——
   * 直接对应终幕「合瓮」这一动作。 */
  function buildMergerMap() {
    var got = 0, i;
    for (i = 1; i <= 16; i++) { if (save && save.shards && save.shards[String(i)]) { got += 1; } }
    var BOTTLE = 'M92 42 L91 108 Q90 116 78 120 L54 126 Q26 138 24 190 L24 222 '
      + 'Q24 272 46 300 Q58 314 74 318 L86 321 L134 321 L146 318 Q162 314 174 300 '
      + 'Q196 272 196 222 L196 190 Q194 138 166 126 L142 120 Q130 116 129 108 L128 42 Z';
    var svg = '<svg viewBox="0 0 220 320" class="merger-svg" aria-label="合瓷归位图，已归位 ' + got + ' 枚">'
      + '<defs><linearGradient id="mMlz" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="#8CAAA6"/><stop offset=".5" stop-color="#AFC7C1"/>'
      + '<stop offset="1" stop-color="#77948F"/></linearGradient>'
      + '<clipPath id="mClip"><path d="' + BOTTLE + '"/></clipPath></defs>';
    svg += '<path d="' + BOTTLE + '" fill="none" stroke="rgba(94,140,138,.5)" stroke-width="2"/>';
    /* 归位水位：已拾得比例从瓶底填起 */
    var lvl = got / 16, top = 321 - 300 * lvl;
    if (lvl > 0) {
      svg += '<g clip-path="url(#mClip)"><rect x="20" y="' + top.toFixed(1)
        + '" width="180" height="' + (321 - top).toFixed(1) + '" fill="url(#mMlz)" opacity=".5"/></g>';
    }
    /* 16 枚碎片归位点（瓶身 4×4 散布） */
    var pos = [[65,150],[95,150],[125,150],[155,150],[65,200],[95,200],[125,200],[155,200],
              [65,250],[95,250],[125,250],[155,250],[65,295],[95,295],[125,295],[155,295]];
    for (i = 0; i < 16; i++) {
      var on = save && save.shards && save.shards[String(i + 1)];
      svg += '<circle cx="' + pos[i][0] + '" cy="' + pos[i][1] + '" r="9" '
        + (on ? 'fill="#E4EFEB" stroke="#2E5E58" stroke-width="2"'
              : 'fill="rgba(255,255,255,.22)" stroke="rgba(94,140,138,.6)" stroke-width="1.5" stroke-dasharray="3 3"')
        + '/>';
      svg += '<text x="' + pos[i][0] + '" y="' + (pos[i][1] + 3.2).toFixed(1)
        + '" text-anchor="middle" font-size="9" '
        + 'fill="' + (on ? '#2E5E58' : 'rgba(46,59,56,.5)') + '">' + (i + 1) + '</text>';
    }
    svg += '</svg>';
    var wrap = el('div', 'merger-map');
    var box = el('div', 'merger-svgbox');
    box.innerHTML = svg;
    wrap.appendChild(box);
    wrap.appendChild(el('div', 'merger-cap', '合瓮归位图 · 已归位 ' + got + ' / 16'));
    return wrap;
  }

  function renderMemoGridMain(main, notice, count, cur, canContinue) {
    main.appendChild(el('div', 'memo-head', D.memoCopy.title));
    main.appendChild(el('div', 'memo-sub', notice || D.memoCopy.sub));
    main.appendChild(buildMergerMap());
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
      cell.setAttribute('data-sid', key); /* 供验收/调试脚本精确定位（不影响样式与交互） */
      if (got) {
        cell.innerHTML = F.FRACTURE; /* 已拾得：瓷片剪影（复刻验稿页 §6） */
      } else {
        cell.textContent = String(id);
      }
      if (got && D.shards[key]) {
        cell.setAttribute('role', 'button');
        (function (k, c) {
          /* 点瓷片 → 全屏查看器（可放大/拖动/切视角，✕ 返回手札）；引文与出处搬进了查看器 */
          c.addEventListener('click', function () { openShardViewer(k); });
          c.setAttribute('tabindex', '0');
          c.addEventListener('keydown', function (e) {
            var kk = e.key || e.keyCode;
            if (kk === 'Enter' || kk === ' ' || kk === 13 || kk === 32) { e.preventDefault(); openShardViewer(k); }
          });
        })(key, cell);
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
    if (old) { old.parentNode.removeChild(old); sfx('close'); return; }
    sfx('open');
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
      cell.setAttribute('data-sid', key); /* 供验收/调试脚本精确定位（不影响样式与交互） */
      if (got) { F.shardStill(cell, key); } else { cell.textContent = String(id); }
      if (got && D.shards[key]) {
        cell.setAttribute('role', 'button');
        (function (k, c) {
          /* 点瓷片 → 全屏查看器（可放大/拖动/切视角，✕ 返回手札）；引文与出处搬进了查看器 */
          c.addEventListener('click', function () { openShardViewer(k); });
          c.setAttribute('tabindex', '0');
          c.addEventListener('keydown', function (e) {
            var kk = e.key || e.keyCode;
            if (kk === 'Enter' || kk === ' ' || kk === 13 || kk === 32) { e.preventDefault(); openShardViewer(k); }
          });
        })(key, cell);
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
      /* 游戏系统：第一版单轨（动手），这里只显示状态、不给切换开关 ——
         「动手小节不切换任何游戏系统模式」。★应节轨保留：见 js/assets.js GSYS 注释。 */
      var gsA = el('span', 'memo-set-chip on kept', '游戏系统 · ' + (window.TQA.modeOpen('jie') ? '应节' : '动手'));
      gsA.title = TQA.modeNote('jie');
      gsA.setAttribute('data-kept', '1');
      setRow.appendChild(gsA);
      setRow.appendChild(mkChip('恒用预设图样',
        function () { return TQA.assetsMode() === 'vector'; },
        function (v) { TQA.setSetting('tq_assets_mode', v ? 'vector' : 'auto'); },
        '开', '关'));
      setRow.appendChild(mkChip('音效',
        function () { return global.TQSFX && global.TQSFX.isEnabled(); },
        function (v) { if (global.TQSFX) { global.TQSFX.setEnabled(v); } TQA.setSetting('tq_sfx', v ? 'on' : 'off'); },
        '开', '关'));
      setRow.appendChild(el('span', 'memo-set-tip', '游戏系统单轨·对新开小节生效'));
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
        /* 同上：状态位，不可切换（单轨）。 */
        var gsB = el('span', 'memo-set-chip on kept', '游戏系统 · ' + (window.TQA.modeOpen('jie') ? '应节' : '动手'));
        gsB.title = TQA.modeNote('jie');
        gsB.setAttribute('data-kept', '1');
        setRow.appendChild(gsB);
        setRow.appendChild(mkChip('恒用预设图样', function () { return TQA.assetsMode() === 'vector'; }, function (v) { TQA.setSetting('tq_assets_mode', v ? 'vector' : 'auto'); }, '开', '关'));
        setRow.appendChild(mkChip('音效',
          function () { return global.TQSFX && global.TQSFX.isEnabled(); },
          function (v) { if (global.TQSFX) { global.TQSFX.setEnabled(v); } TQA.setSetting('tq_sfx', v ? 'on' : 'off'); },
          '开', '关'));
        setRow.appendChild(el('span', 'memo-set-tip', '游戏系统单轨·对新开小节生效'));
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
    /* 排障短入口（2026-11-02）：`index.html?assets=1` 直接进素材自检页。
     * 手机上不必手输长地址；实机出问题时截一张自检页即可定位是资源还是渲染层。 */
    if (/[?&]assets=1/.test(location.search)) {
      location.replace('./assets-check.html');
      return;
    }
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
  /* 自动化验收钩子（只读入口，不改变状态机）：headless 脚本要直接进手札，
   * 不必「玩到拿到瓷片」。与 frag.js 的 mount.__tq() 同一思路。 */
  global.TQApp = {
    memo: function () { showMemo(false); },
    memoOverlay: function () { showMemoOverlay(); },
    viewer: openShardViewer,
    /* 终幕验收钩子（只读入口，便于 headless 直达合瓮结算画面，无需玩到最后一幕）。
     * 若存档未就绪则就地构造一个最小全量档，保证 showEnding 不报错。 */
    ending: function () {
      if (!save) {
        try { save = JSON.parse(localStorage.getItem('tianqing_save_v1')) || null; } catch (e) { save = null; }
      }
      if (!save) { save = S.newSave('nv'); }
      if (!save.memories) { save.memories = {}; }
      if (!save.deco) { save.deco = {}; }
      if (!save.choices) { save.choices = {}; }
      showEnding();
    }
  };
})(window);
