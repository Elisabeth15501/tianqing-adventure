/* 天清往事 · 应用骨架（M1 起步版）
 * Chrome 61 基线：ES2017、无 inline script、无 onclick 属性、无 fetch、全 addEventListener。
 * 场景：title → role → act → memo；幕毕自动存档；手札页可手动存档/清档。
 */
(function (global) {
  'use strict';

  var D = global.TQ_DATA;
  var S = global.TQStorage;
  var app = document.getElementById('app');
  var save = null;      // 当前存档对象
  var hasSave = false;  // 启动时是否有旧档

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
    for (var i = 0; i < D.roles.length; i++) {
      (function (role) {
        var b = btn(role.name, 'ghost role-item', function () { startNew(role.id); });
        b.appendChild(el('span', 'desc', role.desc));
        main.appendChild(b);
      })(D.roles[i]);
    }
    app.appendChild(main);
  }

  function startNew(roleId) {
    save = S.newSave(roleId);
    save.updated = Date.now();
    S.saveGame(save, function () { enterAct(0); });
  }

  /* ---------- 幕流程 ---------- */
  function enterAct(idx) {
    var act = D.acts[idx];
    if (!act || !act.unlocked || !act.steps.length) { showMemo(false, '此后时辰尚未开启。'); return; }
    clear(app);
    app.appendChild(topbar(act.name));
    var main = el('div', 'main');
    var i = 0;

    function next() {
      if (i < act.steps.length) {
        var st = act.steps[i]; i += 1;
        if (st.type === 'narr') {
          main.appendChild(el('div', 'narr', st.text));
        } else {
          var c = el('div', 'card');
          c.appendChild(el('div', 'speaker', st.speaker || ''));
          c.appendChild(el('div', 'text', st.text));
          main.appendChild(c);
        }
        main.scrollTop = main.scrollHeight;
        if (i < act.steps.length) {
          main.appendChild(btn('继续', 'ghost', function () { next(); }));
        } else {
          finishAct(idx);
        }
      }
    }
    app.appendChild(main);
    next();
  }

  function finishAct(idx) {
    var act = D.acts[idx];
    var main = app.querySelector('.main');
    // 幕毕 → 碎片
    if (act.shardAfter && D.shards[act.shardAfter] && !save.shards[act.shardAfter]) {
      var sh = D.shards[act.shardAfter];
      save.shards[act.shardAfter] = true;
      var toast = el('div', 'shard-toast');
      toast.appendChild(el('div', 'got', '拾得瓷片 · 共 ' + countShards() + '/16'));
      toast.appendChild(el('div', 'name', sh.name));
      main.appendChild(toast);
      var card = el('div', 'shiliao');
      var head = el('div', 'head', '史料卡');
      head.appendChild(el('span', 'prov', sh.prov));
      card.appendChild(head);
      card.appendChild(el('div', 'quote', sh.text));
      card.appendChild(el('div', 'source', '——' + sh.source));
      main.appendChild(card);
    }
    save.actIndex = Math.min(idx + 1, D.acts.length - 1);
    save.step = 0;
    save.updated = Date.now();
    // 幕毕自动存档（存档点规则之一）
    S.saveGame(save, function (ok, via) {
      var note = el('div', 'memo-sub', act.name + '礼毕，手札已记下进度。');
      main.appendChild(note);
      main.appendChild(btn('翻阅手札', '', function () { showMemo(false); }));
    });
  }

  function countShards() {
    var n = 0; var k;
    for (k in save.shards) { if (save.shards[k]) { n += 1; } }
    return n;
  }

  /* ---------- 手札（存档中心） ---------- */
  function showMemo(fromTopbar, notice) {
    clear(app);
    app.appendChild(topbar(D.memoCopy.title));
    var main = el('div', 'main');
    main.appendChild(el('div', 'memo-head', D.memoCopy.title));
    main.appendChild(el('div', 'memo-sub', notice || D.memoCopy.sub));

    // 碎片拼图总览
    var grid = el('div', 'memo-grid');
    for (var id = 1; id <= 16; id++) {
      var key = String(id);
      var got = save && save.shards && save.shards[key];
      var label = got && D.shards[key] ? D.shards[key].name : String(id);
      grid.appendChild(el('div', 'memo-cell' + (got ? ' got' : ''), label));
    }
    main.appendChild(grid);
    var count = save ? countShards() : 0;
    main.appendChild(el('div', 'memo-sub', '瓷片 ' + count + '/16 · ' +
      (save ? (D.acts[save.actIndex] ? '当前：' + D.acts[save.actIndex].name : '') : '尚未入宫')));

    if (save && save.role) {
      main.appendChild(btn('继续值守', '', function () { enterAct(save.actIndex); }));
      main.appendChild(btn(D.memoCopy.saveNow, 'ghost', function () {
        save.updated = Date.now();
        S.saveGame(save, function () { showMemo(false, D.memoCopy.saved); });
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
    }
    showTitle();
  });
})(window);
