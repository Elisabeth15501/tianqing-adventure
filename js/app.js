/* 天清往事 · 应用主体（M1 垂直切片）
 * Chrome 61 基线：ES2017、无 inline script、无 onclick 属性、无 fetch、全 addEventListener。
 * 步骤类型：narr / card / shard / choice / shangshu（四拍节奏，失败零惩罚）。
 * 场景：title → role → act（含背景画）→ memo；幕毕自动存档；手札页手动存档/清档。
 */
(function (global) {
  'use strict';

  /* ---------- 宿主安全顶距探测（小工具 WebView / 全屏浏览器双态） ----------
   * 优先序：宿主桥 __TQ_HOST__.insetTop → URL ?insetTop=48 → postMessage → 默认 0。
   * Chrome 61 禁 env()，宿主 chrome 高度以 JS 测定值写入 CSS 变量消费。 */
  (function () {
    function setInset(px) {
      document.documentElement.style.setProperty('--tq-top-inset', px + 'px');
    }
    var p = /[?&]insetTop=(\d+(?:\.\d+)?)/.exec(location.search || '');
    if (p) { setInset(Math.round(parseFloat(p[1]))); return; }
    if (window.__TQ_HOST__ && window.__TQ_HOST__.insetTop) { setInset(window.__TQ_HOST__.insetTop); return; }
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d && d.type === 'tq-host-inset' && typeof d.top === 'number') { setInset(Math.round(d.top)); }
    });
  })();

  var D = global.TQ_DATA;
  var F = global.TQF;
  var S = global.TQStorage;
  var app = document.getElementById('app');
  var save = null;
  var hasSave = false;
  var VNC = {}; /* VN 对话层通道（dockBox/occupy/retract/lock/stop），runSteps 内接线，小节函数经此占台 */

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
    if (save) { save.updated = Date.now(); S.saveGame(save, function () {}); }
  }
  function countShards() {
    var n = 0, k;
    for (k in save.shards) { if (save.shards[k]) { n += 1; } }
    return n;
  }

  /* ---------- S9 加载页（游戏首屏 · 全构图同心于中轴） ---------- */
  function showLoad() {
    clear(app);
    app.appendChild(F.buildLoad(function () { showTitle(); }, showCredits));
  }

  /* ---------- 首屏（按钮组钉底 footbar；横版归位右侧 .tr） ---------- */
  function showTitle() {
    clear(app);
    app.classList.add('with-foot');
    app.appendChild(topbar(D.title.sub));
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
    // 首屏左下角：史实出处入口（鸣谢页式，审核与考据玩家可见）
    var cr = el('button', 'credits-btn', '史实出处');
    cr.setAttribute('aria-label', '查看本作史实出处');
    cr.addEventListener('click', showCredits);
    app.appendChild(cr);
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
    var slot = el('div', 'slot');
    slot.innerHTML = F.SIL;
    slot.appendChild(el('div', 'tag', 'AI 立绘槽 · 轨①'));
    slot.appendChild(el('div', 'sub', 'A 级全身 1024×1536 · 6.5 头身 · 未到（not_run）'));
    sp.appendChild(slot);
    var roleName = save && save.role ? (save.role === 'shi' ? '随驾史官 · 玩家' : '宫中女官 · 玩家') : '玩家';
    sp.appendChild(el('div', 'pname', roleName));
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

  /* ---------- 瓷心回忆（五段） ---------- */
  function runMemory(main, id, done) {
    var m = D.memories[id];
    if (!m) { done(); return; }
    save.memories[id] = true;
    persist();
    var panel = el('div', 'panel memory-panel');
    var head = el('div', 'memo-head', m.title);
    head.appendChild(el('span', 'prov', m.prov));
    panel.appendChild(head);
    panel.appendChild(el('div', 'memo-sub', m.era));
    m.lines.forEach(function (t) {
      panel.appendChild(el('div', 'memory-line', t));
    });
    var wrap = el('div', 'mem-occ');
    wrap.appendChild(panel);
    wrap.appendChild(btn('从回忆里回来', 'ghost', function () { done(); }));
    VNC.occupy(wrap); /* 占台：回忆面板独占舞台 */
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

  /* ---------- 终幕结算（合瓮长卷 · 简版） ---------- */
  function showEnding(main) {
    app.classList.add('ending-scene');
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
    var foot = el('footer', 'footbar fb-ending');
    foot.appendChild(btn('翻阅手札', '', function () { showMemo(false); }));
    foot.appendChild(btn('从头再来', 'ghost', function () {
      S.clearSave(function () { save = null; hasSave = false; showTitle(); });
    }));
    app.appendChild(foot);
    main.scrollTop = main.scrollHeight;
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
    if (idx === D.acts.length - 1) { showEnding(main); return; } // 终幕 → 合瓮结算
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
    main.appendChild(el('div', 'memo-head', D.memoCopy.title));
    main.appendChild(el('div', 'memo-sub', notice || D.memoCopy.sub));

    // 瓷片图鉴：已拾得的瓷片可点开重读知识点
    var grid = el('div', 'memo-grid');
    var detail = el('div', 'shiliao shard-detail');
    function showDetail(key) {
      var sh = D.shards[key];
      if (!sh) { return; }
      while (detail.firstChild) { detail.removeChild(detail.firstChild); }
      var head = el('div', 'head', '瓷片 · ' + sh.name);
      head.appendChild(el('span', 'prov', sh.prov));
      detail.appendChild(head);
      detail.appendChild(el('div', 'quote', sh.text));
      detail.appendChild(el('div', 'source', '——' + sh.source));
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

    var count = save ? countShards() : 0;
    var cur = save ? D.acts[save.actIndex] : null;
    // 继续值守仅在当前幕真正可玩（已解锁且有内容）时提供，避免死端
    var canContinue = !!(cur && cur.unlocked && cur.steps.length > 0);
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

  /* ---------- 手札浮层（VN 状态不破坏：图鉴 + 进度 + 补记，合上回到原对话框） ---------- */
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
    var list = el('div', 'log-list memo-body');
    var grid = el('div', 'memo-grid');
    var detail = el('div', 'shiliao shard-detail');
    function showDetail(key) {
      var sh = D.shards[key];
      if (!sh) { return; }
      while (detail.firstChild) { detail.removeChild(detail.firstChild); }
      var head = el('div', 'head', '瓷片 · ' + sh.name);
      head.appendChild(el('span', 'prov', sh.prov));
      detail.appendChild(head);
      detail.appendChild(el('div', 'quote', sh.text));
      detail.appendChild(el('div', 'source', '——' + sh.source));
      detail.setAttribute('data-on', '1');
      list.scrollTop = list.scrollHeight;
    }
    for (var id = 1; id <= 16; id++) {
      var key = String(id);
      var got = save && save.shards && save.shards[key];
      var cell = el('div', 'memo-cell' + (got ? ' got' : ''));
      if (got) { cell.innerHTML = F.FRACTURE; } else { cell.textContent = String(id); }
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
      rec.textContent = D.memoCopy.saved;
    });
    rec.style.margin = '10px 0 0';
    list.appendChild(rec);
    panel.appendChild(list);
    ov.appendChild(panel);
    ov.addEventListener('click', function (e) { if (e.target === ov) { close(); } });
    document.addEventListener('keydown', escH);
    app.appendChild(ov);
    function escH(e) { var k = e.key || e.keyCode; if (k === 'Escape' || k === 'Esc' || k === 27) { close(); } }
    function close() { if (ov.parentNode) { ov.parentNode.removeChild(ov); } document.removeEventListener('keydown', escH); }
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
  });
})(window);
