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
  function clear(node) { while (node.firstChild) { node.removeChild(node.firstChild); } }
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
    runSteps(act, idx, main, fromStep || 0);
  }

  function runSteps(act, idx, main, fromStep) {
    var i = fromStep;
    var busy = false;

    function next() {
      if (busy) { return; }
      if (i >= act.steps.length) { finishAct(idx, main); return; }
      var st = act.steps[i];
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
        runShangshu(main, function () { busy = false; after(); });
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
      if (i < act.steps.length) {
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

  /* ---------- 执觞上寿（四拍节奏，失败零惩罚） ---------- */
  function runShangshu(main, done) {
    var cfg = D.shangshu;
    var panel = el('div', 'panel');
    panel.appendChild(el('div', 'memo-head', '习礼 · 执觞上寿'));
    panel.appendChild(el('div', 'memo-sub', cfg.hint));
    var label = el('div', 'beat-label', cfg.beats[0]);
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

    var beat = 0, pos = 0, dir = 1, zoneL = 30, zoneR = 55, raf = 0, over = false;
    function placeZone() {
      zoneL = 20 + Math.random() * 56;
      zoneR = zoneL + 24; // 命中区 24% 宽，宽容判定
      zone.style.left = zoneL + '%';
      zone.style.width = (zoneR - zoneL) + '%';
    }
    function loop() {
      // 面板已被移除（中途开手札等）即停表，防幽灵循环
      if (over || !panel.isConnected) { over = true; return; }
      pos += dir * 0.55; // 慢速：整程约 3 秒，命中窗口约 0.9 秒
      if (pos > 100) { pos = 100; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      cursor.style.left = pos + '%';
      raf = requestAnimationFrame(loop);
    }
    function tap() {
      if (over) { return; }
      if (pos >= zoneL && pos <= zoneR) {
        beat += 1;
        if (beat >= cfg.beats.length) {
          over = true;
          cancelAnimationFrame(raf);
          label.textContent = cfg.done;
          tip.textContent = '';
          awardDeco('jinzang', '金觞', main);
          main.appendChild(btn('上宴', 'step-tail', function () { done(); }));
          main.scrollTop = main.scrollHeight;
          return;
        }
        label.textContent = cfg.beats[beat];
        placeZone();
        tip.textContent = '好。下一拍。';
      } else {
        tip.textContent = cfg.retry;
      }
    }
    // 整块面板可点（含拍名与说明区），手机上更好按
    panel.addEventListener('click', tap);
    placeZone();
    raf = requestAnimationFrame(loop);
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
    persist();
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
    }
    showTitle();
  });
})(window);
