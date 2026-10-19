/* 天清往事 · 应用主体（M1 垂直切片）
 * Chrome 61 基线：ES2017、无 inline script、无 onclick 属性、无 fetch、全 addEventListener。
 * 步骤类型：narr / card / shard / choice / shangshu（四拍节奏，失败零惩罚）。
 * 场景：title → role → act（含背景画）→ memo；幕毕自动存档；手札页手动存档/清档。
 */
(function (global) {
  'use strict';

  var D = global.TQ_DATA;
  var S = global.TQStorage;
  var app = document.getElementById('app');
  var save = null;
  var hasSave = false;

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
  function topbar(actName) {
    var bar = el('div', 'topbar');
    bar.appendChild(el('div', 'act-name', actName || '天清往事'));
    var memo = el('button', 'memo-btn', '手札');
    memo.addEventListener('click', function () { showMemo(true); });
    bar.appendChild(memo);
    return bar;
  }
  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } node.classList.remove('ending-scene'); }
  function persist() {
    if (save) { save.updated = Date.now(); S.saveGame(save, function () {}); }
  }
  function countShards() {
    var n = 0, k;
    for (k in save.shards) { if (save.shards[k]) { n += 1; } }
    return n;
  }

  /* ---------- 首屏 ---------- */
  function showTitle() {
    clear(app);
    app.appendChild(topbar(D.title.sub));
    var main = el('div', 'main');
    var wrap = el('div', 'title-wrap');
    wrap.appendChild(el('div', 'title-main', D.title.main));
    wrap.appendChild(el('div', 'title-sub', D.title.sub));
    wrap.appendChild(el('div', 'title-note', D.title.note));
    var actions = el('div', 'title-actions');
    if (hasSave && save && save.role) {
      actions.appendChild(btn('继续值守', '', function () { enterAct(save.actIndex); }));
      actions.appendChild(btn('从头再来', 'ghost', function () {
        S.clearSave(function () { save = null; hasSave = false; showRole(); });
      }));
    } else {
      actions.appendChild(btn('入宫当值', '', function () { showRole(); }));
    }
    wrap.appendChild(actions);
    main.appendChild(wrap);
    app.appendChild(main);
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
    var ov = el('div', 'credits-overlay');
    var panel = el('div', 'credits-panel');
    panel.appendChild(el('div', 'credits-title', C.title));
    panel.appendChild(el('div', 'credits-sub', C.sub));
    panel.appendChild(el('div', 'credits-statement', C.statement));
    function sec(name) { panel.appendChild(el('div', 'credits-sec', name)); }
    function row(name, src) {
      var r = el('div', 'credits-row');
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
    C.notes.forEach(function (n) { panel.appendChild(el('div', 'credits-note', n)); });
    panel.appendChild(btn('合上出处', 'ghost credits-close', function () {
      if (ov.parentNode) { ov.parentNode.removeChild(ov); }
    }));
    ov.appendChild(panel);
    app.appendChild(ov);
  }

  /* ---------- 选身份 ---------- */
  function showRole() {
    clear(app);
    app.appendChild(topbar('天清往事 · 应差'));
    var main = el('div', 'main');
    main.appendChild(el('div', 'narr', '天清节前夜，礼部来人问话：这一日，你以何职当值？'));
    D.roles.forEach(function (role) {
      var b = btn(role.name, 'ghost role-item', function () { startNew(role.id); });
      b.appendChild(el('span', 'desc', role.desc));
      main.appendChild(b);
    });
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
    app.appendChild(topbar(act.name));
    if (act.bg && D.bg[act.bg]) {
      var bg = el('div', 'bg-art');
      bg.innerHTML = D.bg[act.bg];
      app.appendChild(bg);
    }
    var main = el('div', 'main');
    app.appendChild(main);
    runSteps(act, idx, main, fromStep || 0, expandSteps(act.steps, save.role));
  }

  function runSteps(act, idx, main, fromStep, steps) {
    var i = fromStep;
    var busy = false;
    steps = steps || act.steps;

    function next() {
      if (busy) { return; }
      if (i >= steps.length) { finishAct(idx, main); return; }
      var st = steps[i];
      i += 1;
      if (st.type === 'narr') {
        main.appendChild(el('div', 'narr', st.text));
        after();
      } else if (st.type === 'card') {
        var c = el('div', 'card');
        c.appendChild(el('div', 'speaker', st.speaker || ''));
        c.appendChild(el('div', 'text', st.text));
        main.appendChild(c);
        after();
      } else if (st.type === 'shard') {
        busy = true;
        showShard(main, st.id, function () { busy = false; after(); });
      } else if (st.type === 'choice') {
        busy = true;
        showChoice(main, st, function () { busy = false; after(); });
      } else if (st.type === 'shangshu') {
        busy = true;
        runRhythm(main, D.shangshu, { deco: 'jinzang', decoName: '金觞' }, function () { busy = false; after(); });
      } else if (st.type === 'rhythm') {
        busy = true;
        var rcfg = D[st.cfg] || D.shangshu;
        runRhythm(main, rcfg, { deco: st.deco, decoName: st.decoName }, function () { busy = false; after(); });
      } else if (st.type === 'memory') {
        busy = true;
        runMemory(main, st.id, function () { busy = false; after(); });
      } else if (st.type === 'tasks') {
        busy = true;
        renderTasks(main, idx, function () { busy = false; after(); });
      } else if (st.type === 'touhu') {
        busy = true;
        runTouhu(main, function () { busy = false; after(); });
      } else if (st.type === 'role') {
        // 角色专属支线：主线共享（碎片数一致），视角与私事因身份而异
        busy = true;
        var sub = (st.branches && st.branches[save.role]) || [];
        var j = 0;
        (function nextSub() {
          if (j >= sub.length) { busy = false; after(); return; }
          var s2 = sub[j]; j += 1;
          if (s2.type === 'card') {
            var cc = el('div', 'card');
            cc.appendChild(el('div', 'speaker', s2.speaker || ''));
            cc.appendChild(el('div', 'text', s2.text));
            main.appendChild(cc);
            main.scrollTop = main.scrollHeight;
            nextSub();
          } else if (s2.type === 'rhythm') {
            runRhythm(main, D[s2.cfg] || D.shangshu, { deco: s2.deco, decoName: s2.decoName }, nextSub);
          } else if (s2.type === 'shard') {
            showShard(main, s2.id, nextSub);
          } else if (s2.type === 'choice') {
            showChoice(main, s2, nextSub);
          } else {
            main.appendChild(el('div', 'narr', s2.text || ''));
            main.scrollTop = main.scrollHeight;
            nextSub();
          }
        })();
      } else {
        after();
      }
      main.scrollTop = main.scrollHeight;
    }
    function after() {
      save.step = i;
      // 先清掉上一个「继续」/「上宴」，保证任何时刻只有一个步骤尾按钮
      var olds = main.querySelectorAll('.step-tail');
      for (var q = 0; q < olds.length; q++) { olds[q].parentNode.removeChild(olds[q]); }
      main.scrollTop = main.scrollHeight;
      if (i < steps.length) {
        main.appendChild(btn('继续', 'ghost step-tail', function () {
          // 先摘掉按钮自身（连同一切 step-tail）：防双击/悬空期间二次触发
          var olds = main.querySelectorAll('.step-tail');
          for (var q = 0; q < olds.length; q++) {
            if (olds[q].parentNode) { olds[q].parentNode.removeChild(olds[q]); }
          }
          // 此刻尚存的选项盒必然已作答（作答才会走到 after/继续），锁定安全
          lockChoiceBoxes(main);
          next();
        }));
        main.scrollTop = main.scrollHeight;
      } else {
        finishAct(idx, main);
      }
    }
    next();
  }

  /* ---------- 差事帖（开局发布 + 每幕开始前重示；完成=朱笔勾销，依勾检/朱销文簿古制） ---------- */
  var CHN_NUM = ['一', '二', '三', '四', '五', '六'];
  function renderTasks(main, actIdx, done) {
    var t = D.tasks && D.tasks[save.role];
    var act = D.acts[actIdx];
    if (!t || !act) { done(); return; }
    // 幕前递话（首幕用完整自述，后续各幕用短递话）
    if (actIdx === 0) {
      var c0 = el('div', 'card');
      c0.appendChild(el('div', 'speaker', t.guide));
      c0.appendChild(el('div', 'text', t.intro));
      main.appendChild(c0);
    } else if (t.nudges && t.nudges[act.id]) {
      var cn = el('div', 'card');
      cn.appendChild(el('div', 'speaker', t.guide));
      cn.appendChild(el('div', 'text', t.nudges[act.id]));
      main.appendChild(cn);
    }
    var panel = el('div', 'panel tasks-panel');
    panel.appendChild(el('div', 'memo-head', '差事帖 · 显德五年九月廿四'));
    t.list.forEach(function (item, i) {
      var row = el('div', 'task-row');
      var doneNow = !!(save.taskDone && save.taskDone[D.acts[i] ? D.acts[i].id : i]);
      if (doneNow) {
        row.classList.add('done'); // 朱笔勾销
        row.appendChild(el('span', 'task-mark mark-gou', '勾'));
      } else {
        row.appendChild(el('span', 'task-mark', CHN_NUM[i] || String(i + 1)));
      }
      if (i === actIdx) { row.classList.add('current'); }
      row.appendChild(el('span', 'task-text', item));
      panel.appendChild(row);
    });
    panel.appendChild(el('div', 'memo-sub', t.tail));
    main.appendChild(panel);
    main.scrollTop = main.scrollHeight;
    done();
  }

  /* ---------- 碎片（内联：toast + 史料卡） ---------- */
  function showShard(main, id, done) {
    var sh = D.shards[id];
    if (!sh) { done(); return; }
    var first = !save.shards[id];
    if (first) {
      save.shards[id] = true;
      persist();
    }
    var toast = el('div', 'shard-toast');
    toast.appendChild(el('div', 'got', (first ? '拾得瓷片' : '瓷片在手') + ' · 共 ' + countShards() + '/16'));
    toast.appendChild(el('div', 'name', sh.name));
    main.appendChild(toast);
    var card = el('div', 'shiliao');
    var head = el('div', 'head', '史料卡');
    head.appendChild(el('span', 'prov', sh.prov));
    card.appendChild(head);
    card.appendChild(el('div', 'quote', sh.text));
    card.appendChild(el('div', 'source', '——' + sh.source));
    main.appendChild(card);
    done();
  }

  /* ---------- 选择（单选互斥：可改选，推进后锁定） ---------- */
  function showChoice(main, st, done) {
    var box = el('div', 'choice-box');
    box.setAttribute('role', 'radiogroup');
    box.appendChild(el('div', 'speaker', st.speaker || ''));
    box.appendChild(el('div', 'prompt', st.prompt || ''));
    var chosenBtn = null;
    var replyEl = null;
    var advanced = false;

    st.options.forEach(function (op) {
      var b = el('button', 'btn ghost opt', op.label);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.appendChild(el('span', 'desc', op.text));
      b.addEventListener('click', function () {
        // 锁定后（流程已推进）不再接受改选
        if (box.getAttribute('data-locked')) { return; }
        // 互斥：同一项重复点击不重复处理
        if (chosenBtn === b) { return; }
        // 撤销上一项：取消高亮、移除旧回复
        if (chosenBtn) {
          chosenBtn.classList.remove('selected');
          chosenBtn.setAttribute('aria-checked', 'false');
        }
        if (replyEl && replyEl.parentNode) { replyEl.parentNode.removeChild(replyEl); }
        // 选中新项
        chosenBtn = b;
        b.classList.add('selected');
        b.setAttribute('aria-checked', 'true');
        save.choices[st.key] = op.label;
        persist();
        // 一经选择立即锁定：不可改选（选中高亮保留，未选降透明禁点）
        box.setAttribute('data-locked', '1');
        replyEl = el('div', 'card');
        replyEl.appendChild(el('div', 'text', op.reply));
        // 回复固定插在本选项盒之后：改选换卡时不会被步骤尾按钮（继续）隔断
        if (box.parentNode) { box.parentNode.insertBefore(replyEl, box.nextSibling); }
        else { main.appendChild(replyEl); }
        main.scrollTop = main.scrollHeight;
        if (!advanced) {
          advanced = true;
          done(); // 仅首次选择推进流程；改选只换回复不重复推进
        }
      });
      box.appendChild(b);
    });
    main.appendChild(box);
    main.scrollTop = main.scrollHeight;
  }

  function lockChoiceBoxes(main) {
    var boxes = main.querySelectorAll('.choice-box');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].setAttribute('data-locked', '1');
    }
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
    main.appendChild(panel);

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
        main.scrollTop = main.scrollHeight;
        cb(hits);
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
    main.appendChild(panel);
    main.appendChild(btn('从回忆里回来', 'ghost step-tail', done));
    main.scrollTop = main.scrollHeight;
  }

  /* ---------- 玉津园 · 投壶（终幕） ---------- */
  function runTouhu(main, done) {
    var cfg = D.touhu;
    function card(speaker, text) {
      var c = el('div', 'card');
      c.appendChild(el('div', 'speaker', speaker || ''));
      c.appendChild(el('div', 'text', text));
      main.appendChild(c);
      main.scrollTop = main.scrollHeight;
    }
    // 群臣轮番（各自两矢，命中数运行时随机，一卡带过）
    cfg.ministers.forEach(function (mst) {
      var mh = (Math.random() < 0.75 ? 1 : 0) + (Math.random() < 0.55 ? 1 : 0); // 加权 0–2 矢
      card(mst.speaker, mst.line + cfg.minResult[mh]);
    });
    card('司正', '礼官请矢——两矢，中者为胜。');
    // 玩家两矢：落空也推进，计命中数
    runRhythm(main, {
      title: cfg.title,
      beats: cfg.beatNames,
      hint: cfg.hint,
      retry: cfg.retry,
      done: '两矢已毕。'
    }, { advanceOnMiss: true }, function (hits) {
      // 压轴：官家对投（两矢各五成命中，运行时随机——与玩家 hits 比较）
      card('官家', cfg.rongIntro);
      var rongHits = 0;
      for (var r = 0; r < 2; r++) {
        var rh = Math.random() < 0.5;
        if (rh) { rongHits += 1; }
        card('', cfg.rongThrow[rh ? 'hit' : 'miss'][r]);
      }
      var verdict = hits > rongHits ? cfg.verdictWin : (hits === rongHits ? cfg.verdictDraw : cfg.verdictLose);
      card('园中', verdict);
      awardDeco('jinzhi', '金矢', main); // 胜负零惩罚，参与即纪念
      main.appendChild(btn('献瓮', 'step-tail', done));
      main.scrollTop = main.scrollHeight;
    });
  }

  /* ---------- 终幕结算（合瓮长卷·简版） ---------- */
  function showEnding(main) {
    app.classList.add('ending-scene'); /* 暗场：突出青瓷纸槌瓶（clear(app) 时移除） */
    var E = D.ending;
    var wrap = el('div', 'ending');
    wrap.appendChild(el('div', 'ending-title', E.title));
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
    E.lines.forEach(function (t) { wrap.appendChild(el('div', 'memory-line', t)); });
    if (E.roleLine && save.role && E.roleLine[save.role]) {
      wrap.appendChild(el('div', 'memory-line', E.roleLine[save.role]));
    }
    var nMem = 0, k;
    for (k in save.memories) { if (save.memories[k]) { nMem += 1; } }
    var nDeco = 0;
    for (k in save.deco) { if (save.deco[k]) { nDeco += 1; } }
    var ans = save.choices && save.choices.yin_chongyi ? save.choices.yin_chongyi : '—';
    wrap.appendChild(el('div', 'memo-sub',
      '瓷片 ' + countShards() + '/16 · 回忆 ' + nMem + '/5 · 装饰 ' + nDeco + '/4 · 那日的答辞：「' + ans + '」'));
    wrap.appendChild(el('div', 'memo-sub', E.quote));
    wrap.appendChild(btn('翻阅手札', '', function () { showMemo(false); }));
    wrap.appendChild(btn('从头再来', 'ghost', function () {
      S.clearSave(function () { save = null; hasSave = false; showTitle(); });
    }));
    main.appendChild(wrap);
    main.scrollTop = main.scrollHeight;
  }

  function awardDeco(id, name, main) {
    if (!save.deco[id]) {
      save.deco[id] = true;
      persist();
      var t = el('div', 'shard-toast');
      t.appendChild(el('div', 'got', '长卷装饰件入手'));
      t.appendChild(el('div', 'name', name));
      main.appendChild(t);
    }
  }

  /* ---------- 幕毕 ---------- */
  function finishAct(idx, main) {
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
    main.appendChild(btn('翻阅手札', '', function () { showMemo(false); }));
    main.scrollTop = main.scrollHeight;
  }

  /* ---------- 手札（存档中心 + 瓷片图鉴） ---------- */
  function showMemo(fromTopbar, notice) {
    clear(app);
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
      var label = got && D.shards[key] ? D.shards[key].name : String(id);
      var cell = el('div', 'memo-cell' + (got ? ' got' : ''), label);
      if (got && D.shards[key]) {
        cell.setAttribute('role', 'button');
        (function (k) {
          cell.addEventListener('click', function () { showDetail(k); });
        })(key);
      }
      grid.appendChild(cell);
    }
    main.appendChild(grid);
    detail.appendChild(el('div', 'head', '瓷片图鉴'));
    detail.appendChild(el('div', 'quote', '点上方已拾得的瓷片，可随时重读记下的内容。'));
    main.appendChild(detail);

    var count = save ? countShards() : 0;
    var cur = save ? D.acts[save.actIndex] : null;
    // 继续值守仅在当前幕真正可玩（已解锁且有内容）时提供，避免死端
    var canContinue = !!(cur && cur.unlocked && cur.steps.length > 0);
    main.appendChild(el('div', 'memo-sub', '瓷片 ' + count + '/16 · ' +
      (cur ? '当前：' + cur.name + (canContinue ? '' : '（尚未开启）') : '尚未入宫')));

    if (save && save.role) {
      if (canContinue) {
        main.appendChild(btn('继续值守', '', function () { enterAct(save.actIndex); }));
      } else {
        main.appendChild(el('div', 'memo-sub', '下一时辰尚未开启——今日当值至此，先歇歇。已有的瓷片随时可翻看。'));
      }
      main.appendChild(btn(D.memoCopy.saveNow, 'ghost', function () {
        persist();
        showMemo(false, D.memoCopy.saved);
      }));
      main.appendChild(btn(D.memoCopy.restart, 'ghost', function () {
        S.clearSave(function () { save = null; hasSave = false; showTitle(); });
      }));
    } else {
      main.appendChild(btn('入宫当值', '', function () { showRole(); }));
    }
    main.appendChild(el('div', 'memo-sub',
      '存档说明：进度自动记录于本机（每逢时辰礼毕与关键处）；手札「现在就记」可随时手动补记。'));
    app.appendChild(main);
  }

  /* ---------- 启动：先读档再决定首屏 ---------- */
  S.loadGame(function (obj) {
    if (obj && obj.v === 1 && obj.role) {
      save = obj; hasSave = true;
      if (!save.choices) { save.choices = {}; }
      if (!save.deco) { save.deco = {}; }
      if (!save.memories) { save.memories = {}; }
      if (!save.taskDone) { save.taskDone = {}; }
    }
    showTitle();
  });
})(window);
